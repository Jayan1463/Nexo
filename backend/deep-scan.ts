import { activeServerWrite, documentId, endpoint, HttpError, identity, orgRole } from './database';

export default endpoint('POST', async (req, db) => {
  const user = await identity(req);
  const serverId = documentId(req.body?.serverId);
  const lookbackHours = req.body?.lookbackHours ?? 24;
  const serverRef = db.doc(`servers/${serverId}`);
  const serverSnap = await serverRef.get();
  if (!serverSnap.exists || serverSnap.data()?.deletedAt) throw new HttpError(404, 'Server not found');
  const project = await db.doc(`projects/${serverSnap.data()!.projectId}`).get();
  if (!project.exists || project.data()?.lifecycle !== 'active') throw new HttpError(409, 'Project is inactive');
  await orgRole(db, user.uid, documentId(project.data()!.orgId));
      const lookback = Number.isFinite(Number(lookbackHours)) ? Math.min(Math.max(Number(lookbackHours), 1), 168) : 24;
      const since = new Date(Date.now() - lookback * 60 * 60 * 1000);

      const metricsSnap = await serverRef
        .collection("metrics")
        .orderBy("timestamp", "desc")
        .limit(500)
        .get();

      const recentMetrics = metricsSnap.docs
        .map((doc) => doc.data())
        .filter((metric: any) => {
          const ts = new Date(metric.timestamp);
          return !Number.isNaN(ts.getTime()) && ts >= since;
        });

      if (recentMetrics.length === 0) {
        return {
          success: true,
          scan: {
            serverId,
            lookbackHours: lookback,
            scannedPoints: 0,
            anomaliesDetected: 0,
            riskLevel: "none",
            findings: [],
            executedAt: new Date().toISOString(),
          },
        };
      }

      const findings: { type: string; severity: "warning" | "critical"; message: string }[] = [];
      let cpuSpikeCount = 0;
      let memSpikeCount = 0;
      let netSpikeCount = 0;

      for (const metric of recentMetrics) {
        if (metric.cpu >= 95) cpuSpikeCount += 1;
        if (metric.memory >= 92) memSpikeCount += 1;
        if (metric.network >= 900) netSpikeCount += 1;
      }

      if (cpuSpikeCount >= 3) {
        findings.push({
          type: "cpu_spike",
          severity: cpuSpikeCount >= 10 ? "critical" : "warning",
          message: `Detected ${cpuSpikeCount} high CPU spikes in last ${lookback}h`,
        });
      }
      if (memSpikeCount >= 3) {
        findings.push({
          type: "memory_pressure",
          severity: memSpikeCount >= 10 ? "critical" : "warning",
          message: `Detected ${memSpikeCount} memory pressure events in last ${lookback}h`,
        });
      }
      if (netSpikeCount >= 3) {
        findings.push({
          type: "network_surge",
          severity: netSpikeCount >= 10 ? "critical" : "warning",
          message: `Detected ${netSpikeCount} network surge events in last ${lookback}h`,
        });
      }

      const avgCpu = recentMetrics.reduce((sum: number, m: any) => sum + Number(m.cpu || 0), 0) / recentMetrics.length;
      const avgMem = recentMetrics.reduce((sum: number, m: any) => sum + Number(m.memory || 0), 0) / recentMetrics.length;
      const avgNet = recentMetrics.reduce((sum: number, m: any) => sum + Number(m.network || 0), 0) / recentMetrics.length;

      const riskScore = avgCpu * 0.45 + avgMem * 0.45 + Math.min(avgNet / 10, 100) * 0.1 + findings.length * 10;
      const riskLevel = riskScore >= 85 ? "critical" : riskScore >= 60 ? "elevated" : riskScore >= 35 ? "normal" : "none";

      const scanRef = serverRef.collection("deep_scans").doc();
      const scan = {
        id: scanRef.id,
        serverId,
        lookbackHours: lookback,
        scannedPoints: recentMetrics.length,
        anomaliesDetected: findings.length,
        riskLevel,
        findings,
        averages: {
          cpu: Number(avgCpu.toFixed(2)),
          memory: Number(avgMem.toFixed(2)),
          network: Number(avgNet.toFixed(2)),
        },
        executedAt: new Date().toISOString(),
      };
      await activeServerWrite(db, serverId, (tx) => tx.set(scanRef, scan));


  return { success: true, scan };
});
