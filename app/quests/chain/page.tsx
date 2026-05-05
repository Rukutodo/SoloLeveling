'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { GiTreasureMap, GiCheckMark } from 'react-icons/gi';
import { MdTrendingUp, MdCalendarToday, MdMonetizationOn, MdFitnessCenter } from 'react-icons/md';
import { FaBolt } from 'react-icons/fa';
import styles from './quests.module.css';

export default function QuestChainPage() {
  const { status } = useSession();
  const [quest, setQuest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });

  const [form, setForm] = useState({
    targetWeight: '',
    targetSalary: '',
    deadline: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0]
  });

  useEffect(() => {
    if (status === 'authenticated') fetchData();
  }, [status]);

  const fetchData = async () => {
    try {
      const [qRes, uRes] = await Promise.all([
        fetch('/api/quests/chain'),
        fetch('/api/user')
      ]);
      
      if (qRes.ok) {
        const d = await qRes.ok ? await qRes.json() : { quest: null };
        setQuest(d.quest);
      }
      if (uRes.ok) {
        const d = await uRes.json();
        setSidebarData({ userName: d.stats.name, level: d.stats.level, xp: d.stats.xp, xpToNext: d.stats.xpToNext, rank: d.stats.rank, title: d.stats.title, rankColor: d.stats.rankColor });
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!form.targetWeight || !form.targetSalary || !form.deadline) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/quests/chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetWeight: Number(form.targetWeight),
          targetSalary: Number(form.targetSalary),
          deadline: form.deadline
        })
      });
      if (res.ok) {
        const d = await res.json();
        setQuest(d.quest);
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="sl-loading-screen">
        <div className="sl-loading-spinner" />
        <div className="sl-loading-text">ARISE...</div>
      </div>
    );
  }

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className="sl-page-header">
          <h1 className="sl-page-title"><GiTreasureMap style={{ verticalAlign: 'middle' }} /> Hunter's Roadmap</h1>
          <p className="sl-page-subtitle">[SYSTEM] Long-term evolution protocol</p>
        </div>

        {!quest && !generating ? (
          <div className="sl-panel" style={{ maxWidth: '600px', margin: '40px auto', padding: '40px' }}>
            <h2 className="sl-section-title" style={{ textAlign: 'center', marginBottom: '32px' }}>Initialize Main Quest</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label className="sl-label">Target Weight (kg)</label>
                <div style={{ position: 'relative' }}>
                  <MdFitnessCenter style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--sl-blue)' }} />
                  <input className="sl-input" style={{ paddingLeft: '40px' }} type="number" value={form.targetWeight} onChange={(e) => setForm({ ...form, targetWeight: e.target.value })} placeholder="e.g. 70" />
                </div>
              </div>
              <div>
                <label className="sl-label">Target Monthly Income (₹)</label>
                <div style={{ position: 'relative' }}>
                  <MdMonetizationOn style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--sl-gold)' }} />
                  <input className="sl-input" style={{ paddingLeft: '40px' }} type="number" value={form.targetSalary} onChange={(e) => setForm({ ...form, targetSalary: e.target.value })} placeholder="e.g. 200000" />
                </div>
              </div>
              <div>
                <label className="sl-label">Deadline</label>
                <div style={{ position: 'relative' }}>
                  <MdCalendarToday style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--sl-text-ghost)' }} />
                  <input className="sl-input" style={{ paddingLeft: '40px' }} type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
                </div>
              </div>
              <button className="sl-btn sl-btn-primary" onClick={handleGenerate} style={{ marginTop: '16px', width: '100%' }}>
                <FaBolt /> COMMENCE EVOLUTION
              </button>
            </div>
          </div>
        ) : generating ? (
          <div style={{ textAlign: 'center', padding: '100px' }}>
            <div className="sl-loading-spinner" style={{ margin: '0 auto 24px' }} />
            <h2 className={styles.questTitle} style={{ fontSize: '1.5rem' }}>ARISE...</h2>
            <p style={{ color: 'var(--sl-text-dim)' }}>System is constructing your destiny Roadmap</p>
          </div>
        ) : (
          <div className={styles.timelineContainer}>
            <div className={styles.timelineLine} />
            {quest.milestones.map((m: any, idx: number) => (
              <div key={idx} className={`${styles.questNode} ${m.completed ? styles.completedNode : ''}`}>
                <div className={styles.nodeDot} />
                <div className={styles.nodeContent}>
                  <div className={styles.questTitle}>{m.title}</div>
                  <p className={styles.questDesc}>{m.description}</p>
                  <div className={styles.questMeta}>
                    <span className={`${styles.targetTag} ${m.targetType === 'weight' ? styles.typeWeight : styles.typeIncome}`}>
                      {m.targetType === 'weight' ? `${m.targetValue} kg` : `₹${m.targetValue.toLocaleString()}`}
                    </span>
                    <span>Due: {new Date(m.deadline).toLocaleDateString()}</span>
                  </div>
                  {m.completed && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--sl-gold)' }}>
                      <GiCheckMark />
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <div style={{ textAlign: 'center', marginTop: '60px' }}>
              <div className="sl-panel" style={{ display: 'inline-block', padding: '24px 48px', borderColor: 'var(--sl-gold)' }}>
                <h3 style={{ color: 'var(--sl-gold)', fontFamily: 'var(--sl-font-display)', marginBottom: '8px' }}>FINAL DESTINATION</h3>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>S-RANK STATUS</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--sl-text-ghost)', marginTop: '8px' }}>TARGET DATE: {new Date(quest.deadline).toLocaleDateString()}</div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px' }}>
              <button className="sl-btn sl-btn-ghost" onClick={() => setQuest(null)} style={{ fontSize: '0.7rem', opacity: 0.5 }}>
                [SYSTEM] Reset Quest Chain
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
