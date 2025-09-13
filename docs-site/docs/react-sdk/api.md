---
hide_title: true
---
# SDK API reference

```ts
// Provider and context
export { NovaProvider, NovaContext };

// Hooks
export { useNova, useNovaExperience, useNovaInit };

// Types
export type {
	NovaConfig,
	NovaUser,
	SetNovaUser,
	UserProfile,
	NovaObject,
	NovaObjectConfig,
	NovaExperience,
	NovaExperiences,
	NovaState,
	NovaContextValue,
};
```

### Config

```ts
interface NovaConfig {
	apiKey: string;
	apiEndpoint: string;
	registry: {
		objects: {
			[objectName: string]: {
				type: string;
				keys: {
					[keyName: string]: {
						type: string;
						description: string;
						default: any;
					};
				};
			};
		};
		experiences: {
			[experienceName: string]: {
				description: string;
				objects: { [objectName: string]: boolean };
			};
		};
	};
}
```

### Context methods (via `useNova`)

- `setUser(user: { userId: string; userProfile: Record<string, any> }) => Promise<void>`
- `updateUserProfile(userProfile: Record<string, any>) => Promise<void>`
- `loadExperience(name: string) => Promise<void>`
- `loadExperiences(names: string[] | null) => Promise<void>`
- `loadAllExperiences() => Promise<void>`
- `isExperienceLoaded(name: string) => boolean`
- `readExperience<T>(name: string) => T  null`
- `getExperience<T>(name: string) => Promise<T  null>`
- `trackEvent(eventName: string, eventData?: Record<string, any>) => Promise<void>`
