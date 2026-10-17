<template>
  <BlogArticle slug="free-tools-for-teachers">
    <p>
      Classroom tools have a habit of wanting things: a teacher account, then student accounts, then a school
      licence for the feature you actually needed. Each of those is a login to remember, a data-protection
      question for your school, and a reason the tool quietly stops being used by October.
    </p>
    <p>
      These eight need none of it. They open in a browser on the classroom computer, the interactive whiteboard
      or your phone, and nobody — not you, not your students — signs up for anything. Most work offline once
      loaded, so a wobbly school network will not take them down mid-lesson.
    </p>

    <h2 id="names">
      1. Name Picker — cold-calling that feels fair
    </h2>
    <BlogToolCard slug="name-picker" to="/tools/name-picker/classroom" />
    <p>
      The <NuxtLink to="/tools/name-picker/classroom">
        classroom name picker
      </NuxtLink> is a spinning wheel of
      your class. Tick "take the winner off the wheel" and it works through everyone exactly once before anyone is
      asked twice. Your list is saved in that browser, so the class is waiting for you next lesson, and it never
      goes to a server.
    </p>
    <p>
      Random selection takes the sting out of cold-calling: nobody can suspect they are being targeted, and
      everybody has to be ready rather than only the volunteers. The draw uses a cryptographic random source, so
      it is genuinely fair. First names and an initial read best from the back — and mean a projector left on
      is not showing a full register. Spinning repeatedly with winners removed also makes random groups the class
      can watch being drawn.
    </p>

    <h2 id="stage">
      2. Stage Timer — for student presentations
    </h2>
    <BlogToolCard slug="stage-timer" />
    <p>
      Put the <NuxtLink to="/tools/stage-timer">
        stage timer
      </NuxtLink> on the board, facing the presenter, and
      keep the controls in a second window on your laptop. Each student sees a huge countdown; you can add a minute
      for a nervous speaker without stopping the clock, and type "one minute left" under the time. When time is
      up it carries on counting in red, so overruns are visible without you having to interrupt.
    </p>

    <h2 id="countdown">
      3. Countdown Timer — to the end of the task, or the end of term
    </h2>
    <BlogToolCard slug="countdown-timer" />
    <p>
      The <NuxtLink to="/tools/countdown-timer">
        countdown timer
      </NuxtLink> counts down to any date and time.
      Set it to when the activity finishes and full-screen it on the board; or count down to an exam, a trip or
      the last day of term. The countdown lives in its link, so you can share it with a class or a colleague just
      by sending the URL.
    </p>

    <h2 id="qr">
      4. QR Code Generator — get thirty phones to the same page
    </h2>
    <BlogToolCard slug="qr-code-generator" />
    <p>
      Reading a URL aloud to a class is a five-minute exercise in typos. A QR code on the board takes seconds. The
      <NuxtLink to="/tools/qr-code-generator">
        QR code generator
      </NuxtLink> makes codes for a worksheet, a form, a
      video or a quiz, and saves them as PNG or SVG for slides and printouts. The codes are static, so a code on a
      laminated display still works in five years — there is no short link to expire. For visitors on the
      classroom network, a <NuxtLink to="/tools/qr-code-generator/wifi">
        WiFi QR code
      </NuxtLink> saves dictating
      the password.
    </p>

    <h2 id="send">
      5. Send to Device — from your phone to the classroom computer
    </h2>
    <BlogToolCard slug="send-to-device" />
    <p>
      You photographed a student's work or the whiteboard, and now it needs to be on the computer connected to
      the projector. <NuxtLink to="/tools/send-to-device">
        Send to device
      </NuxtLink> moves the file directly
      between the two over your network: open the page on both, pick the other device, and accept on the
      receiving end. No cable, no emailing yourself, no cloud folder, and no size limit from us.
    </p>
    <p>
      Both devices need to be on the same network. Some school networks deliberately stop devices from seeing
      each other; if yours does, this is the network saying no, not the tool.
    </p>

    <h2 id="compress">
      6. Image Compressor — under the upload limit
    </h2>
    <BlogToolCard slug="image-compressor" />
    <p>
      Learning platforms and newsletter tools love an upload limit, and phone photos love to be 5 MB. The
      <NuxtLink to="/tools/image-compressor">
        image compressor
      </NuxtLink> resizes and compresses a whole batch
      at once, shows how much each one shrank, and downloads them as a zip. The photos are processed on your
      computer — worth knowing when the pictures are of students.
    </p>

    <h2 id="background">
      7. Background Remover — cut-outs for worksheets and displays
    </h2>
    <BlogToolCard slug="background-remover" />
    <p>
      For a worksheet, a display board or a class newsletter, a cut-out image looks far cleaner than a photo with
      a busy background. The <NuxtLink to="/tools/background-remover">
        background remover
      </NuxtLink> does it in
      the browser and saves a transparent PNG, or puts the cut-out on a solid colour. Again, nothing is uploaded.
    </p>

    <h2 id="tuner">
      8. Tuner — for the music room
    </h2>
    <BlogToolCard slug="tuner" />
    <p>
      A class set of ukuleles goes out of tune between lessons. The <NuxtLink to="/tools/tuner/ukulele">
        ukulele
        tuner
      </NuxtLink> — also for <NuxtLink to="/tools/tuner/guitar">
        guitar
      </NuxtLink> and
      <NuxtLink to="/tools/tuner/bass">
        bass
      </NuxtLink> — runs on any phone or laptop with a microphone and shows
      which string you are tuning and how far out it is. Students can use it on their own phones with no app to
      install. Nothing is recorded.
    </p>

    <h2 id="privacy">
      A note on student data
    </h2>
    <p>
      Every tool above works without accounts, so there is no student data to register with anyone. Name lists,
      photos and files stay on the device you use them on; the one thing that crosses the internet is
      <em>Send to Device</em>'s introduction between your two devices, and even then the file itself travels
      directly between them. That makes these tools an easy conversation with whoever looks after data protection
      at your school.
    </p>
  </BlogArticle>
</template>
