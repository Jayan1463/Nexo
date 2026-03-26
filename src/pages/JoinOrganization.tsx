import React, { useEffect, useMemo, useState } from 'react';
import { auth, collection, query, where, onSnapshot, db, orderBy, limit } from '../firebase';

export const JoinOrganization = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [requestedRole, setRequestedRole] = useState<'viewer' | 'developer' | 'admin'>('viewer');
  const [githubUsername, setGithubUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, 'joinRequests'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);

  const submitRequest = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setError('Invite code is required.');
      return;
    }
    if (requestedRole === 'developer' && !githubUsername.trim()) {
      setError('GitHub username is required for developer role.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const resp = await fetch('/api/org/join-request', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCode: code,
          requestedRole,
          githubUsername: requestedRole === 'developer' ? githubUsername.trim() : undefined,
        }),
      });
      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(payload?.error || 'Failed to create join request');
      setMessage('Join request submitted. Owner has been notified.');
      setInviteCode('');
      setGithubUsername('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Join Organization</h1>
        <p className="text-zinc-500 mt-1">Use a valid invite code and request your role.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Invite code"
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2"
          />
          <select
            value={requestedRole}
            onChange={(e) => setRequestedRole(e.target.value as 'viewer' | 'developer' | 'admin')}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2"
          >
            <option value="viewer">Viewer</option>
            <option value="developer">Developer</option>
            <option value="admin">Admin</option>
          </select>
          <input
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="GitHub username (developer only)"
            disabled={requestedRole !== 'developer'}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 disabled:opacity-50"
          />
        </div>
        <button
          onClick={submitRequest}
          disabled={loading}
          className="bg-emerald-500 text-zinc-950 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Join Request'}
        </button>
        {message ? <p className="text-sm text-emerald-500">{message}</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </div>

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Your Join Requests</h2>
          <span className="text-xs text-zinc-500">Pending: {pendingCount}</span>
        </div>
        <div className="space-y-2">
          {requests.length === 0 ? <p className="text-sm text-zinc-500">No requests submitted yet.</p> : requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-zinc-200 dark:border-white/10 px-3 py-2 text-sm flex items-center justify-between">
              <span>{r.orgName || r.orgId} • {r.requestedRole}</span>
              <span className="uppercase text-xs font-bold text-zinc-500">{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
