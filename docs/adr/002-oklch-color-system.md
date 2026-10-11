# ADR 002: OKLCH Color System

## Status
Accepted

## Context
We need a color system for the DALLI design system that provides:
- Perceptual uniformity
- Accessibility compliance (WCAG 2.1 AA)
- Dark mode support
- Easy theming
- Programmatic color manipulation

## Decision
Use **OKLCH (Oklab Lightness-Chroma-Hue)** color space for all design tokens.

## Rationale

### Perceptual Uniformity
- **OKLCH** is perceptually uniform - equal numerical changes = equal visual changes
- **HSL/RGB** are not perceptually uniform
- Better for generating color scales programmatically

### Accessibility
- **Lightness (L)** directly correlates with perceived brightness
- Easy to ensure WCAG contrast ratios
- Predictable contrast calculations

### Dark Mode
- Simple light/dark inversion via lightness inversion
- Chroma/hue preserved, only lightness inverted
- Consistent brand colors in both themes

### Programmatic Manipulation
```css
/* Easy color variations */
--color-primary: oklch(0.18 0.02 260);
--color-primary-hover: oklch(0.22 0.03 260);  /* Slightly lighter */
--color-primary-light: oklch(0.92 0.01 260);  /* Very light */
--color-primary-dark: oklch(0.12 0.02 260);   /* Very dark */

/* Automatic dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: oklch(0.92 0.01 260);
    --color-primary-hover: oklch(0.88 0.01 260);
  }
}
```

## Color Palette

### Brand Colors
| Token | OKLCH Value | Description |
|-------|-------------|-------------|
| `--color-primary` | `oklch(0.18 0.02 260)` | Primary brand (dark navy) |
| `--color-accent` | `oklch(0.55 0.22 25)` | Accent (coral red) |
| `--color-crypto` | `oklch(0.7 0.18 70)` | Crypto/bitcoin orange |

### Semantic Colors
| Token | OKLCH Value | Purpose |
|-------|-------------|---------|
| `--color-success` | `oklch(0.6 0.18 145)` | Success states |
| `--color-warning` | `oklch(0.75 0.18 85)` | Warnings |
| `--color-error` | `oklch(0.55 0.22 25)` | Errors |
| `--color-info` | `oklch(0.58 0.2 250)` | Info messages |
| `--color-crypto` | `oklch(0.7 0.18 70)` | Crypto elements |

### Neutrals (Light)
| Token | OKLCH Value |
|-------|-------------|
| `--color-bg` | `oklch(0.985 0.002 260)` |
| `--color-bg-elevated` | `oklch(1 0 0)` |
| `--color-bg-subtle` | `oklch(0.96 0.002 260)` |
| `--color-surface` | `oklch(1 0 0)` |
| `--color-border` | `oklch(0.9 0.005 260)` |
| `--color-text` | `oklch(0.15 0.005 260)` |

### Dark Mode Neutrals
| Token | OKLCH Value |
|-------|-------------|
| `--color-bg` | `oklch(0.08 0.01 260)` |
| `--color-bg-elevated` | `oklch(0.1 0.01 260)` |
| `--color-surface` | `oklch(0.1 0.01 260)` |
| `--color-text` | `oklch(0.95 0.005 260)` |

## Implementation

### CSS Custom Properties
```css
@layer tokens {
  :root {
    /* Brand */
    --color-primary: oklch(0.18 0.02 260);
    --color-accent: oklch(0.55 0.22 25);
    --color-crypto: oklch(0.7 0.18 70);
    
    /* Semantic */
    --color-success: oklch(0.6 0.18 145);
    --color-warning: oklch(0.75 0.18 85);
    --color-error: oklch(0.55 0.22 25);
    --color-info: oklch(0.58 0.2 250);
    --color-crypto: oklch(0.7 0.18 70);
    
    /* Neutrals */
    --color-bg: oklch(0.985 0.002 260);
    --color-text: oklch(0.15 0.005 260);
    /* ... */
  }
  
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --color-bg: oklch(0.08 0.01 260);
      --color-text: oklch(0.95 0.005 260);
      /* ... */
    }
  }
}
```

### JavaScript Color Manipulation
```javascript
// Parse OKLCH
function parseOKLCH(oklch) {
  const match = oklch.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  return { l: +match[1], c: +match[2], h: +match[3] };
}

// Lighten/darken
function lighten(oklch, amount) {
  const { l, c, h } = parseOKLCH(oklch);
  return `oklch(${Math.min(1, l + amount)} ${c} ${h})`;
}

// Generate scales
function generateScale(base, steps = 10) {
  const { l, c, h } = parseOKLCH(base);
  return Array.from({ length: steps }, (_, i) => 
    `oklch(${l - (i * 0.05)} ${c} ${h})`
  );
}
```

## Consequences

### Positive
- Perceptually uniform color system
- Excellent dark mode support
- Accessible by default
- Easy programmatic manipulation
- Future-proof (CSS Color 4)

### Negative
- Browser support (all modern browsers)
- Learning curve for team
- Tooling support varies
- Not supported in older browsers (IE11)

## Migration Path
1. Convert existing hex/rgb to OKLCH
2. Update design tokens
3. Update component styles
3. Test accessibility
4. Update documentation

## References
- [OKLCH Color Space](https://oklch.com/)
- [CSS Color Module Level 4](https://www.w3.org/TR/css-color-4/)
- [OKLCH in CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch)