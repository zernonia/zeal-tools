import type { PeerInfo } from './pairing'
import { describe, expect, it } from 'vitest'
import { applyPresence, MAX_ALIAS, MAX_NAME, networkKey, parseClientMessage, parseServerMessage } from './pairing'

const HELLO = JSON.stringify({ t: 'hello', alias: 'Calm Marten', kind: 'phone' })

describe('parseClientMessage', () => {
  it('reads a well-formed announcement', () => {
    expect(parseClientMessage(HELLO)).toEqual({ t: 'hello', alias: 'Calm Marten', kind: 'phone' })
  })

  it('reads a directed reply and a signal', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'hi', to: 'abc', alias: 'Bold Lynx', kind: 'computer' })))
      .toEqual({ t: 'hi', to: 'abc', alias: 'Bold Lynx', kind: 'computer' })
    expect(parseClientMessage(JSON.stringify({ t: 'signal', to: 'abc', sdp: 'v=0', kind: 'offer' })))
      .toEqual({ t: 'signal', to: 'abc', sdp: 'v=0', kind: 'offer' })
  })

  it('drops anything malformed rather than throwing', () => {
    // This reads straight off the open internet.
    for (const bad of ['', 'null', '[]', 'not json', '{"t":"nope"}', '{}'])
      expect(parseClientMessage(bad)).toBeNull()
  })

  it('refuses a device kind it does not recognise', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'hello', alias: 'A', kind: 'toaster' }))).toBeNull()
  })

  it('refuses a signal that is not an offer or an answer', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'signal', to: 'a', sdp: 'v=0', kind: 'pranswer' }))).toBeNull()
    expect(parseClientMessage(JSON.stringify({ t: 'signal', to: 'a', sdp: '', kind: 'offer' }))).toBeNull()
  })

  it('refuses a message with no destination', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'signal', sdp: 'v=0', kind: 'offer' }))).toBeNull()
    expect(parseClientMessage(JSON.stringify({ t: 'hi', alias: 'A', kind: 'phone' }))).toBeNull()
  })

  it('strips control characters out of an alias', () => {
    // An alias is printed verbatim on a stranger's screen; a newline in it
    // could forge a second line of interface.
    const sneaky = JSON.stringify({ t: 'hello', alias: 'AAA' + '\u0000\n\u007F' + 'BBB', kind: 'phone' })
    expect(parseClientMessage(sneaky)).toEqual({ t: 'hello', alias: 'AAABBB', kind: 'phone' })
  })

  it('refuses an alias long enough to break a layout', () => {
    const long = JSON.stringify({ t: 'hello', alias: 'x'.repeat(MAX_ALIAS + 1), kind: 'phone' })
    expect(parseClientMessage(long)).toBeNull()
    const ok = JSON.stringify({ t: 'hello', alias: 'x'.repeat(MAX_ALIAS), kind: 'phone' })
    expect(parseClientMessage(ok)).not.toBeNull()
  })

  it('refuses an alias that is only whitespace', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'hello', alias: '   ', kind: 'phone' }))).toBeNull()
  })
})

describe('parseServerMessage', () => {
  it('reads each kind the switchboard sends', () => {
    expect(parseServerMessage(JSON.stringify({ t: 'welcome', id: 'me' }))).toEqual({ t: 'welcome', id: 'me' })
    expect(parseServerMessage(JSON.stringify({ t: 'bye', from: 'them' }))).toEqual({ t: 'bye', from: 'them' })
    expect(parseServerMessage(JSON.stringify({ t: 'hello', from: 'x', alias: 'A', kind: 'phone' })))
      .toEqual({ t: 'hello', from: 'x', alias: 'A', kind: 'phone' })
  })

  it('drops frames that claim to be from nobody', () => {
    expect(parseServerMessage(JSON.stringify({ t: 'bye' }))).toBeNull()
    expect(parseServerMessage(JSON.stringify({ t: 'signal', sdp: 'v=0', kind: 'offer' }))).toBeNull()
  })

  it('drops anything unrecognised', () => {
    for (const bad of ['', '{}', '{"t":42}', '{"t":"evil"}'])
      expect(parseServerMessage(bad)).toBeNull()
  })
})

describe('applyPresence', () => {
  const marten: PeerInfo = { id: '2', alias: 'Calm Marten', kind: 'phone' }

  it('adds a device that announces itself', () => {
    const out = applyPresence([], { t: 'hello', from: '2', alias: 'Calm Marten', kind: 'phone' })
    expect(out).toEqual([marten])
  })

  it('replaces rather than duplicating when one announces twice', () => {
    // A reconnect re-announces; the list must not grow a second copy.
    const once = applyPresence([], { t: 'hello', from: '2', alias: 'Calm Marten', kind: 'phone' })
    const twice = applyPresence(once, { t: 'hello', from: '2', alias: 'Calm Marten', kind: 'computer' })
    expect(twice).toHaveLength(1)
    expect(twice[0]!.kind).toBe('computer')
  })

  it('removes a device that leaves', () => {
    expect(applyPresence([marten], { t: 'bye', from: '2' })).toEqual([])
  })

  it('ignores a departure it has never heard of', () => {
    expect(applyPresence([marten], { t: 'bye', from: 'ghost' })).toEqual([marten])
  })

  it('keeps a stable order so devices do not jump about', () => {
    let peers: PeerInfo[] = []
    for (const [id, alias] of [['3', 'Zesty Ibex'], ['1', 'Amber Finch'], ['2', 'Calm Marten']])
      peers = applyPresence(peers, { t: 'hello', from: id!, alias: alias!, kind: 'phone' })
    expect(peers.map(p => p.alias)).toEqual(['Amber Finch', 'Calm Marten', 'Zesty Ibex'])
  })

  it('does not mutate the list it was given', () => {
    const before: PeerInfo[] = [marten]
    applyPresence(before, { t: 'hello', from: '9', alias: 'New One', kind: 'phone' })
    expect(before).toEqual([marten])
  })

  it('leaves the list alone for messages that are not about presence', () => {
    expect(applyPresence([marten], { t: 'welcome', id: 'me' })).toEqual([marten])
    expect(applyPresence([marten], { t: 'signal', from: '2', sdp: 'v=0', kind: 'offer' })).toEqual([marten])
  })
})

