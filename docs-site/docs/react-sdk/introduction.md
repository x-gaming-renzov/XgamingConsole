# Introduction

A comprehensive, practical guide to integrating Nova into your React or React Native app. Start here, then follow the chapters in order.

### Who is this for?

- Frontend engineers integrating personalization and experimentation
- Teams adding runtime experience evaluation and analytics

### Prerequisites

- You have a Nova SDK API key
- Nova Manager API is reachable (apiEndpoint)
- Basic React/TypeScript familiarity

### Syllabus

1. Installation: [installation](./installation.md)
2. Core concepts: [core concepts](./core-concepts.md)
3. Provider setup: [provider](./provider.md)
4. User lifecycle (setUser, profiles): [user](./user.md)
5. Experiences (load/read/hooks): [experiences](./experiences.md)
6. Events tracking: [events](./events.md)
7. Registry design (objects/experiences): [registry](./registry.md)
8. Advanced patterns (prefetch, RN specifics): [advanced](./advanced.md)
9. Testing/mocking the SDK: [testing](./testing.md)
10. API reference (exports, types): [api](./api.md)
11. Troubleshooting/FAQ: [troubleshooting](./troubleshooting.md)

### Quickstart (10 min)

- Install: `npm i nova-react-sdk`
- Create `nova-objects.json` with at least one experience and object
- Wrap your app in `NovaProvider` with `apiKey`, `apiEndpoint`, `registry`

Example

```tsx
import { NovaProvider } from "nova-react-sdk";
import NovaRegistry from "./nova-objects.json";

<NovaProvider
  config={{
    apiKey: process.env.NOVA_API_KEY!,
    apiEndpoint: process.env.NOVA_API_ENDPOINT!,
    registry: NovaRegistry,
  }}
>
  <App />
</NovaProvider>;
```
