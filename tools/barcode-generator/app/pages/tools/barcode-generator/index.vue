<script setup lang="ts">
import meta from '../../../../meta'

const { public: { siteUrl } } = useRuntimeConfig()

useSeoMeta({
  title: 'Free Barcode Generator — EAN, UPC, Code 128, Code 39',
  description: meta.description,
  ogTitle: 'Free Barcode Generator — EAN, UPC, Code 128, Code 39, ITF-14',
  ogDescription: meta.tagline,
  ogUrl: `${siteUrl}/tools/${meta.slug}`,
  twitterCard: 'summary_large_image',
})

defineOgImage('Default', {
  title: 'Free Barcode Generator',
  description: meta.tagline,
})

const howToSteps = [
  {
    title: 'Pick the barcode type',
    body: 'EAN-13 or UPC-A for a retail product, ITF-14 for the carton it ships in, Code 128 for anything internal. The note under the menu says what each one is for.',
  },
  {
    title: 'Type the number or text',
    body: 'The preview redraws as you type. For EAN, UPC and ITF-14, leave the check digit off and it is calculated for you; type it and it is checked, with the right digit shown if yours is wrong.',
  },
  {
    title: 'Set the size for where it will be printed',
    body: 'Bar width and PNG scale together decide the printed size. The line under the scale tells you the size at 300 dpi and, for retail codes, whether that falls inside the range GS1 allows.',
  },
  {
    title: 'Download and test-scan',
    body: 'SVG for print and design software — it stays sharp at any size. PNG for documents and label printers. Scan the printed result with the scanner that will actually read it before printing thousands.',
  },
]

useToolJsonLd(meta, {
  description: meta.description,
  featureList: [
    'EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39 and ITF-14',
    'Check digits calculated when missing and verified when typed',
    'Code 128 with the fewest symbols, switching code sets automatically',
    'Quiet zones per specification, guard bars and digits placed as on retail labels',
    'SVG and PNG downloads, print size shown at 300 dpi',
    'Free REST API and MCP tool',
  ],
  howTo: { name: 'How to make a barcode', steps: howToSteps.map(s => ({ name: s.title, text: s.body })) },
})

