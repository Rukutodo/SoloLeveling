'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
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
import { RiTodoFill } from 'react-icons/ri';
import { MdFitnessCenter, MdRestaurant, MdAddCircle, MdRadioButtonUnchecked, MdCheckCircle } from 'react-icons/md';
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
  isSalaryCycle?: boolean;
  cycleStart?: string;
  recentActivity: Array<{ icon: string; text: string; time: string }>;
}

function useCountUp(target: number, duration = 1.5) {
  const [count, setCount] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let startTime = 0;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return count;
}

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const activityIconMap: Record<string, React.ReactNode> = {
  meal: <GiMeal />,
  workout: <GiMuscleUp />,
  bmi: <GiHeartBeats />,
  calendar: <GiCalendar />,
  finance: <GiGoldBar />,
  xp: <GiCrossedSwords />,
};

function DashboardSkeleton() {
  return (
    <div className="sl-page-wrapper">
      <Sidebar />
      <main className="sl-main-content">
        <div className={styles.dashPage}>
          <div className={styles.greetingSkeleton}>
            <div className={`sl-skeleton ${styles.skLine} ${styles.skTitle}`} />
            <div className={`sl-skeleton ${styles.skLine} ${styles.skSubtitle}`} />
          </div>
          <div className={`${styles.playerCard} sl-panel`}>
            <div className={`sl-skeleton ${styles.skAvatar}`} />
            <div className={styles.skPlayerInfo}>
              <div className={`sl-skeleton ${styles.skLine} ${styles.skName}`} />
              <div className={`sl-skeleton ${styles.skLine} ${styles.skRank}`} />
              <div className={`sl-skeleton ${styles.skLine} ${styles.skXp}`} />
            </div>
          </div>
          <div className={styles.statsGrid}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`sl-panel ${styles.statCard}`}>
                <div className={`sl-skeleton ${styles.skIcon}`} />
                <div className={`sl-skeleton ${styles.skLine} ${styles.skLabel}`} />
                <div className={`sl-skeleton ${styles.skLine} ${styles.skValue}`} />
              </div>
            ))}
          </div>
          <div className={styles.actionsGrid}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={`sl-skeleton ${styles.skActionCard}`} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [todos, setTodos] = useState<any[]>([]);
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
  const [activeQuest, setActiveQuest] = useState<any>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedQuickItem, setSelectedQuickItem] = useState<any>(null);
  const [quickQuantity, setQuickQuantity] = useState('1');
  const [isAdding, setIsAdding] = useState(false);

  const calCount = useCountUp(dashData.todayCalories);
  const streakCount = useCountUp(dashData.workoutStreak);

  const QUICK_ITEMS = [
    { id: 'eggs',      name: 'Eggs',      icon: '🥚', cals: 78,  p: 6,   c: 0.6, f: 5,   caf: 0,  unit: 'large' },
    { id: 'green-tea', name: 'Green Tea', icon: '🍵', cals: 2,   p: 0,   c: 0,   f: 0,   caf: 35, unit: 'cup'   },
    { id: 'diet-coke', name: 'Diet Coke', icon: '🥤', cals: 0,   p: 0,   c: 0,   f: 0,   caf: 10, unit: 'ml'    },
    { id: 'apple',     name: 'Apple',     icon: '🍎', cals: 95,  p: 0.5, c: 25,  f: 0.3, caf: 0,  unit: 'medium'},
    { id: 'oats',      name: 'Oats',      icon: '🥣', cals: 150, p: 5,   c: 27,  f: 3,   caf: 0,  unit: 'serving (40g)' },
  ];

  useEffect(() => {
    if (status === 'authenticated') fetchData();
  }, [status]);

  const fetchData = async () => {
    try {
      const [userRes, dashRes, questRes, todoRes] = await Promise.all([
        fetch('/api/user'),
        fetch('/api/dashboard'),
        fetch('/api/quests/chain'),
        fetch('/api/todos'),
      ]);
      if (userRes.ok) {
        const ud = await userRes.json();
        setStats(ud.stats);
        if (ud.user?.dailyCalorieGoal) setDashData((p) => ({ ...p, calorieGoal: ud.user.dailyCalorieGoal }));
      }
      if (dashRes.ok) {
        const dashJson = await dashRes.json();
        setDashData((p) => ({ ...p, ...dashJson }));
      }
      if (questRes.ok) { const d = await questRes.json(); setActiveQuest(d.quest); }
      if (todoRes.ok) {
        const d = await todoRes.json();
        setTodos(d.todos);
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateTodoStatus = async (id: string, completed: boolean) => {
    const newStatus = completed ? 'Done' : 'Todo';
    
    // Optimistic update
    setTodos(todos.map(t => t._id === id ? { ...t, completed, status: newStatus } : t));
    
    const res = await fetch('/api/todos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus, completed }),
    });
    
    if (res.ok) {
      fetchData(); // Refresh to update XP/Activity
    }
  };

  const handleQuickAdd = async () => {
    if (!selectedQuickItem || isAdding) return;
    setIsAdding(true);
    const qty = parseFloat(quickQuantity) || 1;
    
    // For ml, caffeine is usually ~10mg per 100ml. Our caf is per unit (100ml for coke, 1 cup for tea)
    const multiplier = selectedQuickItem.unit === 'ml' ? qty / 100 : qty;

    try {
      const res = await fetch('/api/calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodName: `${selectedQuickItem.name} (${qty}${selectedQuickItem.unit})`,
          calories: Math.round(selectedQuickItem.cals * multiplier),
          protein: Number((selectedQuickItem.p * multiplier).toFixed(1)),
          carbs: Number((selectedQuickItem.c * multiplier).toFixed(1)),
          fat: Number((selectedQuickItem.f * multiplier).toFixed(1)),
          caffeine: Math.round((selectedQuickItem.caf || 0) * multiplier),
          mealType: new Date().getHours() < 11 ? 'breakfast' : new Date().getHours() < 16 ? 'lunch' : 'dinner',
          source: 'manual',
          date: new Date().toISOString()
        }),
      });

      if (res.ok) {
        setDashData(prev => ({
          ...prev,
          todayCalories: prev.todayCalories + Math.round(selectedQuickItem.cals * qty)
        }));
        setShowQuantityModal(false);
        setQuickQuantity('1');
        // Refresh full dashboard data to update XP/Levels if needed
        fetchData();
      }
    } catch (err) {
      console.error('Quick add error:', err);
    } finally {
      setIsAdding(false);
    }
  };

  if (status === 'loading' || loading) return <DashboardSkeleton />;

  const userName = stats?.name || session?.user?.name || 'Hunter';
  const initials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const xpPercent = stats ? Math.min((stats.xp / stats.xpToNext) * 100, 100) : 0;

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  };

  const bmiCategory = dashData.latestBmi
    ? dashData.latestBmi < 18.5 ? 'Underweight'
    : dashData.latestBmi < 25 ? 'Normal'
    : dashData.latestBmi < 30 ? 'Overweight' : 'Obese'
    : 'Not tracked';

  const questProgress = activeQuest
    ? Math.round((activeQuest.milestones.filter((m: any) => m.completed).length / activeQuest.milestones.length) * 100)
    : 0;

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
        <motion.div className={styles.dashPage} variants={pageVariants} initial="hidden" animate="visible">

          {/* Dashboard Header: Greeting + Player Status */}
          <motion.div variants={sectionVariants} className={styles.dashHeader}>
            <div className={styles.greeting}>
              <h1 className={styles.greetingText}>
                {getGreeting()}, <span className={styles.greetingAccent}>{userName}</span>
              </h1>
              <p className={styles.greetingSubtext}>[SYSTEM] Status: Optimal • Quest Level {stats?.level || 1}</p>
            </div>

            <div className={`sl-panel ${styles.playerCard}`}>
              <div className={styles.playerAvatarLarge}>{initials}</div>
              <div className={styles.playerMainInfo}>
                <div className={styles.playerNameLarge}>{userName}</div>
                <div className={styles.playerTitleLarge} style={{ color: stats?.rankColor || 'var(--sl-blue)' }}>
                  {stats?.rank || 'E'}-Rank • {stats?.title || 'Awakened Hunter'}
                </div>
                <div className={styles.xpBarLarge}>
                  <div className={styles.xpInfo}>
                    <span>Exp Progress</span>
                    <span>{stats?.xp || 0} / {stats?.xpToNext || 100} XP</span>
                  </div>
                  <div className={styles.xpTrack}>
                    <motion.div
                      className={styles.xpFillLarge}
                      initial={{ width: 0 }}
                      animate={{ width: `${xpPercent}%` }}
                      transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.playerStatsRow}>
                <div className={styles.playerStatItem}>
                  <div className={styles.playerStatValue} style={{ color: 'var(--sl-gold)' }}>
                    {(stats?.totalXp || 0).toLocaleString()}
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
          </motion.div>

          {/* Daily Directives Widget (New) */}
          <motion.div variants={sectionVariants} className={styles.directivesWidget}>
            <div className={`sl-panel ${styles.directivesPanel}`}>
              <div className={styles.directivesHeader}>
                <div className={styles.directivesTitleGroup}>
                  <RiTodoFill className={styles.directivesIcon} />
                  <div className={styles.directivesTitle}>Daily Directives</div>
                </div>
                <Link href="/todos" className={styles.detailsLink}>View Board →</Link>
              </div>
              <div className={styles.directivesList}>
                {todos.filter(t => t.status === 'Todo' || (t.status === 'Done' && new Date(t.updatedAt).toDateString() === new Date().toDateString())).length > 0 ? (
                  todos.filter(t => t.status === 'Todo' || (t.status === 'Done' && new Date(t.updatedAt).toDateString() === new Date().toDateString())).slice(0, 5).map(todo => (
                    <div key={todo._id} className={styles.dashTodoItem}>
                      <button 
                        className={styles.todoCheck}
                        onClick={() => updateTodoStatus(todo._id, !todo.completed)}
                        style={{ color: todo.completed ? 'var(--sl-green)' : 'var(--sl-text-ghost)' }}
                      >
                        {todo.completed ? <MdCheckCircle /> : <MdRadioButtonUnchecked />}
                      </button>
                      <span className={`${styles.todoText} ${todo.completed ? styles.todoDone : ''}`}>{todo.title}</span>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyDirectives}>[SYSTEM] No active directives. Proceed to the Strategic Board.</div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Calorie Tracker Widget (Moved up) */}
          <motion.div variants={sectionVariants} className={styles.calorieWidget}>
            <div className={`sl-panel ${styles.caloriePanel}`}>
              <div className={styles.calorieHeader}>
                <div className={styles.calorieTitleGroup}>
                  <GiMeal className={styles.calorieIcon} />
                  <div className={styles.calorieTitle}>Calorie Tracker</div>
                </div>
                <Link href="/calories" className={styles.detailsLink}>View Details →</Link>
              </div>

              <div className={styles.calorieGrid}>
                <div className={styles.calorieSummary}>
                  <div className={styles.calorieProgress}>
                    <div className={styles.progressLabel}>
                      <span>Today's Progress</span>
                      <span>{Math.min(Math.round((dashData.todayCalories / dashData.calorieGoal) * 100), 100)}%</span>
                    </div>
                    <div className={styles.progressBar}>
                      <motion.div 
                        className={styles.progressFill}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((dashData.todayCalories / dashData.calorieGoal) * 100, 100)}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                  <div className={styles.statValue}>{calCount} <span style={{ fontSize: '1rem', color: 'var(--sl-text-ghost)' }}>/ {dashData.calorieGoal} kcal</span></div>
                </div>

                <div className={styles.quickAddSection}>
                  <div className={styles.quickAddTitle}>Quick Add</div>
                  <div className={styles.quickAddGrid}>
                    {QUICK_ITEMS.map(item => (
                      <motion.div 
                        key={item.id}
                        className={styles.quickAddItem}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedQuickItem(item);
                          setShowQuantityModal(true);
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                        <span className={styles.itemName}>{item.name}</span>
                        <span className={styles.itemCals}>{item.cals} cal</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={sectionVariants} className={styles.statsGrid}>
            <motion.div whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }} className={`sl-panel ${styles.statCard} ${styles.statCalories}`}>
              <div className={`${styles.statIcon} ${styles.iconBlue}`}><GiMeal /></div>
              <div className={styles.statLabel}>Calories Today</div>
              <div className={styles.statValue}>{calCount}</div>
              <div className={styles.statSub}>/ {dashData.calorieGoal} kcal</div>
              <div className={styles.statBar}>
                <motion.div
                  className={`${styles.statBarFill} ${styles.fillBlue}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((dashData.todayCalories / dashData.calorieGoal) * 100, 100)}%` }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
                />
              </div>
            </motion.div>

            <motion.div whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }} className={`sl-panel ${styles.statCard} ${styles.statWorkout}`}>
              <div className={`${styles.statIcon} ${styles.iconPurple}`}><GiMuscleUp /></div>
              <div className={styles.statLabel}>Workout Streak</div>
              <div className={styles.statValue}>{streakCount}</div>
              <div className={styles.statSub}>days</div>
            </motion.div>

            <motion.div whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }} className={`sl-panel ${styles.statCard} ${styles.statBmi}`}>
              <div className={`${styles.statIcon} ${styles.iconGreen}`}><GiHeartBeats /></div>
              <div className={styles.statLabel}>Current BMI</div>
              <div className={styles.statValue}>{dashData.latestBmi?.toFixed(1) || '—'}</div>
              <div className={styles.statSub}>{bmiCategory}</div>
            </motion.div>

            <motion.div whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }} className={`sl-panel ${styles.statCard} ${styles.statFinance}`}>
              <div className={`${styles.statIcon} ${styles.iconGold}`}><GiGoldBar /></div>
              <div className={styles.statLabel}>Monthly Net</div>
              <div className={styles.statValue}>
                {dashData.monthlyNetWorth >= 0 ? '+' : ''}₹{Math.abs(dashData.monthlyNetWorth).toLocaleString()}
              </div>
              <div className={styles.statSub}>
                {dashData.isSalaryCycle
                  ? `since ${new Date(dashData.cycleStart!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                  : 'this month'}
              </div>
            </motion.div>
          </motion.div>

          {/* Main Quest Widget */}
          {activeQuest && (
            <motion.div variants={sectionVariants} className={styles.questWidget}>
              <div className={`sl-panel ${styles.questPanel}`}>
                <div className={styles.questHeader}>
                  <div className={styles.questMeta}>
                    <GiTreasureMap className={styles.questIcon} />
                    <div>
                      <div className={styles.questTitle}>MAIN QUEST: {activeQuest.title}</div>
                      <div className={styles.questDeadline}>
                        DEADLINE: {new Date(activeQuest.deadline).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Link href="/quests/chain" className="sl-btn sl-btn-secondary" style={{ padding: '6px 14px', fontSize: '0.65rem' }}>
                    View Roadmap
                  </Link>
                </div>
                <div className={styles.questProgress}>
                  <div>
                    <div className={styles.questProgressHeader}>
                      <span>Evolution Progress</span>
                      <span>{questProgress}%</span>
                    </div>
                    <div className="sl-progress sl-progress-gold">
                      <motion.div
                        className="sl-progress-fill"
                        initial={{ width: 0 }}
                        animate={{ width: `${questProgress}%` }}
                        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
                      />
                    </div>
                  </div>
                  <div className={styles.currentObjective}>
                    <div className={styles.objectiveLabel}>CURRENT OBJECTIVE</div>
                    <div className={styles.objectiveText}>
                      {activeQuest.milestones.find((m: any) => !m.completed)?.title || 'Quest Completed'}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          <motion.div variants={sectionVariants} className={styles.actionsSection}>
            <h2 className="sl-section-title">Quick Actions</h2>
            <div className={styles.actionsGrid}>
              {[
                { href: '/calories',  icon: <MdRestaurant />,  text: 'Log Meal',          sub: 'AI-powered calorie scan', id: 'action-calories'  },
                { href: '/workouts',  icon: <MdFitnessCenter />, text: 'Start Workout',    sub: 'Home or Gym mode',        id: 'action-workouts'  },
                { href: '/finance',   icon: <MdAddCircle />,   text: 'Log Transaction',    sub: 'Track your finances',     id: 'action-finance'   },
              ].map((action) => (
                <motion.div key={action.id} whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }} whileTap={{ scale: 0.97 }}>
                  <Link href={action.href} className={styles.actionCard} id={action.id}>
                    <span className={styles.actionIcon}>{action.icon}</span>
                    <div>
                      <div className={styles.actionText}>{action.text}</div>
                      <div className={styles.actionSub}>{action.sub}</div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recovery System */}
          <motion.div variants={sectionVariants} className={styles.sleepSection}>
            <h2 className="sl-section-title">Recovery System</h2>
            <div className={`sl-panel ${styles.sleepPanel}`}>
              <div className={styles.sleepInputs}>
                <div style={{ flex: 1 }}>
                  <div className={styles.sleepInputGroup}>
                    <div>
                      <label className="sl-label">Hours Slept</label>
                      <input
                        type="number"
                        value={sleepHours}
                        onChange={(e) => setSleepHours(Number(e.target.value))}
                        className="sl-input"
                      />
                    </div>
                    <div>
                      <label className="sl-label">Quality (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={sleepQuality}
                        onChange={(e) => setSleepQuality(Number(e.target.value))}
                        className="sl-input"
                      />
                    </div>
                  </div>
                  <div className={styles.sleepActions}>
                    <button
                      className="sl-btn sl-btn-primary"
                      style={{ flex: 1 }}
                      onClick={async () => {
                        await fetch('/api/sleep', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            date: new Date().toISOString().split('T')[0],
                            hours: sleepHours,
                            quality: sleepQuality,
                          }),
                        });
                        setSyncStatus('Recovery synced');
                        setTimeout(() => setSyncStatus(''), 3000);
                      }}
                    >
                      Sync Recovery
                    </button>
                    <button
                      className={`sl-btn sl-btn-ghost ${styles.scanBtn}`}
                      disabled={analyzingSleep}
                      onClick={async () => {
                        setAnalyzingSleep(true);
                        const res = await fetch('/api/ai/sleep-analysis', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ hours: sleepHours, quality: sleepQuality }),
                        });
                        if (res.ok) setSleepAnalysis((await res.json()).analysis);
                        setAnalyzingSleep(false);
                      }}
                    >
                      {analyzingSleep ? 'Analyzing...' : 'AI Bio-Scan'}
                    </button>
                  </div>
                </div>

                {sleepAnalysis && (
                  <motion.div
                    className={styles.sleepAnalysis}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <div className={styles.analysisHeader}>[SYSTEM] Shadow Analysis</div>
                    <div className={styles.analysisGrid}>
                      <div>
                        <div className={styles.analysisCategory}>BODY</div>
                        <ul className={styles.analysisList}>
                          {sleepAnalysis.bodyEffects.pros.map((p: string, i: number) => (
                            <li key={i} className={styles.analysisPos}>+ {p}</li>
                          ))}
                          {sleepAnalysis.bodyEffects.cons.map((c: string, i: number) => (
                            <li key={i} className={styles.analysisNeg}>- {c}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className={styles.analysisCategory}>MIND</div>
                        <ul className={styles.analysisList}>
                          {sleepAnalysis.mindEffects.pros.map((p: string, i: number) => (
                            <li key={i} className={styles.analysisPos}>+ {p}</li>
                          ))}
                          {sleepAnalysis.mindEffects.cons.map((c: string, i: number) => (
                            <li key={i} className={styles.analysisNeg}>- {c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className={styles.analysisAdvice}>"{sleepAnalysis.overallAdvice}"</div>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={sectionVariants} className={styles.activitySection}>
            <h2 className="sl-section-title">Recent Activity</h2>
            <div className="sl-panel" style={{ padding: '4px' }}>
              {dashData.recentActivity.length > 0 ? (
                <div className={styles.activityList}>
                  {dashData.recentActivity.map((activity, i) => (
                    <motion.div
                      key={i}
                      className={styles.activityItem}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <span className={styles.activityIcon}>
                        {activityIconMap[activity.icon] || <GiTreasureMap />}
                      </span>
                      <span className={styles.activityText}>{activity.text}</span>
                      <span className={styles.activityTime}>{activity.time}</span>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}><GiCrossedSwords /></div>
                  <div className={styles.emptyText}>No quests completed yet</div>
                  <div className={styles.emptySubtext}>Start your journey by logging a meal or workout</div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Add Quantity Modal */}
          {showQuantityModal && selectedQuickItem && (
            <motion.div 
              className={styles.quantityModal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div 
                className={`sl-panel ${styles.modalContent}`}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
              >
                <div className={styles.modalTitle}>{selectedQuickItem.icon} {selectedQuickItem.name}</div>
                <div className={styles.modalSubtitle}>
                  {selectedQuickItem.unit === 'ml' 
                    ? `Enter volume in ${selectedQuickItem.unit}` 
                    : `Enter quantity in ${selectedQuickItem.unit}s`}
                </div>
                
                <input 
                  type="number" 
                  step={selectedQuickItem.unit === 'ml' ? "50" : "0.5"}
                  min={selectedQuickItem.unit === 'ml' ? "50" : "0.5"}
                  value={quickQuantity}
                  onChange={(e) => setQuickQuantity(e.target.value)}
                  className={styles.quantityInput}
                  autoFocus
                />

                <div className={styles.modalActions}>
                  <button 
                    className={styles.cancelBtn}
                    onClick={() => {
                      setShowQuantityModal(false);
                      setQuickQuantity('1');
                    }}
                    disabled={isAdding}
                  >
                    Cancel
                  </button>
                  <button 
                    className={styles.confirmBtn}
                    onClick={handleQuickAdd}
                    disabled={isAdding}
                  >
                    {isAdding ? 'Adding...' : 'Confirm'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

        </motion.div>
      </main>
    </div>
  );
}
