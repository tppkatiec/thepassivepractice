# References — existing site styles

Drop reference material here so Claude's designer and I can match what she already has live.

## What's most useful

| File | What to put in it |
|---|---|
| `kajabi-site.css` | Pasted/exported CSS from her Kajabi site |
| `kajabi-screenshot-*.png` | Screenshots of key pages (home, sales page, thank-you) |
| `existing-site.url` | A plain text file with the live URL(s) |
| any `.html` | Full-page HTML saves if easy to export |

## How this gets used
- I'll read the CSS to extract any existing tokens (spacing rhythm, radii, hover states) and reconcile them with the system in `src/`.
- Anything that's already working visually on the Kajabi site gets preserved; anything inconsistent gets flagged.
- **This folder is reference only** — nothing here is imported into the design system. It's source material.
