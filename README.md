# KURO

**English** · [繁體中文](./README.zh-TW.md)

> A **cursor pet playground** — a little black cat (and friends) that follows your pointer with hand-drawn sprite states

<p align="center">
  <img src="./docs/cover.png" alt="KURO cursor pet playground cover" width="560" />
</p>

<p align="center">
  <a href="https://github.com/ReiKama414/kuro">Star</a>
  ·
  <a href="https://reikama414.vercel.app/">Portfolio</a>
  ·
  <a href="#quick-start">Quick start</a>
  ·
  <a href="#license--rights">License</a>
</p>

---

## Why

A small interactive demo for a cursor-following pet: smooth motion, facing, idle rest, blink, pet, and jump — all driven by sprite strips, not CSS nudges of a single still

## Highlights

- **Follow the pointer** — exponential smoothing with delta-time so speed stays consistent across refresh rates
- **Thirteen clips** — idle, blink, walk ×4, run ×2, sit, lay, sleep, jump, pet
- **Five characters** — cat (KURO), seal, raccoon, dachshund, hamster
- **Playground HUD** — live state, speed, facing, and pet count
- **State machine board** — preview strips highlight the clip currently playing

## Tech stack

| Area | Choice |
| --- | --- |
| App | React · Vite |
| Render | Canvas 2D sprite strips |
| Type / UI | Archivo · JetBrains Mono (Google Fonts) |

## Quick start

Node.js 20+ recommended.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

Production build:

```bash
npm run build
npm run preview
```

Static output lands in `dist/`. Sprite art is served from `/assets/sprites/…`.

## Controls

| Action | Result |
| --- | --- |
| Move pointer inside the stage | The pet follows |
| Click near the pet | Pet reaction |
| Double-click | Jump |
| Leave the stage | Motion settles; pet stays in bounds |
| Species pills | Switch character and strip set |

## Project structure

| Path | Role |
| --- | --- |
| `src/Kuro.jsx` | Page UI, playground loop, state machine |
| `src/main.jsx` | React entry |
| `src/index.css` | Base styles and nav / CTA helpers |
| `assets/sprites/{species}/` | Per-clip PNG strips (`idle`, `walk_right`, …) |
| `assets/sprites/counts.json` | Frame counts per species |
| `uploads/` | Working reference sheets (not required at runtime) |

## Third-party notices

| Item | Notes |
| --- | --- |
| React · React DOM · Vite | Upstream licenses apply to those packages only |
| Archivo · JetBrains Mono | Font licenses from their distributors |

Project code, branding (KURO), copy, and sprite / sheet assets in this repo remain under the project license below — package licenses do **not** re-license those assets.

## Links

| | |
| --- | --- |
| Repository | [kuro](https://github.com/ReiKama414/kuro) |
| Author | [ReiKama414](https://github.com/ReiKama414) |
| Portfolio | [Personal site](https://reikama414.vercel.app/) |
| License text | [LICENSE](./LICENSE) |

## License / rights

Copyright (c) ReiKama414. All rights reserved.

This project is provided for personal viewing and learning only. Without the copyright holder’s written consent, you may not use, copy, modify, distribute, or incorporate it into other projects (commercial or non-commercial).

- [GitHub](https://github.com/ReiKama414/kuro)
- [Personal site](https://reikama414.vercel.app/)
- [Full license text](./LICENSE)

---

<sub>KURO · Cursor pet demo · ReiKama414 · 2026</sub>
