# Fonts — drop files here

Self-hosted font files for The Private Practice Pro. Put uploads directly in this folder.

## Expected filenames (so `typography.css` picks them up without edits)

| Role | Preferred file | Alt formats |
|---|---|---|
| **Instrument Serif — Regular** | `InstrumentSerif-Regular.woff2` | `.woff`, `.ttf` |
| **Instrument Serif — Italic** | `InstrumentSerif-Italic.woff2` | `.woff`, `.ttf` |
| **Clash Display — Bold (700)** | `ClashDisplay-Bold.woff2` | `.woff`, `.otf` |
| **Clash Display — Semibold (600)** (optional) | `ClashDisplay-Semibold.woff2` | |
| **Inter — Variable** | `Inter-VariableFont.woff2` | or `Inter-Regular.woff2` + `Inter-Bold.woff2` |

## If you don't have files yet
Keep this folder empty — `typography.css` already loads these from Google Fonts + Fontshare CDN, so the system works as-is. Self-hosting is only useful for performance or offline design work.

## After uploading
Tell me and I'll swap `typography.css` from CDN imports to local `@font-face` rules pointing at these files.