const faq = [
  { q: 'Can I use a barcode from here on a product I sell in shops?', a: 'Only if the number is yours to use. The barcode is just a drawing of a number; what makes an EAN or UPC valid at a checkout is that the number starts with a GS1 company prefix licensed to your business, so the retailer\'s system can tell your product from everyone else\'s. We generate a perfectly correct barcode for any number you type, but we cannot give you a number — that comes from GS1 in your country. Made-up numbers and numbers bought cheaply from resellers are often rejected by large retailers and marketplaces.' },
  { q: 'What is a check digit, and do I need to type it?', a: 'It is the last digit of an EAN, UPC or ITF-14, calculated from the others so a scanner can catch a misread. You do not need to type it: enter 12 digits for an EAN-13 and the thirteenth is worked out for you. If you do type it, it is verified, and if it is wrong you are told the correct one. A wrong check digit is never quietly replaced, because it usually means a typo earlier in the number.' },
  { q: 'Which barcode should I use for my own stock, assets or orders?', a: 'Code 128. It encodes any plain ASCII text — letters in both cases, digits and punctuation — and it is the most compact general-purpose linear barcode, so it stays readable on small labels. Every handheld and phone scanner reads it. You do not need anyone\'s permission or prefix to use it inside your own business.' },
  { q: 'Why is my Code 128 barcode shorter than the same text elsewhere?', a: 'Code 128 has three code sets, and set C packs two digits into one symbol. Many generators switch between them with a rule of thumb; this one searches for the sequence with the fewest symbols, so long digit runs are packed, an odd digit is placed where it costs least, and a single control character is borrowed with SHIFT rather than switching sets twice. Fewer symbols means a narrower barcode at the same bar width.' },
  { q: 'When should I still use Code 39?', a: 'When the system reading it was built for Code 39 — older warehouse and library systems, some ID badges, and industries such as automotive and defence that specified it decades ago. It only holds capitals, digits, space and - . $ / + %, and it is roughly half again as wide as Code 128 for the same data. For anything new, Code 128 is the better choice.' },
  { q: 'Should I add the Code 39 check character?', a: 'Only if the system reading it expects one. The mod-43 check character is optional in Code 39, and a scanner set up without it will read it as part of your data — an extra character at the end. If you are not sure, leave it off and test-scan.' },
  { q: 'What is the quiet zone and why is it so wide?', a: 'It is the blank margin either side of the bars, and the scanner uses it to find where the barcode starts and ends. EAN-13 needs 11 modules on the left and 7 on the right; Code 128, Code 39 and ITF-14 need ten times the narrowest bar each side. Every download includes it. Printing text, a border or artwork into that margin is the most common reason a printed barcode will not scan.' },
  { q: 'What size should I print it?', a: 'For EAN and UPC, the nominal size has 0.33 mm bar modules, making an EAN-13 about 37 mm wide including its margins, and GS1 allows 80% to 200% of that. The tool shows the module size and percentage at 300 dpi as you change the settings. Keep the bars tall too: shortening them ("truncating") stops checkout scanners reading at an angle. ITF-14 on cartons is normally printed much larger, with modules of 0.5 to 1 mm.' },
  { q: 'Can I make it in colour?', a: 'Carefully. Most scanners shine red light and see colours roughly by their red channel, so red, orange and yellow bars all but disappear, while dark blue, dark green and black read well. Always put dark bars on a light background — inverted barcodes fail on many scanners. The tool warns when a colour pair is likely to fail.' },
  { q: 'Is my data sent anywhere?', a: 'Not from this page. The barcode is drawn in your browser by our own encoder, and nothing you type is uploaded — you can load the page and go offline. The optional API does receive what you send it, because that is how an API works, and it does not store it.' },
  { q: 'Do you support QR codes, GS1-128, DataMatrix or EAN add-ons?', a: 'QR codes have their own generator on this site. GS1-128 (Code 128 with FNC1 and application identifiers, used on shipping labels), DataMatrix, PDF417 and the 2- and 5-digit EAN add-ons for magazines and books are not supported yet. We would rather say so than draw something that looks right and scans wrong.' },
]

const apiSnippet = `# SVG, straight into an <img src> or a file
curl 'https://zeal.tools/api/v1/barcode?type=ean13&data=400638133393' -o ean13.svg

# Code 128, wider bars, no text
curl 'https://zeal.tools/api/v1/barcode?type=code128&data=ZEAL-42&w=3&h=120&text=false'

# POST with options; format "json" also returns what was encoded
curl -X POST https://zeal.tools/api/v1/barcode \\
  -H 'content-type: application/json' \\
  -d '{"type": "itf14", "data": "1540014128876", "format": "json"}'`

const contents = [
  { id: 'howto-heading', label: 'How to make a barcode' },
  { id: 'which-heading', label: 'Which barcode to use' },
  { id: 'print-heading', label: 'Printing barcodes that scan' },
  { id: 'inside-heading', label: 'How the encoder works' },
  { id: 'faq-heading', label: 'Questions' },
  { id: 'api-heading', label: 'API' },
  { id: 'promise', label: 'The Zeal Promise' },
]

const codeClass = 'rounded bg-muted px-1.5 py-0.5 font-mono text-xs'
</script>

