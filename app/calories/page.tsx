'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import DarkDatePicker from '@/components/DarkDatePicker';
import { motion } from 'framer-motion';
import { GiMeal } from 'react-icons/gi';
import { MdCloudUpload, MdDelete, MdFastfood, MdCameraAlt, MdLocalFireDepartment } from 'react-icons/md';
import { FaBolt } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './calories.module.css';

interface FoodEntry {
  _id: string;
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sugar?: number;
  caffeine?: number;
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
  sugar?: number;
  caffeine?: number;
  needsInput: string | null;
  quantityQuestion?: string | null;
}

export default function CaloriesPage() {
  const { status } = useSession();
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [steps, setSteps] = useState(0);
  const [mealType, setMealType] = useState('breakfast');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [step, setStep] = useState<'idle' | 'analyzing' | 'result' | 'dish_name' | 'ingredients' | 'quantity'>('idle');
  const [dishName, setDishName] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [quantity, setQuantity] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ foodName: '', calories: '', protein: '', carbs: '', fat: '', sugar: '', caffeine: '' });
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });
  const [user, setUser] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showQuickModal, setShowQuickModal] = useState(false);
  const [selectedQuickItem, setSelectedQuickItem] = useState<any>(null);
  const [quickQuantity, setQuickQuantity] = useState('1');
  const [isAddingQuick, setIsAddingQuick] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const QUICK_ITEMS = [
    { id: 'eggs',      name: 'Eggs',      icon: '🥚', cals: 78,  p: 6,   c: 0.6, f: 5,   caf: 0,  unit: 'large' },
    { id: 'green-tea', name: 'Green Tea', icon: '🍵', cals: 2,   p: 0,   c: 0,   f: 0,   caf: 35, unit: 'cup'   },
    { id: 'diet-coke', name: 'Diet Coke', icon: '🥤', cals: 0,   p: 0,   c: 0,   f: 0,   caf: 10, unit: 'ml'    },
    { id: 'apple',     name: 'Apple',     icon: '🍎', cals: 95,  p: 0.5, c: 25,  f: 0.3, caf: 0,  unit: 'medium'},
    { id: 'oats',      name: 'Oats',      icon: '🥣', cals: 150, p: 5,   c: 27,  f: 3,   caf: 0,  unit: 'serving (40g)' },
  ];

  const [chartView, setChartView] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [chartData, setChartData] = useState<Array<{ label: string; steps: number; calories: number }>>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const fetchChartData = async () => {
    setLoadingChart(true);
    try {
      const res = await fetch(`/api/steps/analytics?view=${chartView}`);
      if (res.ok) {
        const data = await res.json();
        setChartData(data.dataPoints || []);
      }
    } catch (err) {
      console.error('[SYSTEM] Chart fetch error:', err);
    } finally {
      setLoadingChart(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
      fetchUserData();
    }
  }, [status, selectedDate]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchChartData();
    }
  }, [status, chartView]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_FIT_SYNC_SUCCESS') {
        fetchData();
        fetchUserData();
        fetchChartData();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedDate]);

  const syncWithGoogleFit = async () => {
    if (user?.googleRefreshToken) {
      setIsSyncing(true);
      try {
        const res = await fetch('/api/steps/google-fit/sync');
        if (res.ok) {
          const data = await res.json();
          fetchData();
          fetchUserData();
          fetchChartData();
          // We can show a notification or just let it update
        } else {
          openAuthPopup();
        }
      } catch (err) {
        openAuthPopup();
      } finally {
        setIsSyncing(false);
      }
    } else {
      openAuthPopup();
    }
  };

  const openAuthPopup = () => {
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    window.open(
      `/api/steps/google-fit/auth?date=${selectedDate}`,
      'GoogleFitSync',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  };

  const fetchUserData = async () => {
    const res = await fetch('/api/user');
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      setSidebarData({ userName: data.stats.name, level: data.stats.level, xp: data.stats.xp, xpToNext: data.stats.xpToNext, rank: data.stats.rank, title: data.stats.title, rankColor: data.stats.rankColor });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, sRes] = await Promise.all([
        fetch(`/api/calories?date=${selectedDate}`),
        fetch(`/api/steps?date=${selectedDate}`)
      ]);
      if (cRes.ok) {
        const data = await cRes.json();
        setEntries(data.entries);
      }
      if (sRes.ok) {
        const data = await sRes.json();
        setSteps(data.stepsData?.steps || 0);
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
        } else if (data.analysis.needsInput === 'quantity') {
          setStep('quantity');
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
        } else if (data.analysis.needsInput === 'quantity') {
          setStep('quantity');
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

  const submitQuantity = async () => {
    if (!quantity || !analysis?.foodName) return;
    setAnalyzing(true);
    try {
      const res = await fetch('/api/calories/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, baseFood: analysis.foodName, step: 'quantity' }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data.analysis);
        setStep('result');
      }
    } catch (error) {
      console.error('Quantity error:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveEntry = async (source: 'ai' | 'manual' = 'ai') => {
    const entryData = source === 'ai' && analysis
      ? { foodName: analysis.foodName, calories: analysis.calories, protein: analysis.protein, carbs: analysis.carbs, fat: analysis.fat, sugar: analysis.sugar || 0, caffeine: analysis.caffeine || 0, source: 'ai', confidence: analysis.confidence, mealType, date: selectedDate }
      : { foodName: manualForm.foodName, calories: Number(manualForm.calories), protein: Number(manualForm.protein), carbs: Number(manualForm.carbs), fat: Number(manualForm.fat), sugar: Number(manualForm.sugar) || 0, caffeine: Number(manualForm.caffeine) || 0, source: 'manual', mealType, date: selectedDate };

    try {
      const res = await fetch('/api/calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData),
      });
      if (res.ok) {
        resetForm();
        fetchData();
        fetchUserData();
      }
    } catch (error) {
      console.error('Save error:', error);
    }
  };

  const handleQuickAdd = async () => {
    if (!selectedQuickItem || isAddingQuick) return;
    setIsAddingQuick(true);
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
          mealType: mealType,
          source: 'manual',
          date: selectedDate
        }),
      });

      if (res.ok) {
        setShowQuickModal(false);
        setQuickQuantity('1');
        fetchData();
        fetchUserData();
      }
    } catch (err) {
      console.error('Quick add error:', err);
    } finally {
      setIsAddingQuick(false);
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      await fetch(`/api/calories?id=${id}`, { method: 'DELETE' });
      fetchData();
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
    setQuantity('');
    setShowManual(false);
    setManualForm({ foodName: '', calories: '', protein: '', carbs: '', fat: '', sugar: '', caffeine: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const totalCalories = entries.reduce((sum, e) => sum + e.calories, 0);
  const totalProtein = entries.reduce((sum, e) => sum + e.protein, 0);
  const totalCarbs = entries.reduce((sum, e) => sum + e.carbs, 0);
  const totalFat = entries.reduce((sum, e) => sum + e.fat, 0);
  const totalSugar = entries.reduce((sum, e) => sum + (e.sugar || 0), 0);
  const totalCaffeine = entries.reduce((sum, e) => sum + (e.caffeine || 0), 0);

  if (status === 'loading') return null;

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className="sl-page-header">
          <h1 className="sl-page-title"><MdLocalFireDepartment style={{ verticalAlign: 'middle' }} /> Calorie Tracker</h1>
          <p className="sl-page-subtitle">[SYSTEM] AI-powered nutrition analysis</p>
        </div>

        {/* Date Selector + Summary */}
        <div className={styles.topBar}>
          <DarkDatePicker value={selectedDate} onChange={setSelectedDate} />
          <div className={styles.daySummary}>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Calories</span><span className={styles.summaryValue}>{totalCalories}</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Protein</span><span className={styles.summaryValue}>{totalProtein}g</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Carbs</span><span className={styles.summaryValue}>{totalCarbs}g</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Fat</span><span className={styles.summaryValue}>{totalFat}g</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Sugar</span><span className={styles.summaryValue} style={{ color: '#ff7eb9' }}>{totalSugar}g</span></div>
            <div className={styles.summaryItem}><span className={styles.summaryLabel}>Caffeine</span><span className={styles.summaryValue} style={{ color: '#e28743' }}>{totalCaffeine}mg</span></div>
          </div>
        </div>

        {/* Steps Tracker Section */}
        <div className="sl-panel" style={{ padding: '24px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ flex: 1 }}>
            <h2 className="sl-section-title" style={{ marginBottom: '16px' }}>Steps Counter</h2>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="number" 
                value={steps} 
                className="sl-input" 
                placeholder="No steps recorded..." 
                readOnly={true}
                style={{ 
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderColor: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--sl-text-dim)',
                  cursor: 'not-allowed'
                }}
              />
              <button 
                className="sl-btn sl-btn-secondary" 
                onClick={syncWithGoogleFit}
                style={{ 
                  background: 'linear-gradient(135deg, #1a73e8, #ea4335, #fbbc05, #34a853)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 0 15px rgba(26, 115, 232, 0.3)',
                  transition: 'all 0.3s ease'
                }}
              >
                <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: '#ffffff' }}>
                  <path d="M13.5,5.5L12,7L10.5,5.5L12,4L13.5,5.5M12,19.2C10.6,19.2 9.5,18.1 9.5,16.7C9.5,15.7 10.1,14.8 11,14.4V11H13V14.4C13.9,14.8 14.5,15.7 14.5,16.7C14.5,18.1 13.4,19.2 12,19.2M18.8,11.3L15.3,13.8L16,18L12.5,15.5L9,18L9.7,13.8L6.2,11.3L10.4,11L12,7L13.6,11L18.8,11.3Z" />
                </svg>
                Sync with Google Fit
              </button>
            </div>
          </div>
          <div style={{ padding: '20px', background: 'var(--sl-bg-base)', borderRadius: '16px', border: '1px solid var(--sl-glass-border)', textAlign: 'center', minWidth: '180px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--sl-text-ghost)', textTransform: 'uppercase', letterSpacing: '1px' }}>Movement Burn</div>
            <div style={{ fontFamily: 'var(--sl-font-display)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--sl-blue)' }}>{Math.round(steps * 0.04)} <span style={{ fontSize: '0.8rem' }}>kcal</span></div>
          </div>
        </div>

        {/* Steps & Calories Trend Panel */}
        <div className="sl-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <div className="sl-flex-between" style={{ marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h2 className="sl-section-title" style={{ margin: 0 }}>Physical Activity Trend</h2>
              <p style={{ color: 'var(--sl-text-ghost)', fontSize: '0.75rem', marginTop: '4px', letterSpacing: '0.5px' }}>[SYSTEM] Step Count & Active Calories Expended Analysis</p>
            </div>
            
            {/* View Selector pills */}
            <div style={{ display: 'flex', gap: '8px', background: 'rgba(255, 255, 255, 0.02)', padding: '4px', borderRadius: '8px', border: '1px solid var(--sl-glass-border)' }}>
              {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((view) => (
                <button
                  key={view}
                  onClick={() => setChartView(view)}
                  style={{
                    background: chartView === view ? 'var(--sl-blue)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    color: chartView === view ? '#ffffff' : 'var(--sl-text-ghost)',
                    padding: '6px 12px',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: chartView === view ? '0 0 10px rgba(0, 212, 255, 0.3)' : 'none'
                  }}
                >
                  {view}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: '100%', height: 260, position: 'relative' }}>
            {loadingChart ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--sl-text-ghost)', fontFamily: 'var(--sl-font-mono)', fontSize: '0.8rem', letterSpacing: '1.5px' }}>
                [SYSTEM] AGGREGATING DATA...
              </div>
            ) : chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                  <XAxis dataKey="label" stroke="var(--sl-text-ghost)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="var(--sl-text-ghost)" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="var(--sl-text-ghost)" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--sl-bg-sub)',
                      border: '1px solid var(--sl-glass-border)',
                      borderRadius: '12px',
                      color: 'var(--sl-text-bright)',
                      boxShadow: 'var(--sl-shadow-lg)',
                      fontFamily: 'var(--sl-font-mono)',
                      fontSize: '0.75rem'
                    }}
                    labelStyle={{ color: 'var(--sl-text-main)', fontWeight: 800, marginBottom: '4px' }}
                  />
                  <Bar yAxisId="left" dataKey="steps" fill="var(--sl-blue)" radius={[4, 4, 0, 0]} name="Steps" />
                  <Bar yAxisId="right" dataKey="calories" fill="#ea4335" radius={[4, 4, 0, 0]} name="Calories (kcal)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--sl-text-ghost)', fontFamily: 'var(--sl-font-mono)', fontSize: '0.8rem', letterSpacing: '1px' }}>
                [SYSTEM] NO PHYSICAL LOGS DETECTED. SYNC WITH GOOGLE FIT.
              </div>
            )}
          </div>
        </div>

        {/* Upload Section */}
        <div className="sl-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <h2 className="sl-section-title">Quick Add Widget</h2>
          <div className={styles.quickAddGrid}>
            {QUICK_ITEMS.map((item) => (
              <motion.div
                key={item.id}
                className={styles.quickAddItem}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedQuickItem(item);
                  setShowQuickModal(true);
                }}
              >
                <span style={{ fontSize: '1.75rem' }}>{item.icon}</span>
                <span className={styles.itemName}>{item.name}</span>
                <span className={styles.itemCals}>{item.cals} cal</span>
              </motion.div>
            ))}
          </div>

          <h2 className="sl-section-title">AI Log / Manual</h2>
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
                {step === 'idle' && <button className="sl-btn sl-btn-primary" onClick={analyzeImage}><FaBolt /> Analyze with AI</button>}
              </div>
            )}
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              capture="environment"
              onChange={handleFileSelect} 
              style={{ display: 'none' }} 
            />
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

          {step === 'quantity' && (
            <div className={styles.followUp}>
              <p className={styles.followUpText}>[SYSTEM] {analysis?.quantityQuestion || 'What is the package quantity or portion size?'}</p>
              <div className={styles.followUpRow}>
                <input className="sl-input" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g. 50g, 1 packet, 2 bars, 150ml..." />
                <button className="sl-btn sl-btn-primary" onClick={submitQuantity}>Calculate breakup</button>
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
                <div className={styles.macroItem}><span className={styles.macroValue} style={{ color: '#ff7eb9' }}>{analysis.sugar || 0}g</span><span className={styles.macroLabel}>Sugar</span></div>
                <div className={styles.macroItem}><span className={styles.macroValue} style={{ color: '#e28743' }}>{analysis.caffeine || 0}mg</span><span className={styles.macroLabel}>Caffeine</span></div>
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
                <input className="sl-input" type="number" placeholder="Sugar (g)" value={manualForm.sugar} onChange={(e) => setManualForm({ ...manualForm, sugar: e.target.value })} />
                <input className="sl-input" type="number" placeholder="Caffeine (mg)" value={manualForm.caffeine} onChange={(e) => setManualForm({ ...manualForm, caffeine: e.target.value })} />
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
                  <th>P / C / F / S / C</th>
                  <th>Source</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id}>
                    <td>{entry.foodName}</td>
                    <td><span className="sl-badge sl-badge-blue" style={{ textTransform: 'capitalize' }}>{entry.mealType}</span></td>
                    <td style={{ fontFamily: 'var(--sl-font-display)', color: 'var(--sl-blue)' }}>{entry.calories}</td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--sl-text-dim)' }}>
                      {entry.protein}g / {entry.carbs}g / {entry.fat}g / <span style={{ color: '#ff7eb9' }}>{entry.sugar || 0}g</span> / <span style={{ color: '#e28743' }}>{entry.caffeine || 0}mg</span>
                    </td>
                    <td><span className={`sl-badge ${entry.source === 'ai' ? 'sl-badge-purple' : 'sl-badge-green'}`}>{entry.source}</span></td>
                    <td><button className="sl-btn sl-btn-ghost" onClick={() => deleteEntry(entry._id)} style={{ padding: '4px 8px' }}><MdDelete /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="sl-empty"><div className="sl-empty-text">[SYSTEM] No meals logged for this date</div></div>
          )}
        </div>

        {/* Mobile FAB for Camera */}
        <button 
          className={styles.mobileCameraBtn}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Scan Food"
        >
          <MdCameraAlt />
        </button>

        {/* Quick Add Quantity Modal */}
        {showQuickModal && selectedQuickItem && (
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
                    setShowQuickModal(false);
                    setQuickQuantity('1');
                  }}
                  disabled={isAddingQuick}
                >
                  Cancel
                </button>
                <button 
                  className={styles.confirmBtn}
                  onClick={handleQuickAdd}
                  disabled={isAddingQuick}
                >
                  {isAddingQuick ? 'Adding...' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
