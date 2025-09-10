---
hide_title: true
---
# Experiences

Load and render personalized experiences in your UI.

Basic usage

```tsx
const { loadExperience } = useNova();

await loadExperience("landing");
const exp = useNovaExperience<{ featureFlag: boolean }>("landing");

if (exp.loaded && exp.objects) {
  // render based on exp.objects.featureFlag
}
```

Hooks convenience

- `useNovaExperience<T>(experienceName: string)` returns `{ objects: T | null; loaded: boolean; loading: boolean; error: string | null; load: () => Promise<void>; get: () => Promise<void> }`.
