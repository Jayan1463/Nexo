# API Reference

All ingestion requests use JSON and require either:

```text
Authorization: Bearer <api-key>
```

or:

```text
X-Nexo-API-Key: <api-key>
```

## POST `/api/v1/telemetry`

Payload:

```json
{
  "serverId": "server-id",
  "timestamp": "2026-09-17T00:00:00.000Z",
  "cpu": 42,
  "memory": 61,
  "disk": 73,
  "network": 128,
  "uptime": 90000,
  "processes": [],
  "ports": [],
  "services": []
}
```

## POST `/api/v1/logs`

Payload:

```json
{
  "level": "info",
  "service": "api",
  "message": "request completed",
  "timestamp": "2026-09-17T00:00:00.000Z"
}
```

Invalid, missing, or revoked keys return 401.
