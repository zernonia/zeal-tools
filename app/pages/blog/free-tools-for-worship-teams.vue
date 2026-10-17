<template>
  <BlogArticle slug="free-tools-for-worship-teams">
    <p>
      Most worship teams run on volunteers, one weekly rehearsal and a budget that has to stretch across
      everything else the church does. The software built for them tends to assume the opposite: a subscription
      per tool, an account per musician, a per-song fee for practice tracks.
    </p>
    <p>
      These seven tools are free, need no account for anyone on the team, and run in a web browser on whatever
      laptop or phone is at hand. Several keep working with no internet once the page is loaded, which matters in
      a building where the WiFi is a matter of faith.
    </p>

    <h2 id="transpose">
      1. Chord Transposer — change the key without retyping the chart
    </h2>
    <BlogToolCard slug="chord-transposer" />
    <p>
      The worship leader wants the song a tone lower this week. The <NuxtLink to="/tools/chord-transposer">
        chord
        transposer
      </NuxtLink> takes a pasted chart, moves every chord to the new key and leaves the lyrics and
      the spacing exactly as they were. It only treats a line as chords when every word on it is a chord, so a lyric
      line starting with "And" or "Amazing" is never mangled, and chords stay above the syllables they sat over.
    </p>
    <p>
      For guitarists, the <NuxtLink to="/tools/chord-transposer/capo">
        capo calculator
      </NuxtLink> shows which
      shapes to play at each fret for the key the band is in. A useful rule for the music stand: keys, bass and
      vocals read the sounding key; only the guitars read the capo chart.
    </p>

    <h2 id="pads">
      2. Worship Pads — an ambient bed for prayer and transitions
    </h2>
    <BlogToolCard slug="worship-pads" />
    <p>
      <NuxtLink to="/tools/worship-pads">
        Worship pads
      </NuxtLink> plays a sustained pad in any key, synthesised
      live in the browser. Nothing streams, so nothing buffers, and once the page has loaded it works offline.
      Every key has a single-key shortcut and the change crossfades — four seconds suits most transitions, up to
      twelve if you want the change to be invisible.
    </p>
    <p>
      It is deliberately simple, so it sits under a band rather than competing with it. Run it from a laptop into a
      spare channel on the desk, put it in the key of the next song, and the gaps between songs stop being
      silences.
    </p>

    <h2 id="practice">
      3. Worship Practice Tracks — learn parts at home with the real band
    </h2>
    <BlogToolCard slug="stem-splitter" to="/tools/stem-splitter/worship-practice-tracks" />
    <p>
      Rehearsal time is too short to teach parts, so parts get learned at home — usually along to the original
      recording, where your own playing is buried under the recorded musician. The
      <NuxtLink to="/tools/stem-splitter/worship-practice-tracks">
        worship practice tracks
      </NuxtLink> page
      separates a song into vocals, drums, bass and the rest, or six stems with guitar and piano, so you can mute
      each musician's part and give them the rest of the band to play into.
    </p>
    <ul>
      <li><strong>Drummer:</strong> the song with no drums — keep the original at about 15% while learning fills.</li>
      <li><strong>Bassist:</strong> solo the bass first to hear what is actually played under each chord, then mute it.</li>
      <li><strong>Vocalists:</strong> "Vocals only" makes harmonies much easier to pick out.</li>
    </ul>
    <p>
      The separation runs on your computer, so the song is never uploaded. The stems are estimated from a finished
      mix, so they are made for rehearsal rather than for playing through the PA on Sunday. A church licence to
      sing a song usually does not cover copying or playing the recording itself, so check what yours includes
      before sending tracks round.
    </p>

    <h2 id="stage">
      4. Stage Timer — keep the preacher and the run sheet on time
    </h2>
    <BlogToolCard slug="stage-timer" />
    <p>
      The <NuxtLink to="/tools/stage-timer">
        stage timer
      </NuxtLink> shows a huge countdown on a confidence monitor
      or side screen, controlled from a separate window on the tech desk laptop. You can add a minute without
      stopping the clock, and type a message — "one more song", "wrap up" — that appears under the time. When time
      runs out it keeps counting, in red, which is far more useful to a speaker than a frozen zero.
    </p>
    <p>
      The two windows sync inside one browser on one machine, with no server and no account, so it keeps working if
      the internet drops mid-service.
    </p>

    <h2 id="countdown">
      5. Countdown Timer — the pre-service countdown on the screens
    </h2>
    <BlogToolCard slug="countdown-timer" />
    <p>
      Put the <NuxtLink to="/tools/countdown-timer">
        countdown timer
      </NuxtLink> on the projector before the service
      starts, set to the start time, and full screen it — just the numbers, large enough to read across the room,
      with no watermark or advertising. It also counts to the next Christmas or Easter automatically (Easter is
      calculated, so it is right every year), which is handy for a foyer screen through Advent with the
      <NuxtLink to="/tools/countdown-timer/christmas">
        Christmas countdown
      </NuxtLink>.
    </p>

    <h2 id="tuner">
      6. Tuner — for the guitarist who forgot theirs
    </h2>
    <BlogToolCard slug="tuner" />
    <p>
      There is always one. The <NuxtLink to="/tools/tuner">
        tuner
      </NuxtLink> runs on any phone through its
      microphone, shows the note and how many cents you are out, and has presets for
      <NuxtLink to="/tools/tuner/guitar">
        guitar
      </NuxtLink>, <NuxtLink to="/tools/tuner/bass">
        bass
      </NuxtLink> and
      <NuxtLink to="/tools/tuner/ukulele">
        ukulele
      </NuxtLink>. The reference pitch is adjustable if your keys are
      not at A440. Nothing is recorded; the audio is analysed on the phone and discarded.
    </p>

    <h2 id="qr">
      7. QR Code Generator — connect cards, giving and guest WiFi
    </h2>
    <BlogToolCard slug="qr-code-generator" />
    <p>
      A QR code on the screen during the notices is the easiest way to get people to a connect card, an event
      sign-up or an online giving page. The <NuxtLink to="/tools/qr-code-generator">
        QR code generator
      </NuxtLink>
      makes <strong>static</strong> codes that never expire and never route through anyone else's server — which
      matters when the code is printed on a banner that will hang for years. A
      <NuxtLink to="/tools/qr-code-generator/wifi">
        WiFi QR code
      </NuxtLink> by the café lets visitors join the guest
      network without asking for the password.
    </p>

    <h2 id="sunday">
      Putting it together on a Sunday
    </h2>
    <ol>
      <li><strong>Early in the week:</strong> pick the set and keys, transpose the charts, and send practice tracks for any new songs.</li>
      <li><strong>Before the service:</strong> countdown on the screens, pads in the key of the opening song, everyone tuned.</li>
      <li><strong>During:</strong> pads under the transitions and prayer, stage timer on the confidence monitor for the talk.</li>
      <li><strong>Notices:</strong> a QR code on screen for whatever you want people to do next.</li>
    </ol>
    <p>
      None of it needs anyone on the team to make an account, and none of it costs anything — now or later.
    </p>
  </BlogArticle>
</template>
