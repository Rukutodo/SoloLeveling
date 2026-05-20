'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { MdChevronLeft, MdChevronRight, MdRadioButtonUnchecked, MdCheckCircle, MdMenuBook, MdDeleteOutline } from 'react-icons/md';
import styles from './logbook.module.css';

interface Todo {
  _id: string;
  title: string;
  completed: boolean;
  status: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export default function LogbookPage() {
  const { status: sessionStatus } = useSession();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });

  // Canvas State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [usePressure, setUsePressure] = useState(true);
  const [bgType, setBgType] = useState<'rule' | 'grid' | 'plain'>('rule');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchTodos();
      fetchUserData();
      initCanvas();
    }
  }, [sessionStatus]);

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchDrawing(currentDate);
    }
  }, [currentDate, sessionStatus]);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#2c3e50'; // Dark ink color
        ctx.lineWidth = 3;
        ctxRef.current = ctx;
      }
    }
  };

  const fetchUserData = async () => {
    const res = await fetch('/api/user');
    if (res.ok) {
      const data = await res.json();
      setSidebarData({ userName: data.stats.name, level: data.stats.level, xp: data.stats.xp, xpToNext: data.stats.xpToNext, rank: data.stats.rank, title: data.stats.title, rankColor: data.stats.rankColor });
    }
  };

  const fetchTodos = async () => {
    const res = await fetch('/api/todos');
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos);
    }
  };

  const fetchDrawing = async (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    const res = await fetch(`/api/logbook?date=${dateStr}`);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear previous day
      if (res.ok) {
        const data = await res.json();
        if (data.log && data.log.drawingData) {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
          };
          img.src = data.log.drawingData;
        }
      }
    }
  };

  const saveDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const drawingData = canvas.toDataURL('image/png');
    const dateStr = currentDate.toISOString().split('T')[0];
    
    await fetch('/api/logbook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateStr, drawingData }),
    });
  };

  const triggerSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveDrawing();
    }, 1000); // 1-second debounce auto-save
  };

  const getCoordinates = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.PointerEvent) => {
    const { x, y } = getCoordinates(e);
    ctxRef.current?.beginPath();
    ctxRef.current?.moveTo(x, y);
    setIsDrawing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const { x, y } = getCoordinates(e);
    
    let pressure = 0.5;
    if (usePressure && e.pressure !== undefined && e.pressure > 0) {
      pressure = e.pressure;
    }
    
    if (ctxRef.current) {
      if (tool === 'eraser') {
        ctxRef.current.globalCompositeOperation = 'destination-out';
        ctxRef.current.lineWidth = 30; // Fixed thicker size for eraser
      } else {
        ctxRef.current.globalCompositeOperation = 'source-over';
        ctxRef.current.lineWidth = pressure * 6; // Dynamic thickness based on stylus pressure
      }
      ctxRef.current.lineTo(x, y);
      ctxRef.current.stroke();
    }
  };

  const stopDrawing = (e: React.PointerEvent) => {
    if (isDrawing) {
      ctxRef.current?.closePath();
      setIsDrawing(false);
      e.currentTarget.releasePointerCapture(e.pointerId);
      triggerSave();
    }
  };

  const clearDrawing = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      triggerSave();
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const isSameDay = (dateStr: string, targetDate: Date) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getDate() === targetDate.getDate() &&
           d.getMonth() === targetDate.getMonth() &&
           d.getFullYear() === targetDate.getFullYear();
  };

  const dailyTodos = todos.filter(t => isSameDay(t.createdAt, currentDate));
  const completedToday = todos.filter(t => (t.status === 'Done' || t.completed) && isSameDay(t.updatedAt, currentDate));

  const getBgClass = () => {
    if (bgType === 'grid') return styles.bgGrid;
    if (bgType === 'plain') return styles.bgPlain;
    return styles.bgRule;
  };

  if (sessionStatus === 'loading') return null;

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className="sl-page-header">
          <h1 className="sl-page-title"><MdMenuBook style={{ verticalAlign: 'middle' }} /> Hunter's Logbook</h1>
          <p className="sl-page-subtitle">[SYSTEM] Historical archive of your evolution</p>
        </div>

        <div className={styles.dateNav}>
          <button className={styles.navBtn} onClick={() => changeDate(-1)}>
            <MdChevronLeft style={{ verticalAlign: 'middle' }} /> Previous Day
          </button>
          <div className={styles.dateDisplay}>
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
          <button className={styles.navBtn} onClick={() => changeDate(1)}>
            Next Day <MdChevronRight style={{ verticalAlign: 'middle' }} />
          </button>
        </div>

        <div className={styles.bookWrapper}>
          <div className={styles.book}>
            <div className={styles.canvasControls}>
              <select 
                className="sl-input" 
                value={bgType} 
                onChange={(e) => setBgType(e.target.value as any)}
                style={{ padding: '4px 8px', fontSize: '0.8rem', background: '#fdfbf7', height: 'auto' }}
              >
                <option value="rule">Rule Paper</option>
                <option value="grid">Grid Paper</option>
                <option value="plain">Plain Paper</option>
              </select>
              <button 
                className={`sl-btn ${tool === 'pen' ? 'sl-btn-primary' : 'sl-btn-ghost'}`} 
                onClick={() => setTool('pen')} 
                style={{ padding: '6px 12px', fontSize: '0.8rem', background: tool === 'pen' ? '' : '#fdfbf7' }}
              >
                Pen
              </button>
              <button 
                className={`sl-btn ${tool === 'eraser' ? 'sl-btn-primary' : 'sl-btn-ghost'}`} 
                onClick={() => setTool('eraser')} 
                style={{ padding: '6px 12px', fontSize: '0.8rem', background: tool === 'eraser' ? '' : '#fdfbf7' }}
              >
                Eraser
              </button>
              <button 
                className={`sl-btn ${usePressure ? 'sl-btn-primary' : 'sl-btn-ghost'}`} 
                onClick={() => setUsePressure(!usePressure)} 
                style={{ padding: '6px 12px', fontSize: '0.8rem', background: usePressure ? '' : '#fdfbf7' }}
              >
                {usePressure ? 'Pressure: ON' : 'Pressure: OFF'}
              </button>
              <button className="sl-btn sl-btn-ghost" onClick={clearDrawing} style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#fdfbf7' }}>
                <MdDeleteOutline style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Clear All
              </button>
            </div>
            
            <canvas
              ref={canvasRef}
              className={`${styles.canvasOverlay} ${tool === 'pen' ? styles.penCursor : styles.eraserCursor}`}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
            />

            <div className={`${styles.page} ${styles.leftPage} ${getBgClass()}`}>
              <h2 className={styles.pageTitle}>Daily Directives</h2>
              {dailyTodos.length === 0 ? (
                <div style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: '40px', background: '#fdfbf7', display: 'inline-block', width: '100%' }}>No directives issued on this day.</div>
              ) : (
                dailyTodos.map(todo => (
                  <div key={todo._id} className={styles.entry}>
                    <div className={styles.entryCheckbox}>
                       {(todo.status === 'Done' || todo.completed) ? <MdCheckCircle color="#27ae60" /> : <MdRadioButtonUnchecked />}
                    </div>
                    <div className={`${styles.entryText} ${(todo.status === 'Done' || todo.completed) ? styles.doneText : ''}`}>
                      <div style={{ fontWeight: 600 }}>{todo.title}</div>
                      {todo.note && <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>- {todo.note}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className={`${styles.page} ${styles.rightPage} ${getBgClass()}`}>
              <h2 className={styles.pageTitle}>Conquests</h2>
              {completedToday.length === 0 ? (
                <div style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: '40px', background: '#fdfbf7', display: 'inline-block', width: '100%' }}>No conquests recorded on this day.</div>
              ) : (
                completedToday.map(todo => (
                  <div key={todo._id} className={styles.entry}>
                    <div className={styles.entryCheckbox}>
                       <MdCheckCircle color="#27ae60" />
                    </div>
                    <div className={styles.entryText}>
                      <div style={{ fontWeight: 600 }}>{todo.title}</div>
                      {todo.note && <div style={{ fontSize: '0.75rem', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>- {todo.note}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
