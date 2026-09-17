import React from 'react';
import { BookOpen, KeyRound, Terminal, Bell, Radio, Users } from 'lucide-react';

const docs = [
  {
    icon: Terminal,
    title: 'Agent Installation Guide',
    text: 'Provision a server, copy the one-time API key, install systeminformation and axios, then run the generated Node.js agent with outbound HTTPS access to /api/metrics and /api/logs.',
  },
  {
    icon: KeyRound,
    title: 'API Reference',
    text: 'Telemetry and log ingestion use Authorization: Bearer <api-key>. Metric payloads support cpu, memory, disk, network, uptime, processes, ports, services, and timestamp.',
  },
  {
    icon: Bell,
    title: 'Alert Workflow',
    text: 'Configure CPU and memory rules in Alerts. Critical telemetry creates alerts and opens incidents automatically so responders can acknowledge and resolve the event.',
  },
  {
    icon: Radio,
    title: 'Public Status Page',
    text: 'Select public-facing services from server settings, then use the Status Page view to expose only display names, high-level state, uptime summary, and public incident notes.',
  },
  {
    icon: Users,
    title: 'Team and Roles',
    text: 'Owners and admins manage projects, invites, roles, and API keys. Viewers are read-only across monitoring, logs, alerts, incidents, costs, and status views.',
  },
];

export const HelpDocs = () => (
  <div className="p-8 space-y-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
    <div>
      <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">
        <BookOpen className="w-4 h-4" />
        Documentation
      </div>
      <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">Help & Docs</h1>
      <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
        Quick reference for the operational workflows required by the Nexo Cloud SRS.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {docs.map((item) => (
        <article key={item.title} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <item.icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">{item.title}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mt-2">{item.text}</p>
          </div>
        </article>
      ))}
    </div>
  </div>
);
