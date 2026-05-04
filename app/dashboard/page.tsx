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
import { MdAddCircle, MdFitnessCenter, MdRestaurant } from 'react-icons/md';
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
        <div className={styles.loadingText}>Initializing System...</div>
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
                <div className={styles.playerStatValue} style={{ color: 'var(--sl-accent-gold)' }}>
                  {stats?.totalXp || 0}
                </div>
                <div className={styles.playerStatLabel}>Total XP</div>
              </div>
              <div className={styles.playerStatItem}>
                <div className={styles.playerStatValue} style={{ color: 'var(--sl-accent-blue)' }}>
                  {stats?.level || 1}
                </div>
                <div className={styles.playerStatLabel}>Level</div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className={styles.statsGrid}>
            <div className={`sl-panel ${styles.statCard}`}>
              <div className={styles.statIcon}>🔥</div>
              <div className={styles.statLabel}>Calories Today</div>
              <div className={styles.statValue}>{dashData.todayCalories}</div>
              <div className={styles.statSub}>/ {dashData.calorieGoal} kcal</div>
            </div>
            <div className={`sl-panel ${styles.statCard}`}>
              <div className={styles.statIcon}>💪</div>
              <div className={styles.statLabel}>Workout Streak</div>
              <div className={styles.statValue}>{dashData.workoutStreak}</div>
              <div className={styles.statSub}>days</div>
            </div>
            <div className={`sl-panel ${styles.statCard}`}>
              <div className={styles.statIcon}>⚖️</div>
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
              <div className={styles.statIcon}>💰</div>
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
                  <div className={styles.emptyIcon}>⚔️</div>
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
