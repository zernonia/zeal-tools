import { describe, expect, it } from 'vitest'
import { parseEvent, parseIcsDate, toIcs } from './calendar'
import { parseMecard, parseVcard, toVcard } from './contact'
import { readFields, splitUnescaped, unescapeValue } from './fields'
import { parseEmail, parseGeo, parsePhone, parseSms } from './messages'
import { parseWifi, securityLabel } from './wifi'

describe('escaped fields', () => {
  it('splits only on unescaped separators', () => {
    expect(splitUnescaped('a;b\\;c;d', ';')).toEqual(['a', 'b\\;c', 'd'])
    expect(splitUnescaped('a\\\\;b', ';')).toEqual(['a\\\\', 'b'])
  })

  it('unescapes every backslash pair', () => {
    expect(unescapeValue('pa\\;ss\\:wo\\,rd\\"\\\\')).toBe('pa;ss:wo,rd"\\')
    // A trailing lone backslash is kept rather than dropped.
    expect(unescapeValue('end\\')).toBe('end\\')
  })

  it('reads key/value fields and skips junk', () => {
    expect(readFields('S:a;nonsense;P:b\\:c;;')).toEqual([
      { key: 'S', value: 'a' },
      { key: 'P', value: 'b:c' },
    ])
  })
})

describe('parseWifi', () => {
  it('reads a standard WPA code in any field order', () => {
    expect(parseWifi('WIFI:S:Cafe Guest;T:WPA;P:latte123;;')).toMatchObject({
      ssid: 'Cafe Guest',
      password: 'latte123',
      security: 'WPA',
      open: false,
      hidden: false,
    })
  })

  it('handles escaped delimiters in the SSID and password', () => {
    const wifi = parseWifi('WIFI:T:WPA;S:My\\;Net\\:work;P:p\\;a\\,s\\\\s\\";H:true;;')!
    expect(wifi.ssid).toBe('My;Net:work')
    expect(wifi.password).toBe('p;a,s\\s"')
    expect(wifi.hidden).toBe(true)
  })

  it('drops a matched pair of quotes', () => {
    expect(parseWifi('WIFI:T:WPA;S:"123456";P:"secret";;')).toMatchObject({ ssid: '123456', password: 'secret' })
  })

  it('treats nopass and a missing T without a password as open', () => {
    expect(parseWifi('WIFI:T:nopass;S:Library;;')!.open).toBe(true)
    expect(parseWifi('WIFI:S:Library;;')!.open).toBe(true)
    // Missing T but a password present: trust the password.
    expect(parseWifi('WIFI:S:Home;P:abc;;')).toMatchObject({ open: false, security: 'WPA' })
  })

  it('labels security types honestly', () => {
    expect(securityLabel(parseWifi('WIFI:T:WEP;S:x;P:y;;')!)).toMatch(/easily broken/)
    expect(securityLabel(parseWifi('WIFI:T:nopass;S:x;;')!)).toMatch(/no password/)
  })

  it('reads enterprise identity fields', () => {
    expect(parseWifi('WIFI:T:WPA2-EAP;S:Corp;E:PEAP;I:jane;P:pw;;')).toMatchObject({ security: 'WPA2-EAP', eapMethod: 'PEAP', identity: 'jane' })
  })

  it('rejects malformed codes', () => {
    expect(parseWifi('WIFI:T:WPA;P:secret;;')).toBeNull()
    expect(parseWifi('WIFI:')).toBeNull()
    expect(parseWifi('wifi is great')).toBeNull()
  })
})

