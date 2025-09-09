## Provider setup

Wrap your app with `NovaProvider` and pass configuration.

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

Config fields

- `apiKey`: SDK API key for authentication
- `apiEndpoint`: Nova Manager base URL
- `registry`: your objects/experiences definition
