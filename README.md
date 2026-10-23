# Gym 2.0

Version 2.0.3

A mobile-first **Progressive Web App** for a 6-day gym week: it shows what to train each day, how to do every exercise (animation, real photos and video tutorials), logs every set, counts calories and protein per meal, tracks body weight towards a target, and keeps **photo-verified attendance**.

Works offline once installed. No backend: all data (including photos) stays on the phone.

The successor to [Gym Routine](https://github.com/Rithishgit69/gym-routine), with a new design, a fixed weekday split and two new tabs (Macros, Weight).

## Features

**Workout (Mon–Sat)**
- Six day tabs. The app opens on today's weekday; Sunday is rest.

  | Day | Focus |
  |---|---|
  | Monday | Shoulders + Legs |
  | Tuesday | Chest + Triceps |
  | Wednesday | Back + Biceps |
  | Thursday | Legs + Shoulders |
  | Friday | Chest + Triceps |
  | Saturday | Back + Biceps |

- Exercises grouped by muscle, with sets × reps and rest times (60–90 s on isolation sets, 2–3 min on presses)
- Tap an exercise to see **the animation and the real start ↔ finish photo loop together**, plus a one-tap **Watch video tutorials** button, step-by-step instructions, key cues and common mistakes
- "Machine busy?" swap options for every exercise
- Warm-up for the day and ramp-up sets for the main lift
- Set logger with last-session numbers to beat, rest timer, and double-progression hints (hit the top of the rep range on every set → add weight)
- Lat pulldown is logged as 2 + 2 sets across two bars

**Macros**
- Daily target for calories and protein (default 2,750 kcal / 120 g, editable)
- Add items to Breakfast, Lunch and Dinner (calories and protein per serving, × quantity)
- Live "kcal left" counter and progress bars for calories and protein
- When all three meals are in, a **Day complete** report: total kcal and protein, % of target, per-meal split and a short verdict
- Foods are remembered: tap a saved food to fill it in
- Browse previous days; 7-day averages and days on target

**Weight**
- Log your weight once a day (edit or delete any day)
- Target weight at the top: kg to go, % of the way from your starting weight, ring
- Monthly report: start → end change, **up days / down days / same**, days logged, average, lowest / highest, chart, daily log with day-to-day changes
- A finished month's report locks in as complete; a banner points to it in the first week of the next month
- All-months summary

**Photo-verified attendance** (same as Gym Routine)
- Check in only via the live in-app camera; each photo is stamped with date and time
- Animated calendar: ✓ checked in, ✕ missed, moon = rest day
- Sundays are rest days automatically (switchable in Settings); mark any other day as rest
- Streaks, monthly attendance %, photo gallery, monthly ZIP download and auto-erase of full-size photos 7 days after downloading a finished month
- Monthly 30-second gym edit videos made on the phone
- One tap in Settings copies attendance and photos from the original Gym Routine app on the same phone

**Offline & backup**
- Installable from Chrome via *Add to Home screen* / *Install app*
- Photos and animations load from GitHub when online and from an on-device cache when offline ("Save all")
- JSON backup export/import (attendance, set logs, food logs, weigh-ins, targets, settings)

## Tech

| Area | Implementation |
|---|---|
| UI | Vanilla JavaScript, HTML, CSS. No framework, no dependencies, no build step. |
| Storage | IndexedDB (`gym-2.0` database, separate from Gym Routine) |
| Offline | Service worker: stale-while-revalidate app shell, network-first media with on-device fallback; caches are prefixed `g2-` so both apps can live on the same origin |
| Camera | `getUserMedia` → Canvas (mirror, resize, timestamp) → JPEG blobs + thumbnails |
| Archives | Hand-written ZIP writer with CRC-32 (`js/zip.js`) |
| Video edits | `js/edit.js`: canvas templates + Web Audio synth → `MediaRecorder` |
| Design | "Midnight Ember": deep navy + ember orange, Inter throughout (bundled, OFL) |
| Data pipeline | `tools/build_exercises.py` generates `js/exercises.js` from two open datasets (pinned commits); `tools/photo_map.json` maps exercises to public-domain photos |

```
index.html            app shell
css/app.css           styles
js/program.js         Mon–Sat program, swaps, progression rules, coach notes
js/exercises.js       generated exercise data (names, muscles, steps, media paths)
js/db.js              IndexedDB wrapper (+ read-only import from Gym Routine)
js/app.js             views: workout, attendance, macros, weight, progress, settings
js/zip.js             ZIP writer
js/edit.js            monthly gym edit generator
sw.js                 service worker
tools/                data build script and photo map
```

## Run locally

```bash
python3 -m http.server 5174
```

Open http://localhost:5174. The camera works on `localhost` or HTTPS only. The service worker is skipped on localhost unless you add `?sw=1`.

To rebuild the exercise data after changing `js/program.js`:

```bash
python3 tools/build_exercises.py path/to/exercises.json path/to/free-exercise-db.json
```