describe('contacts', () => {
  it('reads a MECARD, swapping Last,First', () => {
    const c = parseMecard('MECARD:N:Doe,Jane;TEL:+441234567890;TEL:+447700900123;EMAIL:jane@example.com;URL:https://example.com;ADR:1 High St\\, London;;')!
    expect(c.name).toBe('Jane Doe')
    expect(c.phones).toEqual(['+441234567890', '+447700900123'])
    expect(c.emails).toEqual(['jane@example.com'])
    expect(c.address).toBe('1 High St, London')
  })

  it('reads a folded vCard with groups and parameters', () => {
    const raw = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Doe;Jane;;Dr;',
      'FN:Dr Jane Doe',
      'ORG:Example Ltd;Research',
      'item1.TEL;TYPE=CELL:+44 7700 900123',
      'EMAIL;TYPE=INTERNET:jane@example.com',
      'ADR;TYPE=WORK:;;1 High St;London;;SW1A 1AA;UK',
      'NOTE:Line one\\nline two\\, with comma and a very long note that is',
      '  folded onto the next line',
      'END:VCARD',
    ].join('\r\n')
    const c = parseVcard(raw)!
    expect(c.name).toBe('Dr Jane Doe')
    expect(c.organisation).toBe('Example Ltd, Research')
    expect(c.phones).toEqual(['+44 7700 900123'])
    expect(c.address).toBe('1 High St, London, SW1A 1AA, UK')
    expect(c.note).toBe('Line one\nline two, with comma and a very long note that is folded onto the next line')
  })

  it('builds the name from N when FN is missing', () => {
    expect(parseVcard('BEGIN:VCARD\nVERSION:4.0\nN:Doe;Jane;;;\nEND:VCARD')!.name).toBe('Jane Doe')
  })

  it('rejects empty cards', () => {
    expect(parseMecard('MECARD:;;')).toBeNull()
    expect(parseVcard('BEGIN:VCARD\nVERSION:3.0\nEND:VCARD')).toBeNull()
  })

  it('writes a vCard for a MECARD with escaped values', () => {
    const vcf = toVcard(parseMecard('MECARD:N:Doe,Jane;TEL:+441234;NOTE:a\\;b;;')!)
    expect(vcf).toContain('BEGIN:VCARD\r\nVERSION:3.0\r\nN:Doe;Jane;;;\r\nFN:Jane Doe\r\n')
    expect(vcf).toContain('TEL:+441234\r\n')
    expect(vcf).toContain('NOTE:a\\;b\r\n')
    expect(vcf.endsWith('END:VCARD\r\n')).toBe(true)
  })

  it('passes an original vCard through with CRLF line endings', () => {
    const raw = 'BEGIN:VCARD\nVERSION:3.0\nFN:Jane\nBDAY:1990-01-01\nEND:VCARD'
    expect(toVcard(parseVcard(raw)!, raw)).toBe('BEGIN:VCARD\r\nVERSION:3.0\r\nFN:Jane\r\nBDAY:1990-01-01\r\nEND:VCARD\r\n')
  })
})

describe('email', () => {
  it('reads mailto with recipients, subject and body', () => {
    const e = parseEmail('mailto:a@example.com,b@example.com?cc=c@example.com&subject=Hello%20there&body=Line%201%0ALine%202')!
    expect(e.to).toEqual(['a@example.com', 'b@example.com'])
    expect(e.cc).toEqual(['c@example.com'])
    expect(e.subject).toBe('Hello there')
    expect(e.body).toBe('Line 1\nLine 2')
    expect(e.href).toBe('mailto:a@example.com,b@example.com?cc=c%40example.com&subject=Hello%20there&body=Line%201%0ALine%202')
  })

  it('keeps a plus in an address', () => {
    expect(parseEmail('mailto:jane+qr@example.com')!.to).toEqual(['jane+qr@example.com'])
  })

  it('reads MATMSG and bare addresses', () => {
    expect(parseEmail('MATMSG:TO:hi@example.com;SUB:Order\\;1;BODY:Thanks;;')).toMatchObject({ to: ['hi@example.com'], subject: 'Order;1', body: 'Thanks' })
    expect(parseEmail('hi@example.com')!.href).toBe('mailto:hi@example.com')
  })

  it('rejects invalid addresses', () => {
    expect(parseEmail('mailto:')).toBeNull()
    expect(parseEmail('mailto:not-an-address')).toBeNull()
    expect(parseEmail('a@b')).toBeNull()
    expect(parseEmail(`${'a'.repeat(5000)}@${'b.'.repeat(2000)}.`)).toBeNull()
  })
})

describe('phone and sms', () => {
  it('reads tel: and strips formatting from the link', () => {
    expect(parsePhone('tel:+44 (20) 7946-0958')).toEqual({ number: '+44 (20) 7946-0958', href: 'tel:+442079460958' })
    expect(parsePhone('tel:+441234;ext=5')!.href).toBe('tel:+441234;ext=5')
  })

  it('rejects junk numbers', () => {
    expect(parsePhone('tel:')).toBeNull()
    expect(parsePhone('tel:call me')).toBeNull()
    expect(parsePhone('tel:javascript:alert(1)')).toBeNull()
    expect(parsePhone(`tel:1${'p'.repeat(5000)}!`)).toBeNull()
  })

  it('reads sms:, the iOS variant and SMSTO:', () => {
    expect(parseSms('sms:+447700900123?body=Hello%20there')).toMatchObject({ number: '+447700900123', body: 'Hello there' })
    expect(parseSms('sms:+447700900123;?&body=Hi')).toMatchObject({ number: '+447700900123', body: 'Hi' })
    expect(parseSms('SMSTO:+447700900123:Vote: yes')).toMatchObject({ number: '+447700900123', body: 'Vote: yes' })
    expect(parseSms('SMSTO:07700 900123')!.href).toBe('sms:07700900123')
  })

  it('encodes the body in the rebuilt link', () => {
    expect(parseSms('SMSTO:123:a&b=c')!.href).toBe('sms:123?body=a%26b%3Dc')
  })

  it('rejects an SMS with no usable number', () => {
    expect(parseSms('SMSTO::hello')).toBeNull()
    expect(parseSms('sms:hello')).toBeNull()
  })
})

