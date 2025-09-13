# Users API

Authentication
--------------
All client API calls require:
- Base URL: `${NOVA_BASE_URL}`
- SDK API Key: `${NOVA_SDK_KEY}` as header `Authorization: Bearer ${NOVA_SDK_KEY}`

Base URL: `/api/v1/users`

## Create or Update User

**Endpoint**: `POST /`
**Description**: Create a new user or update an existing user's profile.

### Request Body
```json
{
  "user_id": "string",
  "user_profile": { "key1": "value1" }
}
```

### Response (200 OK)
```json
{
  "nova_user_id": "uuid",
  "status": "created" | "updated"
}
```

### Example
```bash
curl -X POST "${NOVA_BASE_URL}/api/v1/users/" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${NOVA_SDK_KEY}" \
  -d '{
    "user_id":"user123", 
    "user_profile": { "plan":"free" }
  }'
```
