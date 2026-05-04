'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { GiMeal } from 'react-icons/gi';
import { MdCloudUpload, MdDelete, MdFastfood } from 'react-icons/md';
import styles from './calories.module.css';

interface FoodEntry {
  _id: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: string;
  source: string;
  confidence?: number;
}

interface Analysis {
  identified: boolean;
  confidence: number;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  needsInput: string | null;
}

export default function CaloriesPage() {
  const { status } = useSession();
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [step, setStep] = useState<'idle' | 'analyzing' | 'result' | 'dish_name' | 'ingredients'>('idle');
  const [dishName, setDishName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ foodName: '', calories: '', protein: '', carbs: '', fat: '' });
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchEntries();
      fetchUserData();
    }
  }, [status, selectedDate]);

  const fetchUserData = async () => {
    const res = await fetch('/api/user');
    if (res.ok) {
      const data = await res.json();
      setSidebarData({ userName: data.stats.name, level: data.stats.level, xp: data.stats.xp, xpToNext: data.stats.xpToNext, rank: data.stats.rank, title: data.stats.title, rankColor: data.stats.rankColor });
    }
  };

  const fetchEntries = async () => {
    try {
      const res = await fetch(`/api/calories?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMimeType(file.type);
    setPreviewUrl(URL.createObjectURL(file));

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImageData(base64);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async () => {
    if (!imageData) return;
    setAnalyzing(true);
    setStep('analyzing');

    try {
      const res = await fetch('/api/calories/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mimeType, step: 'image' }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
        if (data.analysis.needsInput === 'dish_name') {
          setStep('dish_name');
        } else if (data.analysis.needsInput === 'ingredients') {
          setStep('ingredients');
        } else {
          setStep('result');
        }
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const submitDishName = async () => {
    if (!dishName) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/calories/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData, mimeType, dishName, step: 'dish_name' }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
        if (data.analysis.needsInput === 'ingredients') {
          setStep('ingredients');
        } else {
          setStep('result');
        }
      }
    } catch (error) {
      console.error('Dish name error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const submitIngredients = async () => {
    if (!ingredients) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/calories/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredients, step: 'ingredients' }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
        setStep('result');
      }
    } catch (error) {
      console.error('Ingredients error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveEntry = async (source: 'ai' | 'manual' = 'ai') => {
    const entryData = source === 'ai' && analysis
      ? { foodName: analysis.foodName, calories: analysis.calories, protein: analysis.protein, carbs: analysis.carbs, fat: analysis.fat, source: 'ai', confidence: analysis.confidence, mealType, date: selectedDate }
      : { foodName: manualForm.foodName, calories: Number(manualForm.calories), protein: Number(manualForm.protein), carbs: Number(manualForm.carbs), fat: Number(manualForm.fat), source: 'manual', mealType, date: selectedDate };

    try {
      const res = await fetch('/api/calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData),
      });
      if (res.ok) {
        resetForm();
        fetchEntries();
        fetchUserData();
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await fetch(`/api/calories?id=${id}`, { method: 'DELETE' });
      fetchEntries();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const resetForm = () => {
    setStep('idle');
    setAnalysis(null);
    setPreviewUrl(null);
    setImageData(null);
    setDishName('');
    setIngredients('');
    setShowManual(false);
    setManualForm({ foodName: '', calories: '', protein: '', carbs: '', fat: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);
  const totalProtein = entries.reduce((sum, e) => sum + e.protein, 0);
  const totalCarbs = entries.reduce((sum, e) => sum + e.carbs, 0);
  const totalFat = entries.reduce((sum, e) => sum + e.fat, 0);

  if (status === 'loading') return null;

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className="sl-page-header">
          <h1 className="sl-page-title">🔥 Calorie Tracker</h1>
          <p className="sl-page-subtitle">[SYSTEM] AI-powered nutrition analysis</p>
        </div>

        {/* Date Selector + Summary */}
        <div className={styles.topBar}>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="sl-input" style={{ maxWidth: '200px' }} />
          <div className={styles.daySummary}>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Calories</span><span className={styles.summaryValue}>{totalCalories}</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Protein</span><span className={styles.summaryValue}>{totalProtein}g</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Carbs</span><span className={styles.summaryValue}>{totalCarbs}g</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Fat</span><span className={styles.summaryValue}>{totalFat}g</span></div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="sl-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 className="sl-section-title">Log Meal</h2>
          <div className={styles.mealTypeRow}>
            {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => (
              <button key={type} className={`sl-btn ${mealType === type ? 'sl-btn-primary' : 'sl-btn-ghost'}`} onClick={() => setMealType(type)} style={{ textTransform: 'capitalize' }}>{type}</button>
            ))}
          </div>

          <div className={styles.uploadArea}>
            {!previewUrl ? (
              <div className={styles.dropzone} onClick={() => fileInputRef.current?.click()}>
                <MdCloudUpload className={styles.uploadIcon} />
                <p>Upload food image for AI analysis</p>
                <span className={styles.dropzoneSub}>or click to browse</span>
              </div>
            ) : (
              <div className={styles.previewContainer}>
                <img src={previewUrl} alt="Food preview" className={styles.previewImage} />
                {step === 'idle' && <button className="sl-btn sl-btn-primary" onClick={analyzeImage}>⚡ Analyze with AI</button>}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
          </div>

          {/* Analysis Steps */}
          {analyzing && (
            <div className={styles.analyzeLoading}>
              <div className={styles.spinner} />
              <span>Analyzing food...</span>
            </div>
          )}

          {step === 'dish_name' && (
            <div className={styles.followUp}>
              <p className={styles.followUpText}>[SYSTEM] Could not clearly identify the food. What is this dish called?</p>
              <div className={styles.followUpRow}>
                <input className="sl-input" value={dishName} onChange={(e) => setDishName(e.target.value)} placeholder="Enter dish name..." />
                <button className="sl-btn sl-btn-primary" onClick={submitDishName}>Submit</button>
              </div>
            </div>
          )}

          {step === 'ingredients' && (
            <div className={styles.followUp}>
              <p className={styles.followUpText}>[SYSTEM] Still unclear. Please list the main ingredients used.</p>
              <div className={styles.followUpRow}>
                <input className="sl-input" value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="e.g. rice, chicken, tomato, oil..." />
                <button className="sl-btn sl-btn-primary" onClick={submitIngredients}>Submit</button>
              </div>
            </div>
          )}

          {step === 'result' && analysis && (
            <div className={styles.resultCard}>
              <div className={styles.resultHeader}>
                <GiMeal className={styles.resultIcon} />
                <div>
                  <div className={styles.resultName}>{analysis.foodName}</div>
                  <div className={styles.resultConfidence}>Confidence: {Math.round((analysis.confidence || 0) * 100)}%</div>
                </div>
              </div>
              <div className={styles.macroGrid}>
                <div className={styles.macroItem}><span className={styles.macroValue}>{analysis.calories}</span><span className={styles.macroLabel}>kcal</span></div>
                <div className={styles.macroItem}><span className={styles.macroValue}>{analysis.protein}g</span><span className={styles.macroLabel}>Protein</span></div>
                <div className={styles.macroItem}><span className={styles.macroValue}>{analysis.carbs}g</span><span className={styles.macroLabel}>Carbs</span></div>
                <div className={styles.macroItem}><span className={styles.macroValue}>{analysis.fat}g</span><span className={styles.macroLabel}>Fat</span></div>
              </div>
              <div className={styles.resultActions}>
                <button className="sl-btn sl-btn-primary" onClick={() => saveEntry('ai')}>✓ Save Entry</button>
                <button className="sl-btn sl-btn-ghost" onClick={resetForm}>✕ Discard</button>
              </div>
            </div>
          )}

          {/* Manual Entry Toggle */}
          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <button className="sl-btn sl-btn-ghost" onClick={() => setShowManual(!showManual)}>
              <MdFastfood /> {showManual ? 'Hide' : 'Manual Entry'}
            </button>
          </div>

          {showManual && (
            <div className={styles.manualForm}>
              <input className="sl-input" placeholder="Food name" value={manualForm.foodName} onChange={(e) => setManualForm({ ...manualForm, foodName: e.target.value })} />
              <div className={styles.manualRow}>
                <input className="sl-input" type="number" placeholder="Calories" value={manualForm.calories} onChange={(e) => setManualForm({ ...manualForm, calories: e.target.value })} />
                <input className="sl-input" type="number" placeholder="Protein (g)" value={manualForm.protein} onChange={(e) => setManualForm({ ...manualForm, protein: e.target.value })} />
                <input className="sl-input" type="number" placeholder="Carbs (g)" value={manualForm.carbs} onChange={(e) => setManualForm({ ...manualForm, carbs: e.target.value })} />
                <input className="sl-input" type="number" placeholder="Fat (g)" value={manualForm.fat} onChange={(e) => setManualForm({ ...manualForm, fat: e.target.value })} />
              </div>
              <button className="sl-btn sl-btn-primary" onClick={() => saveEntry('manual')}>Save Manual Entry</button>
            </div>
          )}
        </div>

        {/* Daily Log */}
        <div className="sl-panel" style={{ padding: '24px' }}>
          <h2 className="sl-section-title">Today&apos;s Log</h2>
          {loading ? (
            <div className="sl-skeleton" style={{ height: '100px' }} />
          ) : entries.length > 0 ? (
            <table className="sl-table">
              <thead>
                <tr>
                  <th>Food</th>
                  <th>Meal</th>
                  <th>Calories</th>
                  <th>P / C / F</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id}>
                    <td>{entry.foodName}</td>
                    <td><span className="sl-badge sl-badge-blue" style={{ textTransform: 'capitalize' }}>{entry.mealType}</span></td>
                    <td style={{ fontFamily: 'var(--sl-font-display)', color: 'var(--sl-accent-blue)' }}>{entry.calories}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--sl-text-secondary)' }}>{entry.protein}g / {entry.carbs}g / {entry.fat}g</td>
                    <td><span className={`sl-badge ${entry.source === 'ai' ? 'sl-badge-purple' : 'sl-badge-green'}`}>{entry.source}</span></td>
                    <td><button className="sl-btn sl-btn-ghost" onClick={() => deleteEntry(entry._id)} style={{ padding: '4px 8px' }}><MdDelete /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--sl-text-muted)' }}>No meals logged for this date</div>
          )}
        </div>
      </main>
    </div>
  );
}
