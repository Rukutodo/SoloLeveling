'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import styles from './bmi.module.css';

interface BodyMetric {
  _id: string;
  date: string;
  weight: number;
  height: number;
  bmi: number;
  category: string;
}

export default function BMIPage() {
  const { status } = useSession();
  const [metrics, setMetrics] = useState<BodyMetric[]>([]);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [bmiRes, userRes] = await Promise.all([fetch('/api/bmi'), fetch('/api/user')]);
      if (bmiRes.ok) {
        const data = await bmiRes.json();
        setMetrics(data.metrics);
        if (data.savedHeight) setHeight(String(data.savedHeight));
        if (data.targetWeight) setTargetWeight(String(data.targetWeight));
      }
      if (userRes.ok) {
        const data = await userRes.json();
        setSidebarData({ userName: data.stats.name, level: data.stats.level, xp: data.stats.xp, xpToNext: data.stats.xpToNext, rank: data.stats.rank, title: data.stats.title, rankColor: data.stats.rankColor });
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !height) return;
    setSaving(true);

    try {
      const res = await fetch('/api/bmi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          weight: Number(weight), 
          height: Number(height),
          targetWeight: targetWeight ? Number(targetWeight) : undefined
        }),
      });
      if (res.ok) {
        setWeight('');
        fetchData();
      }
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  const latestBmi = metrics.length > 0 ? metrics[0].bmi : null;
  const latestCategory = metrics.length > 0 ? metrics[0].category : '';
  const latestWeight = metrics.length > 0 ? metrics[0].weight : null;

  // Progress toward target weight
  const progressToGoal = latestWeight && targetWeight 
    ? Math.max(0, Math.min(100, (1 - Math.abs(latestWeight - Number(targetWeight)) / Math.abs(latestWeight)) * 100))
    : 0;

  const chartData = [...metrics].reverse().map((m) => ({
    date: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    bmi: m.bmi,
    weight: m.weight,
  }));

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Underweight': return 'var(--sl-accent-blue)';
      case 'Normal': return 'var(--sl-accent-green)';
      case 'Overweight': return 'var(--sl-accent-gold)';
      case 'Obese': return 'var(--sl-accent-red)';
      default: return 'var(--sl-text-primary)';
    }
  };

  const getBmiPosition = (bmi: number) => Math.min(Math.max(((bmi - 15) / 25) * 100, 0), 100);

  if (status === 'loading') return null;

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className="sl-page-header">
          <h1 className="sl-page-title">⚖️ BMI Tracker</h1>
          <p className="sl-page-subtitle">[SYSTEM] Body composition analysis</p>
        </div>

        <div className={styles.grid}>
          {/* Current BMI Display */}
          <div className="sl-panel" style={{ padding: '24px' }}>
            <h2 className="sl-section-title">Current Status</h2>
            {latestBmi ? (
              <div className={styles.bmiDisplay}>
                <div className={styles.bmiValue} style={{ color: getCategoryColor(latestCategory) }}>{latestBmi}</div>
                <div className={styles.bmiCategory} style={{ color: getCategoryColor(latestCategory) }}>{latestCategory}</div>
                <div className={styles.bmiWeight}>{latestWeight} kg</div>

                {/* BMI Scale */}
                <div className={styles.bmiScale}>
                  <div className={styles.scaleBar}>
                    <div className={styles.scaleSection} style={{ background: 'var(--sl-accent-blue)', width: '14%' }} />
                    <div className={styles.scaleSection} style={{ background: 'var(--sl-accent-green)', width: '26%' }} />
                    <div className={styles.scaleSection} style={{ background: 'var(--sl-accent-gold)', width: '20%' }} />
                    <div className={styles.scaleSection} style={{ background: 'var(--sl-accent-red)', width: '40%' }} />
                    <div className={styles.scaleMarker} style={{ left: `${getBmiPosition(latestBmi)}%` }} />
                  </div>
                  <div className={styles.scaleLabels}>
                    <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
                  </div>
                </div>

                {/* Target Weight Progress */}
                {targetWeight && (
                  <div className={styles.targetProgress}>
                    <div className="sl-flex-between" style={{ marginBottom: '8px' }}>
                      <span className="sl-label" style={{ margin: 0 }}>Goal: {targetWeight} kg</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--sl-accent-blue)' }}>
                        {latestWeight && latestWeight > Number(targetWeight) ? `${(latestWeight - Number(targetWeight)).toFixed(1)}kg to go` : 'Goal Reached!'}
                      </span>
                    </div>
                    <div className="sl-progress sl-progress-blue">
                      <div className="sl-progress-fill" style={{ width: `${progressToGoal}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--sl-text-muted)' }}>No data yet. Log your first entry!</div>
            )}
          </div>

          {/* Input Form */}
          <div className="sl-panel" style={{ padding: '24px' }}>
            <h2 className="sl-section-title">Log Entry</h2>
            <form onSubmit={handleSubmit} className={styles.form}>
              <div>
                <label className="sl-label">Weight (kg)</label>
                <input className="sl-input" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 70" required />
              </div>
              <div>
                <label className="sl-label">Height (cm)</label>
                <input className="sl-input" type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 175" required />
              </div>
              <div>
                <label className="sl-label">Target Weight (kg)</label>
                <input className="sl-input" type="number" step="0.1" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)} placeholder="Your goal weight" />
              </div>
              {weight && height && (
                <div className={styles.previewBmi}>
                  Preview: <strong>{(Number(weight) / Math.pow(Number(height) / 100, 2)).toFixed(1)}</strong> BMI
                </div>
              )}
              <button type="submit" className="sl-btn sl-btn-primary" disabled={saving} style={{ width: '100%' }}>
                {saving ? 'SAVING DATA...' : '⚡ UPDATE SYSTEM'}
              </button>
            </form>
          </div>
        </div>

        {/* Chart */}
        {chartData.length > 1 && (
          <div className="sl-panel" style={{ padding: '24px', marginTop: '24px' }}>
            <h2 className="sl-section-title">BMI Trend</h2>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.1)" />
                  <XAxis dataKey="date" stroke="var(--sl-text-muted)" fontSize={12} />
                  <YAxis stroke="var(--sl-text-muted)" fontSize={12} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: 'var(--sl-bg-panel-solid)', border: '1px solid var(--sl-border)', borderRadius: '8px', color: 'var(--sl-text-primary)' }}
                  />
                  <ReferenceLine y={18.5} stroke="var(--sl-accent-blue)" strokeDasharray="5 5" />
                  <ReferenceLine y={25} stroke="var(--sl-accent-gold)" strokeDasharray="5 5" />
                  <ReferenceLine y={30} stroke="var(--sl-accent-red)" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="bmi" stroke="var(--sl-accent-blue)" strokeWidth={2} dot={{ fill: 'var(--sl-accent-blue)', r: 4 }} activeDot={{ r: 6, fill: 'var(--sl-accent-blue)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* History */}
        {metrics.length > 0 && (
          <div className="sl-panel" style={{ padding: '24px', marginTop: '24px' }}>
            <h2 className="sl-section-title">History</h2>
            <table className="sl-table">
              <thead><tr><th>Date</th><th>Weight</th><th>Height</th><th>BMI</th><th>Category</th></tr></thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m._id}>
                    <td>{new Date(m.date).toLocaleDateString()}</td>
                    <td>{m.weight} kg</td>
                    <td>{m.height} cm</td>
                    <td style={{ fontFamily: 'var(--sl-font-display)', color: getCategoryColor(m.category) }}>{m.bmi}</td>
                    <td><span className={`sl-badge ${m.category === 'Normal' ? 'sl-badge-green' : m.category === 'Overweight' ? 'sl-badge-gold' : m.category === 'Obese' ? 'sl-badge-red' : 'sl-badge-blue'}`}>{m.category}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