describe('consent messages', () => {
  it('carries a request to send, with what is being offered', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'ask', to: 'b', name: 'holiday.zip', size: 1234 })))
      .toEqual({ t: 'ask', to: 'b', name: 'holiday.zip', size: 1234 })
  })

  it('carries the answer either way', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'accept', to: 'b' }))).toEqual({ t: 'accept', to: 'b' })
    expect(parseClientMessage(JSON.stringify({ t: 'decline', to: 'b' }))).toEqual({ t: 'decline', to: 'b' })
  })

  it('strips control characters out of a filename', () => {
    // This is the most attacker-controlled string in the tool: it is shown on
    // screen before the reader has agreed to anything.
    const sneaky = JSON.stringify({ t: 'ask', to: 'b', name: 'a' + '\u0000\n' + 'b.zip', size: 1 })
    expect(parseClientMessage(sneaky)).toMatchObject({ name: 'ab.zip' })
  })

  it('strips path separators, which only invite a false belief', () => {
    const nasty = JSON.stringify({ t: 'ask', to: 'b', name: '../../etc/passwd', size: 1 })
    expect(parseClientMessage(nasty)).toMatchObject({ name: '....etcpasswd' })
  })

  it('refuses a filename long enough to bury the buttons', () => {
    const long = JSON.stringify({ t: 'ask', to: 'b', name: 'x'.repeat(MAX_NAME + 1), size: 1 })
    expect(parseClientMessage(long)).toBeNull()
  })

  it('refuses a size that is not a real number of bytes', () => {
    for (const size of [-1, Number.NaN, Infinity, '10', null]) {
      expect(parseClientMessage(JSON.stringify({ t: 'ask', to: 'b', name: 'a.zip', size })))
        .toBeNull()
    }
  })

  it('allows an empty file, which is a legitimate thing to send', () => {
    expect(parseClientMessage(JSON.stringify({ t: 'ask', to: 'b', name: 'empty.txt', size: 0 })))
      .toMatchObject({ size: 0 })
  })

  it('reads the same messages coming back from the switchboard', () => {
    expect(parseServerMessage(JSON.stringify({ t: 'ask', from: 'a', name: 'x.zip', size: 5 })))
      .toEqual({ t: 'ask', from: 'a', name: 'x.zip', size: 5 })
    expect(parseServerMessage(JSON.stringify({ t: 'decline', from: 'a' }))).toEqual({ t: 'decline', from: 'a' })
  })

  it('leaves the device list alone — consent is not presence', () => {
    const peers = [{ id: 'a', alias: 'Calm Marten', kind: 'phone' as const }]
    expect(applyPresence(peers, { t: 'ask', from: 'a', name: 'x.zip', size: 5 })).toEqual(peers)
    expect(applyPresence(peers, { t: 'accept', from: 'a' })).toEqual(peers)
  })

  it('still bounds the alias it already bounded', () => {
    expect(MAX_ALIAS).toBeLessThan(MAX_NAME)
  })
})

describe('networkKey', () => {
  it('keeps an IPv4 address whole, because NAT shares it', () => {
    expect(networkKey('203.0.113.5')).toBe('203.0.113.5')
    expect(networkKey('192.168.1.1')).toBe('192.168.1.1')
  })

  it('unwraps an IPv4 address wearing an IPv6 coat', () => {
    expect(networkKey('::ffff:203.0.113.5')).toBe('203.0.113.5')
  })

  it('puts two devices on one LAN in the same room', () => {
    // The bug this exists for: IPv6 has no NAT, so each device has its own
    // globally routable address and full-address hashing isolated every one.
    const laptop = networkKey('2001:db8:85a3:8d3:1319:8a2e:370:7348')
    const phone = networkKey('2001:db8:85a3:8d3:aaaa:bbbb:cccc:dddd')
    expect(laptop).toBe(phone)
  })

  it('still separates genuinely different networks', () => {
    expect(networkKey('2001:db8:85a3:8d3::1')).not.toBe(networkKey('2001:db8:85a3:99ff::1'))
    expect(networkKey('203.0.113.5')).not.toBe(networkKey('203.0.113.6'))
  })

  it('survives a rotating interface identifier', () => {
    // Privacy extensions change the half we throw away, so a device does not
    // silently leave the room every few hours.
    const before = networkKey('2001:db8:85a3:8d3:1111:1111:1111:1111')
    const after = networkKey('2001:db8:85a3:8d3:9999:9999:9999:9999')
    expect(before).toBe(after)
  })

  it('handles every way an address can be written', () => {
    expect(networkKey('2001:db8:85a3:8d3::')).toBe(networkKey('2001:0db8:85a3:08d3:0:0:0:0'))
    expect(networkKey('2001:DB8:85A3:8D3::1')).toBe(networkKey('2001:db8:85a3:8d3::1'))
    expect(networkKey('  2001:db8:85a3:8d3::1  ')).toBe(networkKey('2001:db8:85a3:8d3::1'))
  })

  it('does not fall over on a short or odd address', () => {
    for (const ip of ['::1', 'fe80::1', '::', '2001:db8::'])
      expect(typeof networkKey(ip)).toBe('string')
    expect(networkKey('::1')).toBe(networkKey('::2'))
  })
})
