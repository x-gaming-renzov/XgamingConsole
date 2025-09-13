# Events API

Authentication
--------------
All client API calls require:
- Base URL: `${NOVA_BASE_URL}`
- SDK API Key: `${NOVA_SDK_KEY}` as header `Authorization: Bearer ${NOVA_SDK_KEY}`

Base URL: `/api/v1/metrics`

## Track Event

**Endpoint**: `POST /track-event/`
**Description**: Enqueue an event for asynchronous processing and storage.

### Request Body
```json
{
  "user_id": "string",
  "event_name": "string",
  "event_data": {"key1": "value1"},
  "timestamp": "2025-09-10T12:00:00Z"
}
```

- `user_id` (string, required): Identifier of the end user.
- `event_name` (string, required): Name of the event.
- `event_data` (object, optional): Additional event properties.
- `timestamp` (ISO8601 datetime, required): Time when the event occurred.

### Response (200 OK)
```json
{
  "success": true
}
```

### Example
```bash
curl -X POST "${NOVA_BASE_URL}/api/v1/metrics/track-event/" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${NOVA_SDK_KEY}" \
  -d '{
    "user_id":"user123", 
    "event_name":"page_view", 
    "event_data":{"page":"home"}, 
    "timestamp":"2025-09-10T12:00:00Z"
  }'
```
