# The Private Practice Pro — Design System

A frontend-focused brand + component library for **The Private Practice Pro (TPPP)**. Point Claude's designer (or Canva / any code-capable design tool) at this folder.

## What's here

```
private-practice-pro/
├── README.md              ← you are here
├── brand/
│   ├── guidelines.md      ← personality, do/don't, usage rules
│   └── voice.pdf          ← (upload your voice doc here)
├── src/
│   ├── tokens.json        ← design tokens, machine-readable
│   ├── tokens.css         ← tokens as CSS custom properties
│   ├── typography.css     ← type scale + font imports
│   └── base.css           ← reset + base element styles
├── components/
│   ├── button.html
│   ├── card.html
│   ├── hero.html
│   ├── nav.html
│   └── form.html
└── index.html             ← live preview of the whole system
```

## Quick reference

**Colors**
| Token | Hex | Role |
|---|---|---|
| `--color-bg` | `#6772c3` | Primary background (page canvas) |
| `--color-primary` | `#8890cf` | Primary brand color (most common on-bg element) |
| `--color-ink` | `#3a506a` | Deep text / grounding |
| `--color-surface` | `#fafafb` | Off-white surfaces, cards, body text on dark bg |
| `--color-accent-lime` | `#daff00` | Electric pop — CTAs, highlights, attention only |
| `--color-accent-blush` | `#dcbed7` | Soft pop — gentle emphasis, secondary accents |

Use `--color-primary` + `--color-bg` for ~80% of any composition. Lime and blush are **pops** — reserve for focus points.

**Type stack**
- **Headers** — Instrument Serif, tracked tight (negative letter-spacing)
- **Subheaders** — Clash Display, bold, UPPERCASE, wide tracking
- **Body** — Inter, regular, normal tracking

## Using this with Claude's design system

1. Push this folder to GitHub (public).
2. In Claude's design system intake, paste either:
   - the repo root: `https://github.com/tppkatiec/thepassivepractice`
   - or this subfolder directly: `https://github.com/tppkatiec/thepassivepractice/tree/main/private-practice-pro`
3. Claude will copy selected files. The frontend-focused subfolder approach (this one) is recommended.

## Using this with any other tool
- **Canva / Figma** — import `src/tokens.json` for tokens; use `index.html` as a visual reference.
- **Dev** — `@import "src/tokens.css"` + `"src/typography.css"` in any stylesheet.
