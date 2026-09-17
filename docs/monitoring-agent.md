# Monitoring Agent

The agent lives in `monitoring-agent/` and supports Linux, Windows, and macOS through the `systeminformation` package.

It collects CPU, per-core CPU where available, memory, disk, network, processes, ports, services, uptime, OS, and hostname.

Authentication uses:

```text
X-Nexo-API-Key: <secret>
```

The secret is shown once during key generation. Nexo Cloud stores only a SHA-256 hash.

Failed telemetry is buffered locally and retried with exponential backoff.
