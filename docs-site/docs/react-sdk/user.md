## User lifecycle (setUser, profiles)

Your external `userId` plus a flexible `userProfile` (key-value). Rules like segments and personalisations are evaluated against these attributes.

### Methods

- `setUser(user: { userId: string; userProfile: Record<string, any> }) => Promise<void>`
  - Creates/updates a user; stores Nova user id internally.
- `updateUserProfile(userProfile: Record<string, any>) => Promise<void>`
  - Merges locally; persists to backend.
