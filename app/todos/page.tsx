'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Sidebar from '@/components/Sidebar';
import { MdAdd, MdDelete, MdCheckCircle, MdFlag, MdLightbulbOutline, MdRadioButtonUnchecked } from 'react-icons/md';
import styles from './todos.module.css';

interface Todo {
  _id: string;
  title: string;
  completed: boolean;
  priority: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  status: 'Idea' | 'Todo' | 'In Progress' | 'Done';
  note?: string;
  updatedAt?: string;
  category: 'Strategic' | 'Daily';
}

export default function TodosPage() {
  const { status: sessionStatus } = useSession();
  const [todos, setTodos] = useState<Todo[]>([]);
  
  // State for inline column inputs
  const [columnInputs, setColumnInputs] = useState<Record<string, string>>({ Idea: '', Todo: '', 'In Progress': '', Done: '' });
  
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });

  // State for editing notes
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      fetchTodos();
      fetchUserData();
    }
  }, [sessionStatus]);

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
      const mapped = data.todos.map((t: any) => ({
        ...t,
        status: t.status || (t.completed ? 'Done' : 'Todo')
      }));
      setTodos(mapped);
    }
  };

  const handleInlineAdd = async (e: React.FormEvent, status: string) => {
    e.preventDefault();
    const text = columnInputs[status];
    if (!text || !text.trim()) return;
    
    const category = status === 'Idea' ? 'Strategic' : 'Daily';
    
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: text, priority: 'Medium', status, category }),
    });
    if (res.ok) {
      setColumnInputs({ ...columnInputs, [status]: '' });
      fetchTodos();
    }
  };

  const deleteTodo = async (id: string) => {
    const res = await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchTodos();
  };

  const updateTodoStatus = async (id: string, newStatus: string, note?: string) => {
    const todo = todos.find(t => t._id === id);
    if (!todo) return;

    // Restriction: Only items added from 'Idea' (Strategic) can move from 'In Progress' to 'Done'
    if (newStatus === 'Done' && todo.status === 'In Progress' && todo.category !== 'Strategic') {
      alert('[SYSTEM ERROR] Only Strategic objectives initiated from "IDEA" can be finalized via the Strategic Board.');
      return;
    }

    setTodos(todos.map(t => t._id === id ? { ...t, status: newStatus as any, completed: newStatus === 'Done', note: note !== undefined ? note : t.note } : t));
    const res = await fetch('/api/todos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus, completed: newStatus === 'Done', note }),
    });
    if (!res.ok) fetchTodos();
  };

  const saveNote = async (id: string) => {
    await updateTodoStatus(id, todos.find(t => t._id === id)?.status || 'Todo', noteValue);
    setEditingNoteId(null);
    setNoteValue('');
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('todoId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const todoId = e.dataTransfer.getData('todoId');
    if (todoId) {
      updateTodoStatus(todoId, status);
    }
  };

  const getPriorityColor = (p: string) => {
    if (p === 'High') return 'var(--sl-red)';
    if (p === 'Medium') return 'var(--sl-gold)';
    return 'var(--sl-blue)';
  };

  const renderColumn = (col: string) => (
    <div 
      key={col} 
      className={styles.kanbanColumn}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, col)}
      style={{ minHeight: col === 'Idea' ? '200px' : '400px' }}
    >
      <div className={styles.columnHeader}>
        {col.toUpperCase()}
        <span style={{ float: 'right', background: 'var(--sl-bg-dark)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>
          {todos.filter(t => t.status === col).length}
        </span>
      </div>
      <div className={styles.columnContent}>
        {todos.filter(t => t.status === col).map(todo => (
          <div 
            key={todo._id} 
            className={styles.todoCard}
            draggable
            onDragStart={(e) => handleDragStart(e, todo._id)}
          >
            <div className={styles.todoContent}>
              <div className={styles.todoTitle} style={{ textDecoration: todo.status === 'Done' ? 'line-through' : 'none', opacity: todo.status === 'Done' ? 0.6 : 1 }}>
                {todo.title}
              </div>
              <div className={styles.todoMeta} style={{ color: getPriorityColor(todo.priority) }}>
                <MdFlag style={{ fontSize: '0.7rem' }} /> {todo.priority} Rank
              </div>
              {todo.status === 'Done' && (
                <div style={{ marginTop: '8px' }}>
                  {editingNoteId === todo._id ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        className="sl-input" 
                        value={noteValue} 
                        onChange={(e) => setNoteValue(e.target.value)} 
                        placeholder="Log report..." 
                        style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                        autoFocus
                      />
                      <button className="sl-btn sl-btn-primary" onClick={() => saveNote(todo._id)} style={{ padding: '4px 8px', fontSize: '0.7rem' }}>Save</button>
                    </div>
                  ) : (
                    <div 
                      onClick={() => { setEditingNoteId(todo._id); setNoteValue(todo.note || ''); }}
                      style={{ fontSize: '0.7rem', color: 'var(--sl-text-ghost)', fontStyle: 'italic', cursor: 'pointer' }}
                    >
                      {todo.note ? `Report: ${todo.note}` : '+ Add System Report'}
                    </div>
                  )}
                </div>
              )}
            </div>
            <button className={styles.deleteBtn} onClick={() => deleteTodo(todo._id)}>
              <MdDelete />
            </button>
          </div>
        ))}
      </div>
      {['Idea', 'Todo'].includes(col) && (
        <div style={{ padding: '0 16px 16px 16px' }}>
          <form onSubmit={(e) => handleInlineAdd(e, col)} style={{ display: 'flex', gap: '8px' }}>
            <input 
              className="sl-input" 
              value={columnInputs[col] || ''} 
              onChange={(e) => setColumnInputs({ ...columnInputs, [col]: e.target.value })} 
              placeholder="Add item..." 
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem' }}
            />
            <button className="sl-btn sl-btn-ghost" type="submit" style={{ padding: '8px' }}>
              <MdAdd />
            </button>
          </form>
        </div>
      )}
    </div>
  );

  const isSameDay = (dateStr: string | undefined, targetDate: Date) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d.getDate() === targetDate.getDate() &&
           d.getMonth() === targetDate.getMonth() &&
           d.getFullYear() === targetDate.getFullYear();
  };

  const dailyDirectives = todos.filter(t => t.status === 'Todo' || (t.status === 'Done' && isSameDay(t.updatedAt, new Date())));
  const completedDirectives = dailyDirectives.filter(t => t.completed || t.status === 'Done');

  if (sessionStatus === 'loading') return null;

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className="sl-page-header">
          <h1 className="sl-page-title" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <MdCheckCircle style={{ color: 'var(--sl-blue)' }} /> Quest Board
          </h1>
          <p className="sl-page-subtitle">[SYSTEM] Drag and drop your objectives to progress</p>
        </div>

        <div>
          <h2 className="sl-section-title">
            Strategic Board
          </h2>
          <div className={styles.kanbanBoard} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {['Idea', 'In Progress', 'Done'].map(renderColumn)}
          </div>
        </div>

        <div style={{ marginTop: '64px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div>
              <h2 className="sl-section-title" style={{ marginBottom: '4px' }}>
                Daily Directives
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--sl-text-ghost)', margin: 0 }}>
                [SYSTEM] Completion data is synchronized with the <Link href="/logbook" style={{ color: 'var(--sl-blue)', textDecoration: 'underline' }}>Hunter's Logbook</Link>
              </p>
            </div>
            {dailyDirectives.length > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--sl-text-bright)', marginBottom: '4px', letterSpacing: '1px' }}>
                  OBJECTIVE PROGRESS: {completedDirectives.length} / {dailyDirectives.length}
                </div>
                <div style={{ width: '200px', height: '4px', background: 'var(--sl-bg-dark)', borderRadius: '2px', overflow: 'hidden' }}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedDirectives.length / dailyDirectives.length) * 100}%` }}
                    style={{ height: '100%', background: 'var(--sl-blue)', boxShadow: '0 0 10px var(--sl-blue-glow)' }}
                  />
                </div>
              </div>
            )}
          </div>
          
          <div 
            className={styles.todoList}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'Todo')}
            style={{ minHeight: '100px', paddingBottom: '20px' }}
          >
            {dailyDirectives.map(todo => (
              <div 
                key={todo._id} 
                className={styles.todoItem}
                draggable
                onDragStart={(e) => handleDragStart(e, todo._id)}
              >
                <div className={styles.todoLeft}>
                  <button 
                    className={styles.checkBtn} 
                    onClick={() => updateTodoStatus(todo._id, todo.completed ? 'Todo' : 'Done')}
                    style={{ color: todo.completed ? 'var(--sl-green)' : 'var(--sl-text-ghost)' }}
                  >
                    {todo.completed ? <MdCheckCircle /> : <MdRadioButtonUnchecked />}
                  </button>
                  <div className={styles.todoContent}>
                    <div className={styles.todoTitle} style={{ textDecoration: todo.completed ? 'line-through' : 'none', opacity: todo.completed ? 0.6 : 1 }}>
                      {todo.title}
                    </div>
                    <div className={styles.todoMeta} style={{ color: getPriorityColor(todo.priority) }}>
                      <MdFlag style={{ fontSize: '0.7rem' }} /> {todo.priority} Rank
                    </div>
                    {todo.completed && (
                      <div style={{ marginTop: '8px' }}>
                        {editingNoteId === todo._id ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input 
                              className="sl-input" 
                              value={noteValue} 
                              onChange={(e) => setNoteValue(e.target.value)} 
                              placeholder="Log report..." 
                              style={{ fontSize: '0.7rem', padding: '4px 8px' }}
                              autoFocus
                            />
                            <button className="sl-btn sl-btn-primary" onClick={() => saveNote(todo._id)} style={{ padding: '4px 8px', fontSize: '0.7rem' }}>Save</button>
                          </div>
                        ) : (
                          <div 
                            onClick={() => { setEditingNoteId(todo._id); setNoteValue(todo.note || ''); }}
                            style={{ fontSize: '0.7rem', color: 'var(--sl-text-ghost)', fontStyle: 'italic', cursor: 'pointer' }}
                          >
                            {todo.note ? `Report: ${todo.note}` : '+ Add System Report'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button className={styles.deleteBtn} onClick={() => deleteTodo(todo._id)}>
                  <MdDelete />
                </button>
              </div>
            ))}
            
            <form onSubmit={(e) => handleInlineAdd(e, 'Todo')} style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
              <input 
                className="sl-input" 
                value={columnInputs['Todo'] || ''} 
                onChange={(e) => setColumnInputs({ ...columnInputs, 'Todo': e.target.value })} 
                placeholder="Add new daily directive..." 
                style={{ flex: 1 }}
              />
              <button className="sl-btn sl-btn-primary" type="submit">
                <MdAdd /> Add Directive
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
