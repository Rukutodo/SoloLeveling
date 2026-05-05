'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { GiMuscleUp, GiHouse, GiWeightLiftingUp } from 'react-icons/gi';
import { MdTimer, MdFitnessCenter, MdClose, MdTrendingUp } from 'react-icons/md';
import exercisesData from '@/lib/data/exercises.json';
import styles from './workouts.module.css';

interface Exercise {
  id: string; name: string; mode: string; muscle: string; difficulty: string;
  description: string; steps: string[]; sets: number; reps: number; restSeconds: number; tips: string[];
}

interface WorkoutExercise { exerciseId: string; name: string; sets: number; reps: number; weight?: number; }
interface WorkoutLog { _id: string; date: string; mode: string; exercises: WorkoutExercise[]; duration: number; notes?: string; }

export default function WorkoutsPage() {
  const { status } = useSession();
  const [mode, setMode] = useState<'home' | 'gym'>('home');
  const [muscleFilter, setMuscleFilter] = useState('All');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [workoutExercises, setWorkoutExercises] = useState<WorkoutExercise[]>([]);
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [history, setHistory] = useState<WorkoutLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });

  const exercises: Exercise[] = exercisesData;
  const filtered = exercises.filter((e) => e.mode === mode && (muscleFilter === 'All' || e.muscle === muscleFilter));
  const muscles = ['All', ...new Set(exercises.filter((e) => e.mode === mode).map((e) => e.muscle))];

  useEffect(() => {
    if (status === 'authenticated') { fetchData(); }
  }, [status]);

  const fetchData = async () => {
    const [wRes, uRes] = await Promise.all([fetch('/api/workouts'), fetch('/api/user')]);
    if (wRes.ok) { const d = await wRes.json(); setHistory(d.workouts); }
    if (uRes.ok) { const d = await uRes.json(); setSidebarData({ userName: d.stats.name, level: d.stats.level, xp: d.stats.xp, xpToNext: d.stats.xpToNext, rank: d.stats.rank, title: d.stats.title, rankColor: d.stats.rankColor }); }
  };

  const addToWorkout = (exercise: Exercise) => {
    if (workoutExercises.find((e) => e.exerciseId === exercise.id)) return;
    setWorkoutExercises([...workoutExercises, { exerciseId: exercise.id, name: exercise.name, sets: exercise.sets, reps: exercise.reps }]);
  };

  const removeFromWorkout = (id: string) => {
    setWorkoutExercises(workoutExercises.filter((e) => e.exerciseId !== id));
  };

  const updateExercise = (id: string, field: string, value: number) => {
    setWorkoutExercises(workoutExercises.map((e) => e.exerciseId === id ? { ...e, [field]: value } : e));
  };

  const saveWorkout = async () => {
    if (workoutExercises.length === 0 || !duration) return;
    setSaving(true);
    try {
      const res = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, exercises: workoutExercises, duration: Number(duration), notes }),
      });
      if (res.ok) { setWorkoutExercises([]); setDuration(''); setNotes(''); fetchData(); }
    } catch (error) { console.error('Save error:', error); }
    finally { setSaving(false); }
  };

  const getDifficultyColor = (d: string) => d === 'Beginner' ? 'sl-badge-green' : d === 'Intermediate' ? 'sl-badge-gold' : 'sl-badge-red';

  if (status === 'loading') return null;

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className="sl-page-header">
          <h1 className="sl-page-title">💪 Workout System</h1>
          <p className="sl-page-subtitle">[SYSTEM] Choose your training ground</p>
        </div>

        {/* Mode Toggle */}
        <div className={styles.modeToggle}>
          <button className={`${styles.modeBtn} ${mode === 'home' ? styles.modeBtnActive : ''}`} onClick={() => { setMode('home'); setMuscleFilter('All'); }}>
            <GiHouse /> Home
          </button>
          <button className={`${styles.modeBtn} ${mode === 'gym' ? styles.modeBtnActive : ''}`} onClick={() => { setMode('gym'); setMuscleFilter('All'); }}>
            <GiWeightLiftingUp /> Gym
          </button>
        </div>

        {/* Muscle Filter */}
        <div className={styles.filterRow} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {muscles.map((m) => (
              <button key={m} className={`sl-btn ${muscleFilter === m ? 'sl-btn-primary' : 'sl-btn-ghost'}`} onClick={() => setMuscleFilter(m)} style={{ fontSize: '0.75rem' }}>{m}</button>
            ))}
          </div>
          <button 
            className="sl-btn sl-btn-secondary" 
            style={{ border: '1px solid var(--sl-purple-glow)', color: 'var(--sl-purple)' }}
            onClick={async () => {
              const res = await fetch('/api/ai/advisor', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'workout', data: { mode, muscleFilter, level: sidebarData.level } })
              });
              if (res.ok) {
                const d = await res.json();
                alert(`[SYSTEM SUGGESTION: ${d.analysis.routineName}]\nFocus: ${d.analysis.focus}\n\nEXERCISES:\n${d.analysis.exercises.map((e: any) => `- ${e.name} (${e.sets}x${e.reps}): ${e.reason}`).join('\n')}\n\n[ADVISOR TIP]: ${d.analysis.advisorTip}`);
              }
            }}
          >
            <MdTrendingUp /> System Suggestion
          </button>
        </div>

        <div className={styles.layout}>
          {/* Exercise Browser */}
          <div>
            <h2 className="sl-section-title">Exercises</h2>
            <div className={styles.exerciseGrid}>
              {filtered.map((ex) => (
                <div key={ex.id} className={`sl-panel ${styles.exerciseCard}`} onClick={() => setSelectedExercise(ex)}>
                  <div className={styles.exerciseHeader}>
                    <GiMuscleUp className={styles.exerciseIcon} />
                    <span className={`sl-badge ${getDifficultyColor(ex.difficulty)}`}>{ex.difficulty}</span>
                  </div>
                  <div className={styles.exerciseName}>{ex.name}</div>
                  <div className={styles.exerciseMeta}>{ex.muscle} • {ex.sets}×{ex.reps}</div>
                  <button className="sl-btn sl-btn-secondary" onClick={(e) => { e.stopPropagation(); addToWorkout(ex); }} style={{ marginTop: '8px', width: '100%', fontSize: '0.75rem' }}>+ Add</button>
                </div>
              ))}
            </div>
          </div>

          {/* Workout Builder */}
          <div>
            <h2 className="sl-section-title">Current Workout</h2>
            <div className="sl-panel" style={{ padding: '20px' }}>
              {workoutExercises.length === 0 ? (
                <div className="sl-empty"><div className="sl-empty-text">[SYSTEM] Add exercises to build your workout</div></div>
              ) : (
                <div className={styles.workoutList}>
                  {workoutExercises.map((ex) => (
                    <div key={ex.exerciseId} className={`sl-panel ${styles.workoutItem}`}>
                      <div className={styles.workoutItemHeader}>
                        <div className={styles.workoutItemName}>{ex.name}</div>
                        <button 
                          type="button"
                          className="sl-btn sl-btn-ghost" 
                          onClick={() => removeFromWorkout(ex.exerciseId)} 
                          style={{ padding: '4px', color: 'var(--sl-red)' }}
                        >
                          <MdClose />
                        </button>
                      </div>
                      
                      <div className={styles.workoutInputGrid}>
                        <div className={styles.inputGroup}>
                          <label className="sl-label">Sets</label>
                          <input 
                            className="sl-input" 
                            type="number" 
                            value={ex.sets} 
                            onChange={(e) => updateExercise(ex.exerciseId, 'sets', Number(e.target.value))} 
                          />
                        </div>
                        <div className={styles.inputGroup}>
                          <label className="sl-label">Reps</label>
                          <input 
                            className="sl-input" 
                            type="number" 
                            value={ex.reps} 
                            onChange={(e) => updateExercise(ex.exerciseId, 'reps', Number(e.target.value))} 
                          />
                        </div>
                        <div className={styles.inputGroup}>
                          <label className="sl-label">{mode === 'gym' ? 'Weight (kg)' : 'Added Weight'}</label>
                          <input 
                            className="sl-input" 
                            type="number" 
                            value={ex.weight || ''} 
                            onChange={(e) => updateExercise(ex.exerciseId, 'weight', Number(e.target.value))} 
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className={`sl-panel ${styles.workoutSummaryBox}`}>
                    <div className="sl-grid-2">
                      <div>
                        <label className="sl-label">Session Duration (min)</label>
                        <input 
                          className="sl-input" 
                          type="number" 
                          value={duration} 
                          onChange={(e) => setDuration(e.target.value)} 
                          placeholder="e.g. 45" 
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <div style={{ color: 'var(--sl-text-ghost)', fontSize: '0.75rem', marginBottom: '10px' }}>
                          [SYSTEM] XP will be awarded upon completion.
                        </div>
                      </div>
                    </div>
                    <div style={{ marginTop: '16px' }}>
                      <label className="sl-label">Hunter's Notes</label>
                      <textarea 
                        className="sl-input" 
                        value={notes} 
                        onChange={(e) => setNotes(e.target.value)} 
                        placeholder="How did the training go?"
                        style={{ resize: 'none', height: '80px' }}
                      />
                    </div>
                    <button 
                      type="button"
                      className="sl-btn sl-btn-primary" 
                      onClick={saveWorkout} 
                      disabled={saving} 
                      style={{ width: '100%', marginTop: '20px' }}
                    >
                      {saving ? 'TRANSFORMING...' : '⚡ COMPLETE TRAINING'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Exercise Detail Modal */}
        {selectedExercise && (
          <div className="sl-modal-overlay" onClick={() => setSelectedExercise(null)}>
            <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sl-flex-between" style={{ marginBottom: '16px' }}>
                <h3 className="sl-modal-title">{selectedExercise.name}</h3>
                <button className="sl-btn sl-btn-ghost" onClick={() => setSelectedExercise(null)}><MdClose /></button>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <span className={`sl-badge ${getDifficultyColor(selectedExercise.difficulty)}`}>{selectedExercise.difficulty}</span>
                <span className="sl-badge sl-badge-blue">{selectedExercise.muscle}</span>
                <span className="sl-badge sl-badge-purple">{selectedExercise.mode}</span>
              </div>
              <p style={{ color: 'var(--sl-text-dim)', marginBottom: '16px' }}>{selectedExercise.description}</p>
              <h4 className="sl-section-title" style={{ fontSize: '0.6875rem' }}>Steps</h4>
              <ol className={styles.stepsList}>{selectedExercise.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              <div style={{ display: 'flex', gap: '16px', margin: '16px 0' }}>
                <div className={styles.metaBox}><MdFitnessCenter /> {selectedExercise.sets} × {selectedExercise.reps}</div>
                <div className={styles.metaBox}><MdTimer /> {selectedExercise.restSeconds}s rest</div>
              </div>
              {selectedExercise.tips.length > 0 && (
                <>
                  <h4 className="sl-section-title" style={{ fontSize: '0.6875rem' }}>Tips</h4>
                  <ul className={styles.tipsList}>{selectedExercise.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
                </>
              )}
              <button className="sl-btn sl-btn-primary" onClick={() => { addToWorkout(selectedExercise); setSelectedExercise(null); }} style={{ width: '100%', marginTop: '16px' }}>+ Add to Workout</button>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="sl-panel" style={{ padding: '24px', marginTop: '24px' }}>
            <h2 className="sl-section-title">Workout History</h2>
            {history.map((w) => (
              <div key={w._id} className={styles.historyItem}>
                <div className={styles.historyHeader}>
                  <span className="sl-badge sl-badge-blue" style={{ textTransform: 'capitalize' }}>{w.mode}</span>
                  <span style={{ color: 'var(--sl-text-dim)', fontSize: '0.8125rem' }}>{new Date(w.date).toLocaleDateString()}</span>
                  <span style={{ color: 'var(--sl-text-ghost)', fontSize: '0.75rem' }}>{w.duration} min</span>
                </div>
                <div className={styles.historyExercises}>
                  {w.exercises.map((e, i) => (
                    <span key={i} className={styles.historyExTag}>{e.name} ({e.sets}×{e.reps}{e.weight ? ` @${e.weight}kg` : ''})</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