<template>
  <div class="container-page py-10">
    <ToolPageHeader
      title="Free Barcode Generator"
      description="EAN-13, UPC-A, EAN-8, UPC-E, Code 128, Code 39 and ITF-14, with check digits done for you. Drawn in your browser by our own open-source encoder."
    />

    <BarcodeTool />

    <section class="mt-12 flex flex-wrap gap-2 text-sm" aria-label="Related tools">
      <NuxtLink to="/tools/qr-code-generator" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        QR code generator →
      </NuxtLink>
      <NuxtLink to="/tools/invoice-maker" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Invoice maker →
      </NuxtLink>
      <NuxtLink to="/tools/image-compressor" class="rounded-full border border-border px-4 py-1.5 transition-colors hover:border-primary/40 hover:text-primary">
        Image compressor →
      </NuxtLink>
    </section>

    <ToolContents :items="contents">
      <section aria-labelledby="howto-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="howto-heading" class="text-xl font-semibold">
          How to make a barcode
        </h2>
        <ol class="mt-6">
          <li v-for="(step, index) in howToSteps" :key="step.title" class="relative flex gap-4 pb-8 last:pb-0">
            <span
              v-if="index < howToSteps.length - 1"
              class="absolute bottom-0 left-4 top-9 w-px -translate-x-1/2 bg-border"
              aria-hidden="true"
            />
            <span class="relative grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card text-sm font-semibold">
              {{ index + 1 }}
            </span>
            <div class="pt-1">
              <h3 class="font-medium">
                {{ step.title }}
              </h3>
              <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                {{ step.body }}
              </p>
            </div>
          </li>
        </ol>
      </section>

      <section aria-labelledby="which-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="which-heading" class="text-xl font-semibold">
          Which barcode to use
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Selling in shops: EAN-13 or UPC-A, with a GS1 number.</strong>
            These are the barcodes on almost every retail product — EAN-13 everywhere, UPC-A as the
            12-digit form still common in the US and Canada, and the two are read interchangeably by
            checkouts. The honest part: the barcode is only half of it. The number has to begin with a
            company prefix that GS1, the not-for-profit that runs the system, has licensed to your
            business. This tool will draw a flawless barcode for any number, but a number you invented
            belongs to nobody, and a retailer or marketplace that checks it against GS1's register will
            reject it.
          </p>
          <p>
            <strong class="text-foreground">Small packs: EAN-8 or UPC-E.</strong> EAN-8 is for packs too
            small for an EAN-13, and GS1 issues those numbers individually, on request. UPC-E is a UPC-A
            with its zeros squeezed out — it only exists for UPC-A numbers with a run of zeros in the
            right place. Paste a full UPC-A into UPC-E here and it is shortened if that is possible, or
            you are told why it is not.
          </p>
          <p>
            <strong class="text-foreground">Cartons and cases: ITF-14.</strong> The 14-digit GTIN on an
            outer box, encoded in Interleaved 2 of 5, a symbology with wide, forgiving bars that survive
            printing on corrugated board. The heavy bearer bars along the top and bottom are there for a
            reason: they stop a scanner that clips the edge from reading a shorter number that happens
            to be valid.
          </p>
          <p>
            <strong class="text-foreground">Everything internal: Code 128.</strong> Stock numbers, asset
            tags, order and parcel references, library cards, document tracking. It encodes any plain
            ASCII text, it is the most compact general-purpose linear barcode, every scanner reads it, and
            nobody's permission is needed to use it within your own business.
          </p>
          <p>
            <strong class="text-foreground">Legacy systems: Code 39.</strong> Older, wider, and limited to
            capitals, digits and a handful of symbols — but still specified by some industries and still
            the only thing some older readers accept. Use it when the system on the other end asks for
            it, and Code 128 otherwise.
          </p>
        </div>
      </section>

      <section aria-labelledby="print-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="print-heading" class="text-xl font-semibold">
          Printing barcodes that scan
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            <strong class="text-foreground">Leave the quiet zone alone.</strong> The blank margin either
            side of the bars is part of the barcode — it is how the scanner finds the edges. Every
            download here includes exactly the margin the specification asks for, and the extra-margin
            slider only ever adds to it. When the barcode goes into a label or a piece of packaging
            artwork, keep text, borders and edges of the label out of that space.
          </p>
          <p>
            <strong class="text-foreground">Print at a sensible size.</strong> A retail barcode at 100%
            has bar modules of 0.33 mm and GS1 allows 80% to 200%. Under the PNG scale the tool shows the
            printed size at 300 dpi and warns when it falls outside that range. For crisp edges, use
            whole-number scales and let the printer print at its native resolution rather than resizing
            the image in a document — a barcode stretched by 7% gets uneven bars. The SVG avoids the
            problem entirely, which is why designers and print shops prefer it.
          </p>
          <p>
            <strong class="text-foreground">Keep it tall, and keep it dark on light.</strong> Shortening
            an EAN's bars to fit the pack stops checkout scanners reading it at an angle. Scanners see
            colour roughly as a red light would, so dark blue, green or black bars are fine while red,
            orange and yellow bars vanish; light bars on a dark background fail on many readers. Matt
            surfaces beat glossy ones. On a narrow bottle or tube, turn the barcode so the bars wrap
            around the curve: the scan line then runs along the flat length instead of disappearing round
            the side.
          </p>
          <p>
            <strong class="text-foreground">Then test-scan the printed one.</strong> Not the preview on
            your screen — the real print, on the real material, with the scanner or app that will read it
            day to day. It is the only test that counts, and it is far cheaper before a print run than
            after.
          </p>
        </div>
      </section>

      <section aria-labelledby="inside-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="inside-heading" class="text-xl font-semibold">
          How the encoder works
        </h2>
        <div class="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Every symbology here is implemented from its specification in dependency-free TypeScript.
            An EAN-13 is 95 modules: three guard patterns and twelve digits of seven modules each. Its
            thirteenth digit is never drawn — it is carried by which of the left six digits use odd and
            which even parity, which is why the first digit sits outside the bars on a real label. UPC-A
            is the same barcode with a leading zero, and the digits here are placed exactly as on a real
            label, with the guard bars running down between them.
          </p>
          <p>
            Code 128 is where the interesting choice lives. Its three code sets hold upper case and
            control characters, upper and lower case, and pairs of digits. Rather than switch by a rule of
            thumb, the encoder runs a shortest-path search over every position and code set, so the
            result uses the fewest symbols that can represent the input — then appends the mod-103 check
            symbol and the stop pattern.
          </p>
          <p>
            The proof is in the tests. Each symbology is checked against published examples, such as
            EAN-13 <code :class="codeClass">4006381333931</code> and UPC-A
            <code :class="codeClass">036000291452</code>, and then round-tripped through a separate
            decoder written only for testing, which reads bar widths the way a scanner does: thousands of
            random numbers and strings, every Code 128 result also checked against a second, differently
            built search for the minimum. A further test renders the SVG with an independent engine,
            reads a row of pixels and decodes that — confirming the quiet zones down to the pixel.
          </p>
        </div>
      </section>

      <FaqSection :items="faq" class="rounded-2xl bg-muted/50 p-6 sm:p-8" />

      <section id="api" aria-labelledby="api-heading" class="rounded-2xl bg-muted/50 p-6 sm:p-8">
        <h2 id="api-heading" class="text-xl font-semibold">
          API — same encoder, no key required
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          The encoder behind this page also runs behind a free REST endpoint, returning SVG. No API key,
          no sign-up, honest rate limits. Check digits behave exactly as they do here: added when
          missing, verified when given, and a wrong one is a 400 with the right digit in the message.
        </p>
        <CodeBlock :code="apiSnippet" lang="bash" />
        <p class="mt-3 text-sm text-muted-foreground">
          MCP clients can call the same core: add
          <code :class="codeClass">https://zeal.tools/mcp</code> to your client and use the
          <code :class="codeClass">generate_barcode</code> tool.
        </p>
      </section>

      <ZealPromise />
    </ToolContents>
  </div>
</template>
