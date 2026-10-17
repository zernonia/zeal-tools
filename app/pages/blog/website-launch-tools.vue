<template>
  <BlogArticle slug="website-launch-tools">
    <p>
      The site works. The pages load, the forms submit, the deploy is green. And then there is the last mile —
      the small jobs nobody puts in the estimate: the icon in the browser tab, what the link looks like when
      someone shares it, the 4 MB hero image, the QR code on the flyer for the launch event.
    </p>
    <p>
      Each of those has a free tool that tries to collect your email first. These six don't. They need no
      account, and except where noted, they run in your browser, so your logo, images and passwords stay on
      your machine.
    </p>

    <h2 id="favicon">
      1. Favicon Generator — every icon from one logo
    </h2>
    <BlogToolCard slug="favicon-generator" />
    <p>
      Drop your logo into the <NuxtLink to="/tools/favicon-generator">
        favicon generator
      </NuxtLink> — PNG, JPEG,
      WebP or, best of all, SVG — and download one zip sorted into web, iOS and Android folders, with
      <code>favicon.ico</code>, the Apple touch icon, a web manifest with a maskable icon, and five lines of markup
      to paste into your <code>&lt;head&gt;</code>. The list is deliberately short; you do not need thirty legacy
      sizes in 2026.
    </p>
    <p>
      Shipping an app too? The iOS set is a complete <code>AppIcon.appiconset</code>, and the 1024px App Store
      icon is written as a true RGB PNG with no alpha channel. That is the detail that saves a rejected upload:
      Apple refuses any App Store icon with an alpha channel, and filling in a background colour does not
      remove the channel.
    </p>

    <h2 id="meta">
      2. Meta Tag Checker — see the link before anyone shares it
    </h2>
    <BlogToolCard slug="meta-tag-checker" />
    <p>
      The first time most people see their own link preview is when it goes out broken in a group chat. The
      <NuxtLink to="/tools/meta-tag-checker">
        meta tag checker
      </NuxtLink> shows the card as Google, X, Facebook,
      LinkedIn and Slack will each build it — they do not agree, and each falls back differently when a tag is
      missing. It flags errors and warnings, and writes the tags you are missing.
    </p>
    <p>
      The single most common fault is a relative <code>og:image</code>. Your browser resolves
      <code>/og.png</code> against the page, but a crawler fetches the image cold, with no page for context, so it
      needs the full <code>https://</code> URL. The checker treats that as an error, not a warning. There are
      focused guides for <NuxtLink to="/tools/meta-tag-checker/open-graph">
        Open Graph
      </NuxtLink> and
      <NuxtLink to="/tools/meta-tag-checker/twitter-card">
        Twitter cards
      </NuxtLink>.
    </p>
    <p>
      This is the one tool here whose input reaches a server, because browsers do not allow a page to read
      another site's HTML. It reads only as far as the page's head, and returns the tags rather than the page.
    </p>

    <h2 id="images">
      3. Image Compressor — the cheapest speed win you have
    </h2>
    <BlogToolCard slug="image-compressor" />
    <p>
      Images are usually the heaviest thing on a new site, and the easiest to fix. The
      <NuxtLink to="/tools/image-compressor">
        image compressor
      </NuxtLink> resizes and re-encodes a batch of JPEG,
      PNG and WebP files, shows the saving on each, and downloads them as a zip. Resize to the largest size the
      layout actually displays — a 4000px photo in an 800px column is mostly wasted bytes — and convert photos to
      WebP with <NuxtLink to="/tools/image-compressor/jpg-to-webp">
        JPG to WebP
      </NuxtLink>. Screenshots and
      graphics with flat colour usually stay smallest as PNG.
    </p>

    <h2 id="background">
      4. Background Remover — product shots and team photos
    </h2>
    <BlogToolCard slug="background-remover" />
    <p>
      Product photos on white, or a row of team headshots on the same brand colour, make a new site look
      considered. The <NuxtLink to="/tools/background-remover">
        background remover
      </NuxtLink> cuts the subject out
      in the browser and saves a transparent PNG or puts it on a solid colour of your choice. Run the result through
      the compressor afterwards — a transparent PNG is rarely small.
    </p>

    <h2 id="password">
      5. Password Generator — before the admin panel goes public
    </h2>
    <BlogToolCard slug="password-generator" />
    <p>
      Launch day is when the "admin / admin123" set up during development stops being funny. The
      <NuxtLink to="/tools/password-generator">
        password generator
      </NuxtLink> makes strong passwords for the CMS,
      the database and the hosting account from your operating system's cryptographic random source, and shows
      the entropy so you can see how strong is strong. It is generated in the page and never sent anywhere. Put it
      straight into a password manager.
    </p>

    <h2 id="qr">
      6. QR Code Generator — the printed half of the launch
    </h2>
    <BlogToolCard slug="qr-code-generator" />
    <p>
      Flyers, posters, business cards and the slide at the launch event all want a way back to the site. The
      <NuxtLink to="/tools/qr-code-generator">
        QR code generator
      </NuxtLink> makes static codes — the URL is in the
      pattern itself, so they never expire and do not route your visitors through a third party's tracking
      redirect. Download SVG for anything printed, so it stays sharp at any size, and test-scan it with a couple of
      phones before you send two thousand flyers to the printer.
    </p>

    <h2 id="checklist">
      A last-mile checklist
    </h2>
    <ul>
      <li>Favicon set generated and the markup in the <code>&lt;head&gt;</code>.</li>
      <li>Every page has a title, a description and an absolute <code>og:image</code> — checked in all five previews.</li>
      <li>No image larger than the layout displays it; photos in WebP.</li>
      <li>Default and development passwords replaced and stored in a password manager.</li>
      <li>QR codes for printed material generated as SVG and test-scanned.</li>
    </ul>
    <p>
      Every one of these tools is free, open source and needs no account — which is the right amount of
      paperwork for the last day of a project.
    </p>
  </BlogArticle>
</template>
