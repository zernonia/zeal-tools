<template>
  <BlogArticle slug="free-online-tools-no-sign-up">
    <p>
      You know how it goes. You need something small — a QR code, a smaller image, a background removed — and
      the first result does it, sort of. Then it wants an email address before you can download. Then the
      download has a watermark. Then the QR code you printed on two hundred flyers stops working because the
      "free trial" ended.
    </p>
    <p>
      Everything on <NuxtLink to="/">
        zeal.tools
      </NuxtLink> works the other way round. There is no account to
      make, so there is nothing to sign up for. There is no watermark on anything you download. And almost
      every tool runs inside your browser, so the photo, song or document you give it never leaves your
      device. Here are all sixteen.
    </p>

    <h2 id="qr">
      1. QR Code Generator
    </h2>
    <BlogToolCard slug="qr-code-generator" />
    <p>
      The <NuxtLink to="/tools/qr-code-generator">
        QR code generator
      </NuxtLink> makes codes for links, WiFi,
      contact cards, email, phone and SMS, and downloads them as PNG or SVG. The codes are <strong>static</strong>:
      the link is encoded in the pattern itself, so they never expire, never redirect through anyone's server
      and never stop working when a subscription lapses. That is the main trap with "free" QR sites, which
      often make a dynamic code that points at their own short link.
    </p>
    <p>
      There are dedicated pages for <NuxtLink to="/tools/qr-code-generator/wifi">
        WiFi QR codes
      </NuxtLink>, which
      let guests join your network without typing a password, and for
      <NuxtLink to="/tools/qr-code-generator/vcard">
        vCard QR codes
      </NuxtLink> on business cards.
    </p>

    <h2 id="background">
      2. Background Remover
    </h2>
    <BlogToolCard slug="background-remover" />
    <p>
      The <NuxtLink to="/tools/background-remover">
        background remover
      </NuxtLink> cuts the subject out of a
      photo and gives you a transparent PNG, or drops it onto a solid colour. The AI model runs on your own
      computer, so the photo is never uploaded, and there are no per-image credits.
    </p>

    <h2 id="stems">
      3. Stem Splitter
    </h2>
    <BlogToolCard slug="stem-splitter" />
    <p>
      The <NuxtLink to="/tools/stem-splitter">
        stem splitter
      </NuxtLink> separates a song into vocals, drums,
      bass and everything else — or six stems with guitar and piano — and lets you mute, solo and download each
      one as WAV. Like the background remover, the model runs in your browser. Shortcut pages open on the most
      common jobs: the <NuxtLink to="/tools/stem-splitter/vocal-remover">
        vocal remover
      </NuxtLink>, the
      <NuxtLink to="/tools/stem-splitter/acapella-extractor">
        acapella extractor
      </NuxtLink> and the
      <NuxtLink to="/tools/stem-splitter/drum-remover">
        drum remover
      </NuxtLink>.
    </p>

    <h2 id="compress">
      4. Image Compressor
    </h2>
    <BlogToolCard slug="image-compressor" />
    <p>
      The <NuxtLink to="/tools/image-compressor">
        image compressor
      </NuxtLink> shrinks, resizes and converts
      JPEG, PNG and WebP images in batches, shows exactly how much smaller each one got, and downloads them
      one by one or as a zip. It also covers the common conversions:
      <NuxtLink to="/tools/image-compressor/png-to-jpg">
        PNG to JPG
      </NuxtLink> and
      <NuxtLink to="/tools/image-compressor/jpg-to-webp">
        JPG to WebP
      </NuxtLink>.
    </p>

    <h2 id="send">
      5. Send to Device
    </h2>
    <BlogToolCard slug="send-to-device" />
    <p>
      <NuxtLink to="/tools/send-to-device">
        Send to device
      </NuxtLink> moves a file between your phone and your
      laptop with no cable, no app and no account. Open the page on both, they find each other on your network,
      and the file travels <em>directly</em> between them over an encrypted connection. It needs both devices on
      the same network — that is the price of the file never touching a server. Every transfer asks the
      receiver first.
    </p>

    <h2 id="invoice">
      6. Invoice Maker
    </h2>
    <BlogToolCard slug="invoice-maker" />
    <p>
      The <NuxtLink to="/tools/invoice-maker">
        invoice maker
      </NuxtLink> builds a clean invoice and saves it as a
      PDF through your browser's own print dialog. Your business details, logo and clients are remembered on
      your device, so the next invoice takes a minute. Amounts are held as whole cents, so the lines always add
      up to the total, and currencies without decimals, like yen, are handled properly.
    </p>

    <h2 id="password">
      7. Password Generator
    </h2>
    <BlogToolCard slug="password-generator" />
    <p>
      The <NuxtLink to="/tools/password-generator">
        password generator
      </NuxtLink> creates passwords from your
      operating system's cryptographic random source, inside the page, and shows the entropy and the time it
      would take to crack. It is never transmitted or stored — which is the only acceptable way for a password
      generator to work.
    </p>

    <h2 id="exif">
      8. EXIF Viewer
    </h2>
    <BlogToolCard slug="exif-viewer" />
    <p>
      Photos carry hidden metadata: the camera, the time and often the exact GPS location. The
      <NuxtLink to="/tools/exif-viewer">
        EXIF viewer
      </NuxtLink> shows you what is in yours and downloads a copy
      with it removed — losslessly, so the image itself is copied byte for byte and nothing is re-compressed.
    </p>

    <h2 id="names">
      9. Name Picker
    </h2>
    <BlogToolCard slug="name-picker" />
    <p>
      The <NuxtLink to="/tools/name-picker">
        name picker
      </NuxtLink> spins a wheel and draws a name using a
      cryptographic random source rather than a rough approximation of one. It can remove each winner, give
      some names extra weight, and remember your list. There are versions tuned for
      <NuxtLink to="/tools/name-picker/raffle">
        raffles
      </NuxtLink> and
      <NuxtLink to="/tools/name-picker/classroom">
        classrooms
      </NuxtLink>.
    </p>

    <h2 id="meta">
      10. Meta Tag Checker
    </h2>
    <BlogToolCard slug="meta-tag-checker" />
    <p>
      Paste a URL into the <NuxtLink to="/tools/meta-tag-checker">
        meta tag checker
      </NuxtLink> and see the link
      preview as Google, X, Facebook, LinkedIn and Slack will each build it — they all use different fallbacks.
      It reports missing tags and titles that will be cut off, and writes the tags you are missing. This is the
      one tool whose input reaches our server, because browsers forbid a page from reading another site's HTML;
      it reads only the page's head and returns the tags, never the page.
    </p>

    <h2 id="favicon">
      11. Favicon Generator
    </h2>
    <BlogToolCard slug="favicon-generator" />
    <p>
      Drop a logo into the <NuxtLink to="/tools/favicon-generator">
        favicon generator
      </NuxtLink> and get
      <code>favicon.ico</code>, the Apple touch icon, the Android icons, a web manifest and the HTML to paste —
      as one zip, with a deliberately short file list instead of thirty legacy sizes. SVG logos work too.
    </p>

    <h2 id="chords">
      12. Chord Transposer
    </h2>
    <BlogToolCard slug="chord-transposer" />
    <p>
      The <NuxtLink to="/tools/chord-transposer">
        chord transposer
      </NuxtLink> moves a pasted chord chart to any
      key while leaving the lyrics and alignment exactly as they were — a line is only transposed when every word
      on it is a chord, so "Amazing" stays a word. The <NuxtLink to="/tools/chord-transposer/capo">
        capo
        calculator
      </NuxtLink> works out which shapes to play for any capo position.
    </p>

    <h2 id="tuner">
      13. Tuner
    </h2>
    <BlogToolCard slug="tuner" />
    <p>
      The <NuxtLink to="/tools/tuner">
        tuner
      </NuxtLink> listens through your microphone and shows the note, how
      many cents you are out and which string you are aiming for, with presets for
      <NuxtLink to="/tools/tuner/guitar">
        guitar
      </NuxtLink>, <NuxtLink to="/tools/tuner/bass">
        bass
      </NuxtLink> and
      <NuxtLink to="/tools/tuner/ukulele">
        ukulele
      </NuxtLink>. The audio is analysed on your device and never
      recorded.
    </p>

    <h2 id="stage">
      14. Stage Timer
    </h2>
    <BlogToolCard slug="stage-timer" />
    <p>
      The <NuxtLink to="/tools/stage-timer">
        stage timer
      </NuxtLink> puts a huge countdown on the screen the
      speaker sees, with a separate control window on your laptop. You can add or take away a minute while the
      clock runs and send a message like "wrap up" under the time. When time runs out it counts on, in red, so
      the speaker knows how far over they are.
    </p>

    <h2 id="countdown">
      15. Countdown Timer
    </h2>
    <BlogToolCard slug="countdown-timer" />
    <p>
      The <NuxtLink to="/tools/countdown-timer">
        countdown timer
      </NuxtLink> counts to any date, or to the next
      Christmas, Easter or New Year — it calculates Easter for any year rather than looking it up. Everything is
      stored in the link, so sharing the countdown is copying the URL, and full screen turns it into a display.
      There is a ready-made <NuxtLink to="/tools/countdown-timer/christmas">
        Christmas countdown
      </NuxtLink>.
    </p>

    <h2 id="pads">
      16. Worship Pads
    </h2>
    <BlogToolCard slug="worship-pads" />
    <p>
      <NuxtLink to="/tools/worship-pads">
        Worship pads
      </NuxtLink> plays a sustained ambient pad in any key,
      synthesised live in the browser rather than streamed, so there is nothing to download and it keeps working
      if the venue's WiFi does not. Every key has a one-key shortcut, and changing key crossfades underneath you.
    </p>

    <h2 id="why">
      Why none of these need an account
    </h2>
    <p>
      Accounts exist on most free tool sites to do one of three things: collect your email, enforce a usage
      limit, or hold your files. None of those apply when the tool runs on your own device. There is no file to
      hold and no server cost per use to limit, so there is nothing an account would do for you.
    </p>
    <p>
      The same design means no watermarks and no ads next to the download button — a rule we hold to on every
      page. Everything is MIT licensed and <a href="https://github.com/zernonia/zeal-tools" target="_blank" rel="noopener">open source</a>,
      and five of the tools — QR codes, passwords, chord charts, name picking and meta tags — can also be called
      over a REST API or MCP, for developers and AI agents.
    </p>
    <p>
      Missing something you need?
      <a href="https://github.com/zernonia/zeal-tools/issues/new?template=tool-request.md" target="_blank" rel="noopener">Request a tool</a>.
    </p>
  </BlogArticle>
</template>
