'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { MdAdd, MdDelete, MdCheckCircle, MdRadioButtonUnchecked, MdFlag } from 'react-icons/md';
import styles from './todos.module.css';

interface Todo {
  _id: string;
  title: string;
  completed: boolean;
  priority: 'Low' | 'Medium' | 'High';
  dueDate?: string;
}

export default function TodosPage() {
  const { status } = useSession();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [filter, setFilter] = useState<'All' | 'Active' | 'Completed'>('All');
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTodos();
      fetchUserData();
    }
  }, [status]);

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

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTodo, priority }),
    });
    if (res.ok) {
      setNewTodo('');
      setPriority('Medium');
      fetchTodos();
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    const res = await fetch('/api/todos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, completed: !completed }),
    });
    if (res.ok) fetchTodos();
  };

  const deleteTodo = async (id: string) => {
    const res = await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
    if (res.ok) fetchTodos();
  };

  const filteredTodos = todos.filter(t => {
    if (filter === 'Active') return !t.completed;
    if (filter === 'Completed') return t.completed;
    return true;
  });

  const getPriorityColor = (p: string) => {
    if (p === 'High') return 'var(--sl-red)';
    if (p === 'Medium') return 'var(--sl-gold)';
    return 'var(--sl-blue)';
  };

  if (status === 'loading') return null;

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className="sl-page-header">
          <h1 className="sl-page-title"><MdCheckCircle style={{ verticalAlign: 'middle' }} /> Quest Log</h1>
          <p className="sl-page-subtitle">[SYSTEM] Daily missions and objectives</p>
        </div>

        <div className="sl-panel" style={{ padding: '24px', marginBottom: '24px' }}>
          <form onSubmit={addTodo} style={{ display: 'flex', gap: '16px' }}>
            <input 
              className="sl-input" 
              value={newTodo} 
              onChange={(e) => setNewTodo(e.target.value)} 
              placeholder="Enter new quest objective..." 
              style={{ flex: 1 }}
            />
            <select 
              className="sl-select" 
              value={priority} 
              onChange={(e) => setPriority(e.target.value as any)}
              style={{ width: '140px' }}
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Rank</option>
              <option value="High">S-Rank Focus</option>
            </select>
            <button className="sl-btn sl-btn-primary" type="submit">
              <MdAdd /> Accept Quest
            </button>
          </form>
        </div>

        <div className={styles.filterRow}>
          {['All', 'Active', 'Completed'].map((f) => (
            <button 
              key={f} 
              className={`sl-btn ${filter === f ? 'sl-btn-primary' : 'sl-btn-ghost'}`} 
              onClick={() => setFilter(f as any)}
              style={{ fontSize: '0.75rem' }}
            >
              {f}
            </button>
          ))}
        </div>

        <div className={styles.todoList}>
          {filteredTodos.map((todo) => (
            <div key={todo._id} className={`${styles.todoItem} ${todo.completed ? styles.completed : ''}`}>
              <div className={styles.todoLeft}>
                <button 
                  className={styles.checkBtn} 
                  onClick={() => toggleTodo(todo._id, todo.completed)}
                  style={{ color: todo.completed ? 'var(--sl-green)' : 'var(--sl-text-ghost)' }}
                >
                  {todo.completed ? <MdCheckCircle /> : <MdRadioButtonUnchecked />}
                </button>
                <div className={styles.todoContent}>
                  <div className={styles.todoTitle}>{todo.title}</div>
                  <div className={styles.todoMeta} style={{ color: getPriorityColor(todo.priority) }}>
                    <MdFlag style={{ fontSize: '0.7rem' }} /> {todo.priority} Rank
                  </div>
                </div>
              </div>
              <button className="sl-btn sl-btn-ghost" onClick={() => deleteTodo(todo._id)} style={{ padding: '8px', color: 'var(--sl-red)' }}>
                <MdDelete />
              </button>
            </div>
          ))}
          {filteredTodos.length === 0 && (
            <div className="sl-empty">
              <div className="sl-empty-text">[SYSTEM] No active missions in this category</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
