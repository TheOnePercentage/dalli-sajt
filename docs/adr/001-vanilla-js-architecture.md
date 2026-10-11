# ADR 001: Vanilla JavaScript Architecture

## Status
Accepted

## Context
We need to decide on the frontend architecture for the DALLI e-commerce platform. The options considered were:
1. React/Vue/Svelte - Popular frameworks with large ecosystems
2. Vanilla JavaScript with ES Modules - No framework overhead
3. Alpine.js/Petite-Vue - Lightweight reactive libraries
4. HTMX - Hypermedia-driven approach

## Decision
We will use **Vanilla JavaScript with ES Modules** as the primary architecture.

## Rationale

### Performance
- **Zero framework overhead** - No virtual DOM, no reconciliation, no framework runtime
- **Bundle size** - ~50KB gzipped vs 100KB+ for React/Vue
- **Load time** - Faster initial paint, better Core Web Vitals
- **Memory** - Lower memory footprint

### Maintainability
- **No build step required** - ES modules work natively in browser
- **No transpilation** - Modern JS runs everywhere
- **Explicit dependencies** - Clear import/export statements
- **Easy debugging** - Stack traces point to actual code

### Developer Experience
- **No framework lock-in** - Standard web APIs
- **Explicit state management** - Signals/stores are explicit
- **Easy onboarding** - Standard JS knowledge sufficient
- **Framework migration path** - Components are framework-agnostic

### Ecosystem
- **Web Components** - Native encapsulation when needed
- **ES Modules** - Native module system
- **Import Maps** - Native dependency resolution
- **Import Attributes** - Type-safe imports

## Consequences

### Positive
- Minimal bundle size
- Excellent performance
- Full control over rendering
- No framework migrations ever
- Easy to optimize

### Negative
- More boilerplate for complex state
- No built-in reactivity (manual)
- No component lifecycle hooks
- Manual DOM management
- Less community components

## Mitigation
- Custom lightweight state management (signals)
- Component library with common patterns
- Utility functions for common operations
- Web Components for complex encapsulation

## Implementation Notes

### Module Structure
```
admin-new/js/
├── app.js                 # Main entry point
├── components/
│   ├── ui/                # Reusable UI components
│   │   ├── Button.js
│   │   ├── FormControl.js
│   │   ├── Card.js
│   │   ├── Navigation.js
│   │   ├── Feedback.js
│   │   ├── DataDisplay.js
│   │   ├── AdminComponents.js
│   │   ├── AnalyticsDashboard.js
│   │   ├── MarketingSocial.js
│   │   └── UtilityLayout.js
│   └── index.js           # Barrel exports
├── utils/                 # Utility functions
├── store/                 # State management
├── api/                   # API clients
└── components/            # Legacy components
```

### Module Pattern
```javascript
// Component pattern
export class ComponentName {
  constructor(element, options = {}) {
    this.element = element;
    this.options = { ...defaultOptions, ...options };
    this.init();
  }

  init() { /* ... */ }
  destroy() { /* ... */ }
}

// Factory function
export function createComponent(options) {
  const el = document.createElement('div');
  return new ComponentName(el, options);
}

// Auto-initialization
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ComponentName.init());
} else {
  ComponentName.init();
}

// Global export
if (typeof window !== 'undefined') {
  window.ComponentName = ComponentName;
}
```

### State Management (Signals)
```javascript
const createSignal = (initial) => {
  let value = initial;
  const subscribers = new Set();
  return {
    get: () => value,
    set: (newVal) => {
      value = typeof newVal === 'function' ? newVal(value) : newVal;
      subscribers.forEach(fn => fn(value));
    },
    subscribe: (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    }
  };
};
```

## Migration Path
If framework needed in future:
1. Components are framework-agnostic
2. Can wrap in React/Vue/Svelte wrappers
2. State management is portable
3. Styles are CSS custom properties

## References
- [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
- [ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Import Maps](https://github.com/WICG/import-maps)
- [Signals](https://github.com/preactjs/signals)