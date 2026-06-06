
## Goal

Make the sign-language layer feel uniquely African and obviously in-progress in a way that a funder or ministry official sees on the home screen — without depending on any new AI model or third-party SDK. Everything below is static assets + existing React. No gods of AI summoned.

## What's in the market (June 2026) we can ride

- **SignWriting + Unicode SignWriting blocks**: text-based notation, render with any web font (e.g. SuttonSignWriting fonts). Free, offline, font-only.
- **HamNoSys / JASigning**: open animated avatar from University of East Anglia. Heavy install, skip for now but worth naming in the roadmap.
- **Open ZSL/SASL/KSL clip sets**: Signs of Zimbabwe (Deaf Zimbabwe Trust), SASL Dictionary (Wits), KSL Online (KNAD). All have CC-licensed short clips usable as MP4s in `public/signs/`.
- **Sign-Speak / Signapse / Signvrse**: still gated APIs in 2026, all ASL/BSL-leaning. Confirms our positioning: skip them, build the African library instead.

So: no new dependency, just better content + better surfacing.

## Scope of changes (frontend only)

### 1. Fingerspell upgrades — make it the headline feature

- **Auto-play mode** in `FingerspellDisplay`: a play button that highlights each letter in sequence at a configurable WPM (60 / 90 / 120). Uses CSS transitions on the existing letter cards, no new assets.
- **Word presets** above the input: Hello, Thank you, My name, Yes, No, Help, Water, Toilet, Teacher, Home — one-tap demo.
- **"Copy & share"**: WhatsApp share of the typed word so a hearing parent can practice with their deaf child (reuses existing `WhatsAppShare` component).
- **Speech-to-fingerspell**: tap mic → existing browser SpeechRecognition (already used in `VoiceInput`) transcribes a word → auto-plays the fingerspell. This is the "speech-to-SL" hook that funders will recognise, done with zero AI cost.

### 2. Common-phrase ZSL mini library (static MP4/GIF)

- New folder `public/signs/phrases/` with ~20 short clips (placeholder MP4s shipped now; real clips dropped in later).
- New `src/utils/zslPhrases.ts` mapping phrase → clip path + English + Shona + Ndebele captions.
- New `ZSLPhraseCard` component: clip + tri-lingual caption + "Practice" button (loops the clip).
- New tab on `/student/fingerspell` page: "Common Phrases" alongside "Letters".

This is the visible "African ZSL library, half built" — the bit that makes a funder pay attention.

### 3. Live-transcript SL chip

- In the live student transcript view, every word that matches a known keyword sign or phrase gets a small underlined chip; tapping it pops the sign clip in a sheet (mobile-friendly).
- Words that don't match → tap fingerspells them inline via the existing `FingerspellDisplay compact` mode.
- Pure presentation — no change to broadcast pipeline.

### 4. "ZSL Lab" public page (`/zsl-lab`)

A single marketing-grade page (linked from landing footer + About dialog) that:

- States the mission in one line: "An African sign-language layer for African classrooms — built openly, ZSL-first."
- Shows live counters fed from static JSON: letters covered (26), phrases covered (n), languages captioned (3), schools piloting (editable constant).
- Roadmap strip: ✅ Fingerspell, ✅ Phrase library v0, 🛠 Teacher-recorded signs, 🛠 SignWriting captions, ⏳ Speech-to-avatar (research).
- "Contribute a sign" CTA → opens a mailto/WhatsApp with a template. No backend.
- Credits Deaf Zimbabwe Trust, Wits SASL, KNAD as inspiration; explicitly distances from ASL.

This is the page you link in a grant cover letter.

### 5. Small wiring

- Add `/zsl-lab` route in `App.tsx`.
- Footer + landing CTA link.
- Update `docs/SIGN_LANGUAGE_ROADMAP.md` Phase-1.5 section reflecting the new shipped items.

## Out of scope

- No new edge functions, no database tables, no AI calls, no LiveKit changes.
- No actual avatar rigging — that stays in roadmap copy.
- No teacher-side recording UI yet (listed as next phase).
- No changes to existing keyword-sign detection logic beyond the chip styling.

## Technical brief

```
src/
├── components/
│   ├── FingerspellDisplay.tsx       (add autoplay + presets + mic)
│   ├── ZSLPhraseCard.tsx            (new)
│   ├── ZSLPhraseLibrary.tsx         (new — grid of phrase cards)
│   └── TranscriptSignChip.tsx       (new — inline chip + sheet)
├── pages/
│   ├── ZSLLab.tsx                   (new — public marketing page)
│   └── student/Fingerspell.tsx      (add Tabs: Letters | Phrases | Speech)
└── utils/
    ├── fingerspell.ts               (add autoplayTimings helper)
    └── zslPhrases.ts                (new — phrase manifest)

public/signs/
├── letters/                         (existing, 26 PNGs)
└── phrases/                         (new — 20 placeholder MP4s, drop real later)
```

Asset placeholders: we ship 20 tiny looping placeholder MP4s (silhouette + caption) so the grid never looks empty. Real ZSL clips replace them file-for-file with no code change.

## Acceptance checks

- `/student/fingerspell` has three tabs and a working mic→autoplay flow on desktop Chrome.
- `/zsl-lab` renders on mobile (375px) without horizontal scroll, no console errors.
- Live transcript shows chips for at least the existing keyword set; tapping opens a clip/sheet.
- Lighthouse a11y score on `/zsl-lab` ≥ 95.
- No new npm dependencies.

## Why this answers the funder/Google-Classroom question

Google Classroom has none of: African-language fingerspell, ZSL phrase library, tri-lingual captions, mic-driven fingerspell demo, public openly-credited Lab page. Shipping all five in one page is the differentiator, and every piece is honest static work — no AI smoke.
