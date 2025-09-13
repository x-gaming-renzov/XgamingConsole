# User Experience API

Authentication
--------------
All client API calls require:
- Base URL: `${NOVA_BASE_URL}`
- SDK API Key: `${NOVA_SDK_KEY}` as header `Authorization: Bearer ${NOVA_SDK_KEY}`

Base URL: `/api/v1/user-experience`

## Get Experience for Single Feature

**Endpoint**: `POST /get-experience/`
**Description**: Retrieve variant assignment for one experience.

### Request Body
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "experience_name": "new_checkout_flow",
  "payload": { "key":"value" }
}
```

### Response (200 OK)
```json
{
  "experience_id": "uuid",
  "personalisation_id": "uuid|null",
  "personalisation_name": "string|null",
  "experience_variant_id": "uuid|null",
  "features": {
    "feature_name": {
      "feature_id":"string",
      "feature_name":"string",
      "variant_id":"string|null",
      "variant_name":"string|null",
      "config": { "k":"v" }
    }
  },
  "evaluation_reason": "string",
  "assigned_at": "2025-09-10T12:00:00Z"
}
```

### Example
```bash
curl -X POST "${NOVA_BASE_URL}/api/v1/user-experience/get-experience/" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${NOVA_SDK_KEY}" \
  -d '{
    "user_id":"550e8400-e29b-41d4-a716-446655440000", 
    "experience_name":"new_checkout_flow", 
    "payload":{}
  }'
```

## Get Multiple Experiences

**Endpoint**: `POST /get-experiences/`
**Description**: Retrieve assignments for specified experiences.

### Request Body
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "experience_names": ["exp1","exp2"],
  "payload": { }
}
```

### Example
```bash
curl -X POST "${NOVA_BASE_URL}/api/v1/user-experience/get-experiences/" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${NOVA_SDK_KEY}" \
  -d '{
    "user_id":"550e8400-e29b-41d4-a716-446655440000", 
    "experience_names":["exp1","exp2"], 
    "payload":{}
  }'
```
