'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { MdChevronLeft, MdChevronRight, MdAdd, MdClose, MdDelete } from 'react-icons/md';
import styles from './calendar.module.css';

interface CalEvent { _id: string; title: string; date: string; type: string; color: string; notes?: string; completed: boolean; }

const EVENT_TYPES = [
  { value: 'general', label: 'General', color: '#00d4ff' },
  { value: 'workout', label: 'Workout', color: '#00ff88' },
  { value: 'meal', label: 'Meal', color: '#ffd700' },
  { value: 'finance', label: 'Finance', color: '#7b2ff7' },
  { value: 'goal', label: 'Goal', color: '#ff3e3e' },
];

export default function CalendarPage() {
  const { status } = useSession();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'general', color: '#00d4ff', notes: '' });
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (status === 'authenticated') { fetchEvents(); fetchUser(); }
  }, [status, month, year]);

  const fetchEvents = async () => {
    const res = await fetch(`/api/calendar?month=${month}&year=${year}`);
    if (res.ok) { const d = await res.json(); setEvents(d.events); }
  };

  const fetchUser = async () => {
    const res = await fetch('/api/user');
    if (res.ok) { const d = await res.json(); setSidebarData({ userName: d.stats.name, level: d.stats.level, xp: d.stats.xp, xpToNext: d.stats.xpToNext, rank: d.stats.rank, title: d.stats.title, rankColor: d.stats.rankColor }); }
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDay = (day: number) => events.filter((e) => new Date(e.date).getDate() === day);
  const isToday = (day: number) => { const t = new Date(); return day === t.getDate() && month === t.getMonth() && year === t.getFullYear(); };

  const addEvent = async () => {
    if (!newEvent.title || selectedDay === null) return;
    const date = new Date(year, month, selectedDay);
    await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newEvent, date }),
    });
    setShowAddModal(false);
    setNewEvent({ title: '', type: 'general', color: '#00d4ff', notes: '' });
    fetchEvents();
  };

  const deleteEvent = async (id: string) => {
    await fetch(`/api/calendar?id=${id}`, { method: 'DELETE' });
    fetchEvents();
  };

  const toggleComplete = async (event: CalEvent) => {
    await fetch('/api/calendar', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: event._id, completed: !event.completed }),
    });
    fetchEvents();
  };

  const dayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  if (status === 'loading') return null;

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className="sl-page-header">
          <h1 className="sl-page-title">📅 Calendar</h1>
          <p className="sl-page-subtitle">[SYSTEM] Quest & event tracker</p>
        </div>

        <div className={styles.calendarLayout}>
          {/* Calendar Grid */}
          <div className="sl-panel" style={{ padding: '24px' }}>
            <div className={styles.calHeader}>
              <button className="sl-btn sl-btn-ghost" onClick={prevMonth}><MdChevronLeft /></button>
              <h2 className={styles.monthTitle}>{monthName}</h2>
              <button className="sl-btn sl-btn-ghost" onClick={nextMonth}><MdChevronRight /></button>
            </div>

            <div className={styles.weekDays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className={styles.weekDay}>{d}</div>
              ))}
            </div>

            <div className={styles.daysGrid}>
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} className={styles.dayEmpty} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvts = getEventsForDay(day);
                const today = isToday(day);
                const selected = selectedDay === day;
                return (
                  <div
                    key={day}
                    className={`${styles.dayCell} ${today ? styles.dayCellToday : ''} ${selected ? styles.dayCellSelected : ''}`}
                    onClick={() => setSelectedDay(day)}
                  >
                    <span className={styles.dayNumber}>{day}</span>
                    {dayEvts.length > 0 && (
                      <div className={styles.eventDots}>
                        {dayEvts.slice(0, 3).map((e, j) => (
                          <div key={j} className={styles.eventDot} style={{ background: e.color }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Detail Panel */}
          <div className="sl-panel" style={{ padding: '24px' }}>
            <div className="sl-flex-between" style={{ marginBottom: '16px' }}>
              <h3 className="sl-section-title" style={{ marginBottom: 0 }}>
                {selectedDay ? `${monthName.split(' ')[0]} ${selectedDay}` : 'Select a day'}
              </h3>
              {selectedDay && (
                <button className="sl-btn sl-btn-primary" onClick={() => setShowAddModal(true)} style={{ fontSize: '0.75rem' }}>
                  <MdAdd /> Add Event
                </button>
              )}
            </div>

            {selectedDay ? (
              dayEvents.length > 0 ? (
                <div className={styles.eventList}>
                  {dayEvents.map((e) => (
                    <div key={e._id} className={styles.eventItem} style={{ borderLeft: `3px solid ${e.color}` }}>
                      <div className={styles.eventInfo}>
                        <input type="checkbox" checked={e.completed} onChange={() => toggleComplete(e)} className={styles.checkbox} />
                        <div>
                          <div className={`${styles.eventTitle} ${e.completed ? styles.eventCompleted : ''}`}>{e.title}</div>
                          <div className={styles.eventType}>{e.type}</div>
                          {e.notes && <div className={styles.eventNotes}>{e.notes}</div>}
                        </div>
                      </div>
                      <button className="sl-btn sl-btn-ghost" onClick={() => deleteEvent(e._id)} style={{ padding: '4px' }}><MdDelete /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sl-empty"><div className="sl-empty-text">[SYSTEM] No quests for this day</div></div>
              )
            ) : (
              <div className="sl-empty"><div className="sl-empty-text">[SYSTEM] Select a day to view quests</div></div>
            )}
          </div>
        </div>

        {/* Add Event Modal */}
        {showAddModal && (
          <div className="sl-modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sl-flex-between" style={{ marginBottom: '16px' }}>
                <h3 className="sl-modal-title">New Event</h3>
                <button className="sl-btn sl-btn-ghost" onClick={() => setShowAddModal(false)}><MdClose /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div><label className="sl-label">Title</label><input className="sl-input" value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Event title" /></div>
                <div><label className="sl-label">Type</label>
                  <select className="sl-select" value={newEvent.type} onChange={(e) => { const t = EVENT_TYPES.find((et) => et.value === e.target.value); setNewEvent({ ...newEvent, type: e.target.value, color: t?.color || '#00d4ff' }); }}>
                    {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div><label className="sl-label">Notes</label><input className="sl-input" value={newEvent.notes} onChange={(e) => setNewEvent({ ...newEvent, notes: e.target.value })} placeholder="Optional notes" /></div>
                <button className="sl-btn sl-btn-primary" onClick={addEvent} style={{ width: '100%' }}>⚡ Add Event</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
