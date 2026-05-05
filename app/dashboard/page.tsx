'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  GiMeal,
  GiMuscleUp,
  GiHeartBeats,
  GiCalendar,
  GiGoldBar,
  GiCrossedSwords,
  GiTreasureMap,
} from 'react-icons/gi';
import { MdAddCircle, MdFitnessCenter, MdRestaurant, MdMonetizationOn } from 'react-icons/md';
import { FaFire, FaBalanceScale } from 'react-icons/fa';
import styles from './dashboard.module.css';

interface UserStats {
  level: number;
  xp: number;
  totalXp: number;
  xpToNext: number;
  rank: string;
  title: string;
  rankColor: string;
  name: string;
}

interface DashboardData {
  todayCalories: number;
  calorieGoal: number;
  workoutStreak: number;
  latestBmi: number | null;
  monthlyNetWorth: number;
  recentActivity: Array<{
    icon: string;
    text: string;
    time: string;
  }>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [dashData, setDashData] = useState<DashboardData>({
    todayCalories: 0,
    calorieGoal: 2000,
    workoutStreak: 0,
    latestBmi: null,
    monthlyNetWorth: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [sleepHours, setSleepHours] = useState(8);
  const [sleepQuality, setSleepQuality] = useState(3);
  const [analyzingSleep, setAnalyzingSleep] = useState(false);
  const [sleepAnalysis, setSleepAnalysis] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  const fetchData = async () => {
    try {
      const [userRes, dashRes] = await Promise.all([
        fetch('/api/user'),
        fetch('/api/dashboard'),
      ]);

      if (userRes.ok) {
        const userData = await userRes.json();
        setStats(userData.stats);
        if (userData.user?.dailyCalorieGoal) {
          setDashData((prev) => ({ ...prev, calorieGoal: userData.user.dailyCalorieGoal }));
        }
      }

      if (dashRes.ok) {
        const data = await dashRes.json();
        setDashData((prev) => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.loadingSpinner} />
        <div className={styles.loadingText}>ARISE...</div>
      </div>
    );
  }

  const userName = stats?.name || session?.user?.name || 'Hunter';
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const xpPercent = stats ? Math.min((stats.xp / stats.xpToNext) * 100, 100) : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="sl-page-wrapper">
      <Sidebar
        userName={userName}
        level={stats?.level}
        xp={stats?.xp}
        xpToNext={stats?.xpToNext}
        rank={stats?.rank}
        title={stats?.title}
        rankColor={stats?.rankColor}
      />

      <main className="sl-main-content">
        <div className={styles.dashPage}>
          {/* Greeting */}
          <div className={`sl-page-header ${styles.greeting}`}>
            <h1 className={styles.greetingText}>
              {getGreeting()}, <span className={styles.greetingAccent}>{userName}</span>
            </h1>
            <p className={styles.greetingSubtext}>
              [SYSTEM] Daily status report initialized
            </p>
          </div>

          {/* Player Status Card */}
          <div className={`sl-panel ${styles.playerCard}`}>
            <div className={styles.playerAvatarLarge}>{initials}</div>
            <div className={styles.playerMainInfo}>
              <div className={styles.playerNameLarge}>{userName}</div>
              <div
                className={styles.playerTitleLarge}
                style={{ color: stats?.rankColor || '#8b8b8b' }}
              >
                {stats?.rank || 'E'}-Rank • {stats?.title || 'Awakened Hunter'}
              </div>
              <div className={styles.xpBarLarge}>
                <div className={styles.xpInfo}>
                  <span>Level {stats?.level || 1}</span>
                  <span>
                    {stats?.xp || 0} / {stats?.xpToNext || 100} XP
                  </span>
                </div>
                <div className={styles.xpTrack}>
                  <div
                    className={styles.xpFillLarge}
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
              </div>
            </div>
            <div className={styles.playerStatsRow}>
              <div className={styles.playerStatItem}>
                <div className={styles.playerStatValue} style={{ color: 'var(--sl-gold)' }}>
                  {stats?.totalXp || 0}
                </div>
                <div className={styles.playerStatLabel}>Total XP</div>
              </div>
              <div className={styles.playerStatItem}>
                <div className={styles.playerStatValue} style={{ color: 'var(--sl-blue)' }}>
                  {stats?.level || 1}
                </div>
                <div className={styles.playerStatLabel}>Level</div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className={styles.statsGrid}>
            <div className={`sl-panel ${styles.statCard}`}>
              <div className={styles.statIcon}><FaFire /></div>
              <div className={styles.statLabel}>Calories Today</div>
              <div className={styles.statValue}>{dashData.todayCalories}</div>
              <div className={styles.statSub}>/ {dashData.calorieGoal} kcal</div>
            </div>
            <div className={`sl-panel ${styles.statCard}`}>
              <div className={styles.statIcon}><GiMuscleUp /></div>
              <div className={styles.statLabel}>Workout Streak</div>
              <div className={styles.statValue}>{dashData.workoutStreak}</div>
              <div className={styles.statSub}>days</div>
            </div>
            <div className={`sl-panel ${styles.statCard}`}>
              <div className={styles.statIcon}><FaBalanceScale /></div>
              <div className={styles.statLabel}>Current BMI</div>
              <div className={styles.statValue}>
                {dashData.latestBmi?.toFixed(1) || '—'}
              </div>
              <div className={styles.statSub}>
                {dashData.latestBmi
                  ? dashData.latestBmi < 18.5 ? 'Underweight' :
                    dashData.latestBmi < 25 ? 'Normal' :
                    dashData.latestBmi < 30 ? 'Overweight' : 'Obese'
                  : 'Not tracked'}
              </div>
            </div>
            <div className={`sl-panel ${styles.statCard}`}>
              <div className={styles.statIcon}><MdMonetizationOn /></div>
              <div className={styles.statLabel}>Monthly Net</div>
              <div className={styles.statValue}>
                {dashData.monthlyNetWorth >= 0 ? '+' : ''}₹{Math.abs(dashData.monthlyNetWorth).toLocaleString()}
              </div>
              <div className={styles.statSub}>this month</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.actionsSection}>
            <h2 className="sl-section-title">Quick Actions</h2>
            <div className={styles.actionsGrid}>
              <Link href="/calories" className={styles.actionCard} id="action-calories">
                <MdRestaurant className={styles.actionIcon} />
                <div>
                  <div className={styles.actionText}>Log Meal</div>
                  <div className={styles.actionSub}>AI-powered calorie scan</div>
                </div>
              </Link>
              <Link href="/workouts" className={styles.actionCard} id="action-workouts">
                <MdFitnessCenter className={styles.actionIcon} />
                <div>
                  <div className={styles.actionText}>Start Workout</div>
                  <div className={styles.actionSub}>Home or Gym mode</div>
                </div>
              </Link>
              <Link href="/finance" className={styles.actionCard} id="action-finance">
                <MdAddCircle className={styles.actionIcon} />
                <div>
                  <div className={styles.actionText}>Log Transaction</div>
                  <div className={styles.actionSub}>Track your finances</div>
                </div>
              </Link>
            </div>
          </div>
          {/* Recovery System (Sleep) */}
          <div className={styles.sleepSection} style={{ marginBottom: '32px' }}>
            <h2 className="sl-section-title">Recovery System</h2>
            <div className="sl-panel" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--sl-text-ghost)', marginBottom: '8px' }}>Hours Slept</label>
                      <input 
                        type="number" 
                        value={sleepHours} 
                        onChange={(e) => setSleepHours(Number(e.target.value))} 
                        className="sl-input" 
                        style={{ width: '100%' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--sl-text-ghost)', marginBottom: '8px' }}>Quality (1-5)</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="5" 
                        value={sleepQuality} 
                        onChange={(e) => setSleepQuality(Number(e.target.value))} 
                        className="sl-input" 
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      className="sl-btn sl-btn-primary" 
                      style={{ flex: 1 }}
                      onClick={async () => {
                        await fetch('/api/sleep', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ date: new Date().toISOString().split('T')[0], hours: sleepHours, quality: sleepQuality })
                        });
                        setSyncStatus('Recovery synced');
                        setTimeout(() => setSyncStatus(''), 3000);
                      }}
                    >
                      Sync Recovery
                    </button>
                    <button 
                      className="sl-btn sl-btn-ghost" 
                      style={{ flex: 1, color: 'var(--sl-blue)', borderColor: 'var(--sl-blue)' }}
                      onClick={async () => {
                        setAnalyzingSleep(true);
                        const res = await fetch('/api/ai/sleep-analysis', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ hours: sleepHours, quality: sleepQuality })
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setSleepAnalysis(data.analysis);
                        }
                        setAnalyzingSleep(false);
                      }}
                      disabled={analyzingSleep}
                    >
                      {analyzingSleep ? 'Analyzing...' : 'AI Bio-Scan'}
                    </button>
                  </div>
                </div>

                {sleepAnalysis && (
                  <div style={{ flex: 1.5, background: 'var(--sl-bg-base)', padding: '20px', borderRadius: '16px', border: '1px solid var(--sl-glass-border)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--sl-blue)', marginBottom: '12px', textTransform: 'uppercase' }}>[SYSTEM] Shadow Analysis</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--sl-text-bright)', marginBottom: '4px' }}>BODY</div>
                        <ul style={{ padding: 0, margin: 0, listStyle: 'none', fontSize: '0.75rem' }}>
                          {sleepAnalysis.bodyEffects.pros.map((p: string, i: number) => <li key={i} style={{ color: 'var(--sl-green)' }}>+ {p}</li>)}
                          {sleepAnalysis.bodyEffects.cons.map((c: string, i: number) => <li key={i} style={{ color: 'var(--sl-red)' }}>- {c}</li>)}
                        </ul>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--sl-text-bright)', marginBottom: '4px' }}>MIND</div>
                        <ul style={{ padding: 0, margin: 0, listStyle: 'none', fontSize: '0.75rem' }}>
                          {sleepAnalysis.mindEffects.pros.map((p: string, i: number) => <li key={i} style={{ color: 'var(--sl-green)' }}>+ {p}</li>)}
                          {sleepAnalysis.mindEffects.cons.map((c: string, i: number) => <li key={i} style={{ color: 'var(--sl-red)' }}>- {c}</li>)}
                        </ul>
                      </div>
                    </div>
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--sl-glass-border)', fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--sl-text-main)' }}>
                      "{sleepAnalysis.overallAdvice}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={styles.activitySection}>
            <h2 className="sl-section-title">Recent Activity</h2>
            <div className={`sl-panel`} style={{ padding: '4px' }}>
              {dashData.recentActivity.length > 0 ? (
                <div className={styles.activityList}>
                  {dashData.recentActivity.map((activity, i) => {
                    const iconMap: Record<string, React.ReactNode> = {
                      meal: <GiMeal />,
                      workout: <GiMuscleUp />,
                      bmi: <GiHeartBeats />,
                      calendar: <GiCalendar />,
                      finance: <GiGoldBar />,
                      xp: <GiCrossedSwords />,
                    };
                    return (
                      <div key={i} className={styles.activityItem}>
                        <span className={styles.activityIcon}>
                          {iconMap[activity.icon] || <GiTreasureMap />}
                        </span>
                        <span className={styles.activityText}>{activity.text}</span>
                        <span className={styles.activityTime}>{activity.time}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}><GiCrossedSwords /></div>
                  <div className={styles.emptyText}>No quests completed yet</div>
                  <div className={styles.emptySubtext}>
                    Start your journey by logging a meal or workout
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
