# Anthem CSS Theme

Derived from Anthem cockpit visual design — dark background with cyan, green, and magenta accent colors.

---

## Design Tokens

```css
/* Tailwind 4 @theme block — variable names use --color-anthem-* prefix */
/* In Tailwind utilities: bg-anthem-bg-primary, text-anthem-cyan, etc. */
@theme {
  /* Background layers */
  --color-anthem-bg-primary: #0a0e17;      /* Main cockpit background */
  --color-anthem-bg-secondary: #111827;    /* Panel background */
  --color-anthem-bg-tertiary: #1a2235;     /* Card/elevated surface */
  --color-anthem-bg-input: #0d1321;        /* Input field background */

  /* Primary accent — Cyan (active elements, selected state) */
  --color-anthem-cyan: #00d4ff;
  --color-anthem-cyan-dim: #0891b2;

  /* Secondary accent — Green (positive/confirmed state) */
  --color-anthem-green: #22c55e;
  --color-anthem-green-dim: #16a34a;

  /* Tertiary accent — Magenta (warnings, attention) */
  --color-anthem-magenta: #e040fb;
  --color-anthem-magenta-dim: #ab47bc;

  /* Alert — Amber (cautions) */
  --color-anthem-amber: #f59e0b;

  /* Alert — Red (warnings) */
  --color-anthem-red: #ef4444;

  /* Text hierarchy */
  --color-anthem-text-primary: #e2e8f0;    /* Primary text */
  --color-anthem-text-secondary: #94a3b8;  /* Secondary/label text */
  --color-anthem-text-muted: #475569;      /* Disabled/inactive text */

  /* Borders */
  --color-anthem-border: #1e293b;
  --color-anthem-border-active: #00d4ff;

  /* Typography */
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-sans: 'Inter', system-ui, sans-serif;
}

/* Additional non-theme CSS custom properties */
:root {
  --anthem-cyan-glow: rgba(0, 212, 255, 0.15);
  --anthem-touch-min: 44px;          /* Minimum touch target size */
}
```

---

## Color Palette Summary

| Role | Color | Token | Usage |
|------|-------|-------|-------|
| Active/Selected | Cyan `#00d4ff` | `anthem-cyan` | Mode buttons, selected tabs, active borders |
| Confirmed/Correct | Green `#22c55e` | `anthem-green` | Success states, confirmed readbacks |
| Attention/Highlight | Magenta `#e040fb` | `anthem-magenta` | PilotPredict suggestions, warnings |
| Caution | Amber `#f59e0b` | `anthem-amber` | Timer warnings, elevated cognitive load |
| Warning/Error | Red `#ef4444` | `anthem-red` | Errors, missed traps, critical alerts |

---

## Design Principles

- **Dark-first:** All backgrounds are dark navy/charcoal. No light mode.
- **High contrast text:** Primary text is near-white on dark backgrounds.
- **Color-coded states:** Cyan = active/selected, Green = confirmed/correct, Magenta = attention/highlight, Amber = caution, Red = warning/error.
- **Touch-optimized:** All interactive elements minimum 44x44px. Generous padding. Ripple feedback on touch.
- **Monospace data:** Frequencies, altitudes, waypoint IDs displayed in monospace font. Labels in sans-serif.
- **Glow effects:** Active elements use subtle cyan glow (box-shadow) to simulate avionics display aesthetic.
