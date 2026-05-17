'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
}

export default function TodosPage() {
  const { status: sessionStatus } = useSession();
  const [todos, setTodos] = useState<Todo[]>([]);
  
  // State for inline column inputs
  const [columnInputs, setColumnInputs] = useState<Record<string, string>>({ Idea: '', Todo: '', 'In Progress': '', Done: '' });
  
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });

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
    
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: text, priority: 'Medium', status }),
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

  const updateTodoStatus = async (id: string, newStatus: string) => {
    setTodos(todos.map(t => t._id === id ? { ...t, status: newStatus as any, completed: newStatus === 'Done' } : t));
    const res = await fetch('/api/todos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus, completed: newStatus === 'Done' }),
    });
    if (!res.ok) fetchTodos();
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

  if (sessionStatus === 'loading') return null;

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className="sl-page-header">
          <h1 className="sl-page-title"><MdCheckCircle style={{ verticalAlign: 'middle' }} /> Quest Board</h1>
          <p className="sl-page-subtitle">[SYSTEM] Drag and drop your objectives</p>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ fontSize: '1rem', color: 'var(--sl-text-bright)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MdCheckCircle style={{ color: 'var(--sl-green)' }} /> Todo List / Tracker
          </h2>
          <div 
            className={styles.todoList}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, 'Todo')}
            style={{ minHeight: '100px', paddingBottom: '20px' }}
          >
            {todos.filter(t => t.status === 'Todo').map(todo => (
              <div 
                key={todo._id} 
                className={styles.todoItem}
                draggable
                onDragStart={(e) => handleDragStart(e, todo._id)}
              >
                <div className={styles.todoLeft}>
                  <button 
                    className={styles.checkBtn} 
                    onClick={() => updateTodoStatus(todo._id, 'Done')}
                    style={{ color: 'var(--sl-text-ghost)' }}
                  >
                    <MdRadioButtonUnchecked />
                  </button>
                  <div className={styles.todoContent}>
                    <div className={styles.todoTitle}>{todo.title}</div>
                    <div className={styles.todoMeta} style={{ color: getPriorityColor(todo.priority) }}>
                      <MdFlag style={{ fontSize: '0.7rem' }} /> {todo.priority} Rank
                    </div>
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
                placeholder="Add new daily tracker item..." 
                style={{ flex: 1 }}
              />
              <button className="sl-btn sl-btn-primary" type="submit">
                <MdAdd /> Add Tracker
              </button>
            </form>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: '1rem', color: 'var(--sl-text-bright)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MdLightbulbOutline style={{ color: 'var(--sl-gold)' }} /> Kanban Board
          </h2>
          <div className={styles.kanbanBoard} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {['Idea', 'In Progress', 'Done'].map(renderColumn)}
          </div>
        </div>
      </main>
    </div>
  );
}
