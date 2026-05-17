'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { MdOutlineMonitor, MdRefresh, MdError, MdSpeed, MdBarChart, MdOutlineAccessTime } from 'react-icons/md';
import { FaBolt, FaShieldAlt, FaDatabase, FaCheckCircle } from 'react-icons/fa';

interface LogEntry {
  _id: string;
  timestamp: string;
  route: string;
  method: string;
  statusCode: number;
  durationMs: number;
  type: string;
  error: string | null;
}

interface Summary {
  totalRequests: number;
  errorCount: number;
  errorRate: string;
  aiCallsThisHour: number;
  aiQuotaRemaining: number;
  avgDurationMs: number;
}

const TYPE_COLORS: Record<string, string> = {
  ai:      '#a78bfa',
  finance: '#34d399',
  health:  '#f87171',
  auth:    '#fbbf24',
  api:     '#60a5fa',
};

const STATUS_COLORS: Record<number, string> = {
  200: '#34d399', 201: '#34d399',
  400: '#fbbf24', 401: '#fbbf24', 403: '#fbbf24', 404: '#fbbf24',
  429: '#f97316',
  500: '#f87171', 503: '#f87171',
};

function getStatusColor(code: number): string {
  return STATUS_COLORS[code] || (code < 300 ? '#34d399' : code < 500 ? '#fbbf24' : '#f87171');
}

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export default function AdminLogsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(24);
  const [filter, setFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user');
      if (res.ok) {
        const d = await res.json();
        setSidebarData({
          userName: d.stats.name,
          level: d.stats.level,
          xp: d.stats.xp,
          xpToNext: d.stats.xpToNext,
          rank: d.stats.rank,
          title: d.stats.title,
          rankColor: d.stats.rankColor
        });
      }
    } catch (e) {
      console.error('Failed to load user info for sidebar', e);
    }
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/logs?range=${range}`);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    if (session) {
      fetchUser();
    }
  }, [session]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const filteredLogs: LogEntry[] = (data?.recentLogs || []).filter(
    (l: LogEntry) => filter === 'all' || l.type === filter
  );

  const summary: Summary = data?.summary || {
    totalRequests: 0, errorCount: 0, errorRate: '0',
    aiCallsThisHour: 0, aiQuotaRemaining: 30, avgDurationMs: 0,
  };

  const aiQuotaPct = Math.round((summary.aiCallsThisHour / 30) * 100);

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content" style={{ fontFamily: 'var(--sl-font)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #a78bfa, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MdOutlineMonitor style={{ color: '#fff', fontSize: '1.4rem' }} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--sl-text-bright)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                System Monitor
              </h1>
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--sl-text-dim)', letterSpacing: '0.08em' }}>
                API GATEWAY &amp; REQUEST LOGGER
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {/* Range selector */}
            {[6, 24, 48].map(h => (
              <button key={h}
                onClick={() => setRange(h)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em',
                  background: range === h ? '#a78bfa' : 'rgba(255,255,255,0.05)',
                  color: range === h ? '#fff' : 'var(--sl-text-dim)',
                  transition: 'all 0.2s',
                }}>
                {h}H
              </button>
            ))}
            <button onClick={() => setAutoRefresh(v => !v)}
              style={{ padding: '6px 14px', borderRadius: '8px', border: `1px solid ${autoRefresh ? '#34d399' : 'var(--sl-glass-border)'}`, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, background: autoRefresh ? 'rgba(52,211,153,0.1)' : 'transparent', color: autoRefresh ? '#34d399' : 'var(--sl-text-dim)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MdRefresh style={{ animation: autoRefresh ? 'spin 2s linear infinite' : 'none' }} />
              {autoRefresh ? 'LIVE' : 'AUTO'}
            </button>
            <button onClick={fetchLogs} disabled={loading}
              style={{ padding: '8px 18px', borderRadius: '10px', background: 'linear-gradient(135deg, #a78bfa, #6366f1)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MdRefresh /> REFRESH
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total Requests', value: summary.totalRequests, icon: <FaDatabase />, color: '#60a5fa', sub: `last ${range}h` },
            { label: 'Error Rate', value: `${summary.errorRate}%`, icon: <MdError />, color: summary.errorCount > 0 ? '#f87171' : '#34d399', sub: `${summary.errorCount} errors` },
            { label: 'Avg Response', value: `${summary.avgDurationMs}ms`, icon: <MdSpeed />, color: summary.avgDurationMs > 1000 ? '#fbbf24' : '#34d399', sub: 'server-side' },
            { label: 'AI Calls / Hour', value: summary.aiCallsThisHour, icon: <FaBolt />, color: '#a78bfa', sub: `${summary.aiQuotaRemaining} remaining` },
          ].map((card, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--sl-glass-border)', borderRadius: '16px', padding: '20px', backdropFilter: 'blur(12px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--sl-text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{card.label}</span>
                <span style={{ color: card.color, fontSize: '1rem' }}>{card.icon}</span>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: card.color, letterSpacing: '-0.02em', lineHeight: 1 }}>{card.value}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--sl-text-ghost)', marginTop: '6px' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* AI Quota Bar */}
        <div style={{ background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 700, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaBolt /> GEMINI AI QUOTA — THIS HOUR
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--sl-text-dim)' }}>
              {summary.aiCallsThisHour} / 30 calls used · {summary.aiQuotaRemaining} remaining
            </span>
          </div>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: '4px',
              width: `${Math.min(100, aiQuotaPct)}%`,
              background: aiQuotaPct > 80 ? 'linear-gradient(90deg, #f97316, #f87171)' : aiQuotaPct > 50 ? 'linear-gradient(90deg, #fbbf24, #f97316)' : 'linear-gradient(90deg, #a78bfa, #6366f1)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          {aiQuotaPct > 80 && (
            <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: '#f87171' }}>
              ⚠️ Approaching quota limit — rate limiting will activate at 30 calls/hour
            </p>
          )}
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
          {/* Hourly Timeline */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--sl-glass-border)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <MdBarChart style={{ color: '#60a5fa' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--sl-text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Requests / Hour (24h)</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data?.hourlyTimeline || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="_id" tickFormatter={(v: string) => new Date(v).getHours() + 'h'} tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#1e1b4b', border: '1px solid #a78bfa', borderRadius: '8px', fontSize: '0.75rem' }} labelFormatter={((v: string) => new Date(v).toLocaleTimeString()) as any} />
                <Line type="monotone" dataKey="count" stroke="#60a5fa" strokeWidth={2} dot={false} name="Requests" />
                <Line type="monotone" dataKey="errors" stroke="#f87171" strokeWidth={2} dot={false} name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Routes */}
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--sl-glass-border)', borderRadius: '16px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <FaShieldAlt style={{ color: '#34d399' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--sl-text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Top Routes</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(data?.routeBreakdown || []).slice(0, 6).map((r: any, i: number) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--sl-text-dim)', fontFamily: 'monospace' }}>
                      {r._id.replace('/api/', '')}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--sl-text-bright)', fontWeight: 600 }}>{r.count}</span>
                  </div>
                  <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                    <div style={{ height: '100%', borderRadius: '2px', width: `${Math.min(100, (r.count / (data?.summary?.totalRequests || 1)) * 100)}%`, background: r.errors > 0 ? '#f87171' : '#34d399' }} />
                  </div>
                </div>
              ))}
              {(!data?.routeBreakdown || data.routeBreakdown.length === 0) && (
                <p style={{ fontSize: '0.72rem', color: 'var(--sl-text-ghost)', textAlign: 'center', margin: '20px 0' }}>No data yet — make some API calls first</p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Logs Table */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--sl-glass-border)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MdOutlineAccessTime style={{ color: '#a78bfa' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--sl-text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Recent Logs</span>
            </div>
            {/* Type filter pills */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'ai', 'finance', 'health', 'auth', 'api'].map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', background: filter === t ? (TYPE_COLORS[t] || '#60a5fa') : 'rgba(255,255,255,0.05)', color: filter === t ? '#fff' : 'var(--sl-text-ghost)', transition: 'all 0.2s' }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sl-text-ghost)', fontSize: '0.8rem' }}>
              Loading logs...
            </div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sl-text-ghost)', fontSize: '0.8rem' }}>
              <FaDatabase style={{ fontSize: '2rem', marginBottom: '10px', opacity: 0.3 }} />
              <br />No logs yet — API activity will appear here automatically
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--sl-glass-border)' }}>
                    {['Time', 'Method', 'Route', 'Type', 'Status', 'Duration', 'Error'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--sl-text-ghost)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.63rem', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 12px', color: 'var(--sl-text-ghost)', whiteSpace: 'nowrap' }}>{timeAgo(log.timestamp)}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: 'rgba(96,165,250,0.1)', color: '#60a5fa', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, fontSize: '0.62rem' }}>{log.method}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--sl-text-dim)', fontFamily: 'monospace', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.route}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: `${TYPE_COLORS[log.type] || '#60a5fa'}18`, color: TYPE_COLORS[log.type] || '#60a5fa', padding: '2px 7px', borderRadius: '4px', fontSize: '0.62rem', fontWeight: 600, textTransform: 'uppercase' }}>{log.type}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ color: getStatusColor(log.statusCode), fontWeight: 700 }}>{log.statusCode}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: log.durationMs > 1000 ? '#fbbf24' : 'var(--sl-text-dim)' }}>{log.durationMs}ms</td>
                      <td style={{ padding: '10px 12px', color: '#f87171', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.error ? (
                          <span title={log.error}>{log.error.substring(0, 60)}{log.error.length > 60 ? '...' : ''}</span>
                        ) : (
                          <FaCheckCircle style={{ color: '#34d399', opacity: 0.6 }} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </main>
    </div>
  );
}
