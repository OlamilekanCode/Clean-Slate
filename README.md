# CLEAN SLATE

**▶ Play it now: [clean-slate-beta.vercel.app](https://clean-slate-beta.vercel.app/)**

> You are at six stars. You have no gun. You have access to the LSPD evidence server.
> Beat the wanted level by editing the evidence against you before it syncs.

A browser game built for the **Unlayer Build With React Image Editor Challenge** (`#BuiltWithImageEditor`).
The player breaks into a police evidence terminal and has five minutes to redact the exhibits that
identify them: a CCTV still, a traffic-camera capture, a police report, a news broadcast and a witness
photo. The [React Image Editor](https://github.com/unlayer/react-image-editor) is the game: every move the
player makes is an edit in the editor, and the score comes from measuring exactly which pixels they changed.

**What makes it different**

- **One connected case, not five separate puzzles.** Hiding the car in the traffic-camera capture does not make
  it go away: its heat _moves_ to the witness photo, and stays on your file until you clear it there too. An
  edit in one exhibit creates unfinished work in another. Today the car is the one link between exhibits, and
  it is the mechanic the whole run is built around.
- **Every visual is original.** All five exhibits, the sunset backdrop and the interface are generated in code
  at runtime. There are no screenshots, no stills and no Rockstar material anywhere in the project.
- **The scoring is measured, not guessed.** It reads the editor's real saved output, and its thresholds were
  calibrated from 77 real-editor runs (see below), including the parts that did not work at first.

> **Status: playable.** The full loop works end to end in a real browser: boot, briefing, editing with the
> clock, forensic analysis and verdict, across all five exhibits (CCTV, traffic camera, police report, news
> broadcast, witness photo), with all four endings. It is deployed on Vercel.

<table>
  <tr>
    <td><img src="docs/screenshots/game-1-boot.jpg" alt="Boot screen"><br><sub>Boot: trip the alarm to start the clock</sub></td>
    <td><img src="docs/screenshots/game-2-brief.jpg" alt="Briefing"><br><sub>Brief: what to hide, what to leave alone</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/game-3-edit.jpg" alt="Editing in the React Image Editor"><br><sub>Edit: the React Image Editor is the game</sub></td>
    <td><img src="docs/screenshots/game-4-analysis.jpg" alt="Forensic analysis"><br><sub>Analysis: every region's cost or saving, and the linked car</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/game-7-report.jpg" alt="Analysis of the police report"><br><sub>Analysis: the police report, a portrait page</sub></td>
    <td><img src="docs/screenshots/game-5-verdict-clean-slate.jpg" alt="Verdict: clean slate"><br><sub>Verdict: CLEAN SLATE</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/game-6-verdict-tampering.jpg" alt="Verdict: tampering charge"><br><sub>Verdict: TAMPERING CHARGE</sub></td>
    <td></td>
  </tr>
</table>

The look is a clean, modern interface over Vice City at dusk: soft glass cards and a bold system sans for
everything you have to read, with the striped sun, palms, skyline and scrolling grid kept behind it, siren lights
when the clock or the risk gets dangerous, and a wanted-stars HUD that tracks heat. Instructions and evidence
are kept free of scanlines and glow so they stay easy to read. All of it is vector art and CSS drawn in code,
so there are no image assets, and it uses system fonts only, so nothing can fail to load.

## Every ending, played for real

Four real playthroughs of the game, recorded at normal speed from the production build. Nothing is mocked: each
one is the actual editor being driven, the actual save being scored, and the actual verdict. They are animated
WebP, so if one looks frozen, give it a second to load.

### A clean run: CLEAN SLATE

Cover every target solid, leave every proof stamp alone, and the file is clean: heat near zero, no stars.
The traffic-camera shot shows the linked evidence, and the witness photo at the end takes the car off you for good.

<img src="docs/gifs/clean-slate.webp" alt="A full run that ends in CLEAN SLATE" width="100%">

### Messing with the proof stamps: TAMPERING CHARGE

Black out the stamps instead of the evidence and suspicion climbs with each one. Two files in, it maxes and the
run ends at once with a tampering charge.

<img src="docs/gifs/tampering.webp" alt="Blacking out the proof stamps until suspicion maxes out" width="100%">

### Walking away: STILL WANTED

Clear the first two files, including the car, then walk away from the rest. The car's heat moved to the witness
photo, so it is still on the file, and the run ends at four stars.

<img src="docs/gifs/still-wanted.webp" alt="Clearing two files and walking away: still wanted at four stars" width="100%">

### Running out the clock: BUSTED

Do nothing and the clock expires. Every file goes to the archive untouched: six stars. (This one runs on a
shortened clock, `/?clock=22`, so it does not take five minutes.)

<img src="docs/gifs/busted.webp" alt="Letting the clock run out: busted at six stars" width="100%">

## The idea

Every exhibit is a piece of evidence with three kinds of region:

- **Targets** are what identifies you: a face, a plate, a name, a car. Hide one and **heat** drops.
- **Proof stamps** (the code calls them integrity seals) show the file is genuine: a timecode, a camera ID,
  a custody hash, a channel logo. Touch one and **suspicion** rises.
- **Collateral** is everything else. Change too much of the frame and suspicion rises.

Heat starts at 100. Clear it to 5 or below without pushing suspicion to 40 and you reach **CLEAN SLATE**:
zero stars, you were never there. Push suspicion to 100 and the run ends immediately with a new felony. Run
out the clock with the evidence untouched and every file goes to the archive: still six stars, and you are busted.

There is one twist. Hiding the car in the traffic-camera capture is what makes it incriminating in the
witness photo: its heat **transfers** to that exhibit instead of disappearing, and you only remove it by
clearing the witness photo too.

## How the React Image Editor is used

The editor is not decoration; the whole game reads its output.

- **Locked-down toolset.** Crop, resize, filter and frame are switched off, because each would change the
  output dimensions or write pixels everywhere and break the comparison against the original. Draw, shapes,
  stickers and text stay on, renamed for the fiction: **Scribble**, **Blackout**, **Stickers**, **Write**, with
  the save button renamed **SAVE FILE**. It uses the dark theme and is docked left so it reads as a
  module of the terminal.
- **Options at module scope.** The options object is a module-level constant. Deeply-equal options objects
  can still produce different keys and force a full remount, which destroys the canvas and the undo history
  ([Unlayer issue #31](https://github.com/unlayer/react-image-editor/issues/31)), so one stable reference is
  passed every time.
- **Scoring the saved file, not the drawing.** On save, the game compares the returned image with the exact
  frame the player was given. It never inspects _what_ was drawn, only _where_ pixels changed, using the
  largest per-channel difference so a colour swap at equal brightness still counts.
- **Version pinned.** The editor bundle is fetched from a versioned CDN URL. Unpinned, "latest" moves
  whenever Unlayer ships and would silently change the export the scorer is calibrated on. The loader
  memoises its first `load()` call, so the pin is applied at boot, and the app logs an error if the loader
  ever falls forward to a different build.

### What testing the editor turned up

![The calibration harness: a redaction over the face, saved through the editor and scored](docs/screenshots/editor-redaction.jpg)

_The calibration harness (`?tracer`) after a black rectangle was dragged over the suspect's face and committed.
The panel is the scorer's readout for that saved file: the `face` target is 88% changed, both integrity seals
are untouched._

- **`onSave` returns JPEG, not PNG.** An untouched save is therefore not pixel-identical to the input, and
  the noise differs by frame: the crisp broadcast graphics ring hardest.
- **One global threshold does not work.** At the starting value, an untouched news frame scored one of its
  seals over the breach line, so a player who changed nothing would be charged. Raising the threshold fixed
  that but then gave only about half credit for _fully_ covering a dark target, because black over
  near-black barely changes. The threshold is now set per exhibit from 77 real-editor test runs (drags,
  brush strokes, translucent overlays, seal nicks, whole-frame blackouts) across the CCTV, traffic camera,
  police report, news broadcast and witness photo.
- **Seals get a stricter threshold than targets.** The two mistakes are not symmetric: under-crediting a
  fully opaque edit is unfair to the player, but charging a seal breach for an edit that never touched it is
  worse. The news broadcast needs a sensitive threshold for its cream-on-navy strap but a robust one for its
  crisp white-on-red channel bug, so seals can use their own value (0.002 untouched cover at 48, against
  0.034 at the target threshold of 32, with the breach line at 0.05).
- **Known limit.** Scoring by how much pixels changed cannot tell a readable translucent overlay from an
  opaque one, so a 50% overlay can still earn credit. The rule the player is given is: cover it opaquely.
- **Loading is handled.** If the editor's CDN is blocked or slow, the player gets a clear screen with Try
  again and Skip this exhibit instead of a spinner, the clock stays held, and a retry goes through the same
  version-pinned loader so a recovery cannot change the export the scorer is calibrated on.

## The evidence

All five exhibits are drawn on a canvas at runtime. There are no image files and no sourced artwork of any kind: no Rockstar artwork and no
captured game footage, so nothing is sourced. Each generator returns the picture together with the exact rectangles of
its targets and seals, drawn by the same code that painted them, so regions are known rather than detected.

<table>
  <tr>
    <td><img src="docs/screenshots/01-cctv.jpg" alt="Exhibit 01: CCTV still"><br><sub>01 · CCTV still</sub></td>
    <td><img src="docs/screenshots/02-traffic-cam.jpg" alt="Exhibit 02: traffic camera"><br><sub>02 · ANPR traffic cam</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/04-news-broadcast.jpg" alt="Exhibit 04: news broadcast"><br><sub>04 · News broadcast</sub></td>
    <td><img src="docs/screenshots/03-police-report.jpg" alt="Exhibit 03: police report" width="50%"><br><sub>03 · Police report</sub></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/05-witness-photo.jpg" alt="Exhibit 05: witness photo" width="50%"><br><sub>05 · Witness photo (same car as 02)</sub></td>
    <td></td>
  </tr>
</table>

## Scoring

```
cover(group) = changed pixels in the union of the group's rects / area of the union
credit(c)    = 0 below 0.40, linear to 1 at 0.75
credit       = MIN over a target's groups of credit(cover(group))
heat        -= normalisedWeight * credit

seal breach  : any rect of a seal with cover > 0.05   -> +30 suspicion, once per seal
collateral   : changed pixels outside every target / pixels outside
               if > 0.30 -> += (c - 0.30) * 150
```

Weights are normalised over the exhibits actually shipped, so a perfect run always reaches zero heat. A
target's rects are grouped: the fragments of one car body are unioned (so a thin sliver cannot veto the
whole car), but the witness photo's car plate is its own group, because a legible plate is a separate clue.

The endings resolve in order: **Tampering** (suspicion ≥ 100), **CLEAN SLATE** (heat ≤ 5 and suspicion < 40),
**Busted** (internally `SYNCED`: heat above 60 and either the clock expired or nothing changed at all, six stars) and **Still wanted** (internally `PARTIAL`: 1–5 stars from remaining heat).
A save and a timeout can never score an exhibit twice, and a save already in flight beats the clock.

## Run it

```bash
npm install
npm run dev      # the game at http://localhost:5173
npm test         # 53 tests for the game logic, no browser needed
npm run build    # typecheck and production build
```

Handy URLs while developing:

- `/?clock=15` shortens the five-minute clock to 15 seconds, to see the timeout ending.
- `/?tracer` opens the calibration harness. `/?frame=1` to `/?frame=5` loads a specific exhibit in it: press
  **SAVE FILE** with no edits to measure the export noise for that frame, or draw an edit and read the
  per-region coverage.

## Project layout

```
src/
  frames/    sensor.ts, evidence.ts   the five procedural generators and the camera-sensor pipeline
  scoring/   diff.ts                  pixel diff on a fixed canvas
             score.ts                 credit, group cover, breach and collateral rules
             measure.ts               compare a saved image with the original, per region
             calibration.ts           editor version pin, per-exhibit thresholds, measured noise floors
  game/      case.ts                  exhibits, weights, the car chain, region grouping, frame checks
             reducer.ts               BOOT / BRIEF / EDIT / ANALYSIS / VERDICT state machine
             game.test.ts             tests for the budget, the chain, suspicion, endings, exactly-once
  ui/        Editor.tsx               the editor wrapper with module-scope options
             preloadEditor.ts         pinned, early load of the editor bundle
             Chrome.tsx               the HUD: exhibit counter, clock, wanted stars, tampering risk
             Outlines.tsx             region outlines drawn over an exhibit
             copy.ts                  the handler's text
             screens/                 Boot, Brief, Edit, Analysis, Verdict
             vice/                    the Vice City backdrop, glitch, stars, sirens, wipe, typing
             Tracer.tsx               the calibration harness
```

Built with Vite, React 18, TypeScript and Tailwind v4, with `@unlayer/react-image-editor` for editing and
`motion` for the animation. It is entirely client-side: no backend, no database.

## Roadmap

- [x] Evidence generators, editor integration, pixel scoring and calibration
- [x] Game state machine with heat, suspicion, the car chain and all four endings
- [x] Game screens: boot, brief, edit with the clock, analysis, verdict
- [x] Police report and news broadcast calibrated and added to the run
- [x] A modern, readable look, and reliable editor loading with a way out
- [x] Deployed on Vercel, with recorded playthroughs of every ending

## Disclaimer

An unofficial fan project inspired by the setting of GTA VI. It is not affiliated with or endorsed by
Rockstar Games or Take-Two Interactive. Every visual is generated by code at runtime, and all brands in the
game are invented.
