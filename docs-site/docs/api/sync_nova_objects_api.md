# Sync Nova Objects API

Authentication
--------------
All client API calls require:
- Base URL: `${NOVA_BASE_URL}`
- SDK API Key: `${NOVA_SDK_KEY}` as header `Authorization: Bearer ${NOVA_SDK_KEY}`

Base URL: `/api/v1/feature-flags`

## Sync Nova Objects

**Endpoint**: `POST /sync-nova-objects/`
**Description**: Create or update feature flags and experiences in bulk from client-side definitions.

### Request Body
```json
{
  "objects": {
    "object_name": {
      "type": "string",
      "keys": {
        "key1": { "type": "string", "description": "desc", "default": "val" }
      }
    }
  },
  "experiences": {
    "exp_name": {
      "description": "Exp desc",
      "objects": { "object_name": true }
    }
  }
}
```

- `objects`: Map of feature flags (objects) with key schemas.
- `experiences`: Map of experiences tying to objects with boolean flag to include.

### Response (200 OK)
```json
{
  "success": true,
  "objects_processed": 1,
  "objects_created": 1,
  "objects_updated": 0,
  "objects_skipped": 0,
  "experiences_processed": 1,
  "experiences_created": 1,
  "experiences_updated": 0,
  "experiences_skipped": 0,
  "experience_features_created": 1,
  "dashboard_url": "https://dashboard.nova.com/objects",
  "message": "Processed 1 objects and 1 experiences successfully",
  "details": [
    { "object_name":"object_name", "action":"created", "flag_id":"uuid", "message":"Created feature flag with default variant" },
    { "experience_name":"exp_name", "action":"created", "experience_id":"uuid", "experience_features_created":1, "message":"Created experience with 1 feature connections" }
  ]
}
```
