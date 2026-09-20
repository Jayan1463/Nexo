import React, { useEffect, useState } from 'react';
import { KeyRound, Copy, Ban, Check } from 'lucide-react';
import { collection, db, doc, onSnapshot, query, serverTimestamp, setDoc, where } from '../firebase';
import { Server } from '../types';
import { useAppStore } from '../store';
import { writeAuditLog } from '../lib/audit';
import { cn, isActiveServer } from '../lib/utils';

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function makeSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `nexo_live_${Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export const ApiKeys = () => {
  const { currentOrgId, currentProjectId, user } = useAppStore();
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServerId, setSelectedServerId] = useState('');
  const [keyName, setKeyName] = useState('Primary ingestion key');
  const [secret, setSecret] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!currentProjectId) {
      setServers([]);
      setSelectedServerId('');
      return;
    }
    const serversQuery = query(collection(db, 'servers'), where('projectId', '==', currentProjectId));
    return onSnapshot(serversQuery, (snapshot) => {
      const rows = snapshot.docs.map((serverDoc) => ({ id: serverDoc.id, ...serverDoc.data() } as Server)).filter(isActiveServer);
      setServers(rows);
      if (!selectedServerId && rows[0]) setSelectedServerId(rows[0].id);
      if (selectedServerId && !rows.some((server) => server.id === selectedServerId)) setSelectedServerId(rows[0]?.id || '');
      setErrorMessage('');
    }, (error) => {
      console.error('Failed to load API key servers', error);
      setServers([]);
      setErrorMessage('Could not load servers for API key management. Check your role and Firestore rules.');
    });
  }, [currentProjectId, selectedServerId]);

  const generate = async () => {
    if (!selectedServerId || !currentProjectId || !user?.uid) return;
    setErrorMessage('');
    const nextSecret = makeSecret();
    const apiKeyHash = await sha256Hex(nextSecret);
    await setDoc(doc(db, 'servers', selectedServerId), {
      apiKeyHash,
      apiKeyStatus: 'active',
      apiKeyName: keyName.trim() || 'Ingestion key',
      apiKeyLastUsed: null,
      apiKeyCreatedAt: serverTimestamp(),
    }, { merge: true });
    await writeAuditLog({ orgId: currentOrgId, projectId: currentProjectId, userId: user.uid, action: 'api_key_generated', resource: 'server', resourceId: selectedServerId, metadata: { name: keyName } });
    setSecret(nextSecret);
  };

  const revoke = async (server: Server) => {
    if (!user?.uid) return;
    await setDoc(doc(db, 'servers', server.id), { apiKeyStatus: 'revoked', apiKeyRevokedAt: serverTimestamp() }, { merge: true });
    await writeAuditLog({ orgId: currentOrgId, projectId: currentProjectId, userId: user.uid, action: 'api_key_revoked', resource: 'server', resourceId: server.id });
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-8 space-y-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <div>
        <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]"><KeyRound className="w-4 h-4" />API Key Management</div>
        <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">API Keys</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">Generate, name, and revoke ingestion keys. Secrets are displayed exactly once.</p>
      </div>
      {errorMessage && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{errorMessage}</div>}

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
        <input value={keyName} onChange={(event) => setKeyName(event.target.value)} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white" />
        <select value={selectedServerId} onChange={(event) => setSelectedServerId(event.target.value)} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
          {servers.map((server) => <option key={server.id} value={server.id}>{server.name}</option>)}
        </select>
        <button onClick={generate} disabled={!selectedServerId} className="bg-emerald-500 text-zinc-950 px-5 py-3 rounded-xl font-black disabled:opacity-50">Generate Key</button>
      </div>
      {servers.length === 0 && !errorMessage && (
        <div className="border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl p-12 text-center text-zinc-500">No servers in the active project yet. Register a server first.</div>
      )}

      {secret && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Copy this key now. It will not be shown again.</p>
          <button onClick={copySecret} className="w-full text-left bg-zinc-950 text-emerald-400 rounded-xl p-4 font-mono text-xs flex items-center justify-between gap-3">
            <span className="truncate">{secret}</span>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servers.map((server) => (
          <div key={server.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-black text-zinc-900 dark:text-white">{server.name}</p>
              <p className="text-xs text-zinc-500">{(server as any).apiKeyName || 'Ingestion key'} · {(server as any).apiKeyLastUsed ? 'used' : 'never used'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('text-[10px] uppercase tracking-widest font-black', server.apiKeyStatus === 'active' ? 'text-emerald-500' : 'text-red-500')}>{server.apiKeyStatus || 'legacy'}</span>
              <button onClick={() => revoke(server)} className="text-red-500 hover:bg-red-500/10 rounded-xl p-2"><Ban className="w-5 h-5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