describe('geo', () => {
  it('reads coordinates, altitude, uncertainty and a label', () => {
    expect(parseGeo('geo:51.5007,-0.1246')).toMatchObject({ latitude: 51.5007, longitude: -0.1246, query: '' })
    expect(parseGeo('geo:51.5,-0.12,30;u=10?q=Big%20Ben')).toMatchObject({ latitude: 51.5, longitude: -0.12, query: 'Big Ben' })
    expect(parseGeo('geo:1,2')!.mapUrl).toBe('https://www.openstreetmap.org/?mlat=1&mlon=2#map=16/1/2')
  })

  it('rejects impossible coordinates', () => {
    expect(parseGeo('geo:91,0')).toBeNull()
    expect(parseGeo('geo:0,181')).toBeNull()
    expect(parseGeo('geo:abc')).toBeNull()
  })
})

describe('calendar events', () => {
  const vevent = [
    'BEGIN:VEVENT',
    'SUMMARY:Team lunch\\, upstairs',
    'DTSTART:20261204T123000Z',
    'DTEND:20261204T133000Z',
    'LOCATION:Canteen',
    'DESCRIPTION:Bring a',
    '  plate',
    'END:VEVENT',
  ].join('\n')

  it('reads a bare VEVENT', () => {
    const e = parseEvent(vevent)!
    expect(e.summary).toBe('Team lunch, upstairs')
    expect(e.start).toEqual({ iso: '2026-12-04T12:30:00Z', allDay: false, utc: true, tzid: '' })
    expect(e.location).toBe('Canteen')
    expect(e.description).toBe('Bring a plate')
  })

  it('reads one wrapped in VCALENDAR, with a TZID and an all-day date', () => {
    const e = parseEvent('BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:Fair\nDTSTART;TZID=Europe/London:20261205T090000\nEND:VEVENT\nEND:VCALENDAR')!
    expect(e.start).toEqual({ iso: '2026-12-05T09:00:00', allDay: false, utc: false, tzid: 'Europe/London' })
    expect(parseIcsDate('20261225')).toEqual({ iso: '2026-12-25', allDay: true, utc: false, tzid: '' })
  })

  it('rejects malformed dates and empty events', () => {
    expect(parseIcsDate('2026-12-25')).toBeNull()
    expect(parseIcsDate('20261325')).toBeNull()
    expect(parseIcsDate('20261201T250000')).toBeNull()
    expect(parseEvent('BEGIN:VEVENT\nEND:VEVENT')).toBeNull()
    expect(parseEvent('BEGIN:VEVENT\nSUMMARY:no end')).toBeNull()
  })

  it('wraps a bare VEVENT into a valid .ics, adding UID and DTSTAMP', () => {
    const ics = toIcs(vevent, new Date('2026-11-20T10:00:00Z'))
    const lines = ics.split('\r\n')
    expect(lines.slice(0, 5)).toEqual([
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//zeal.tools//QR Code Scanner//EN',
      'BEGIN:VEVENT',
      expect.stringMatching(/^UID:[0-9a-f]{8}@zeal\.tools$/),
    ])
    expect(lines).toContain('DTSTAMP:20261120T100000Z')
    expect(lines).toContain('DESCRIPTION:Bring a plate')
    expect(ics.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n')).toBe(true)
    // Stable: the same event always gets the same UID.
    expect(toIcs(vevent).split('\r\n')[4]).toBe(lines[4])
  })

  it('keeps an existing UID', () => {
    const ics = toIcs('BEGIN:VEVENT\nUID:abc@x\nDTSTAMP:20260101T000000Z\nSUMMARY:x\nEND:VEVENT')
    expect(ics.match(/UID:/g)).toHaveLength(1)
    expect(ics.match(/DTSTAMP:/g)).toHaveLength(1)
  })
})
