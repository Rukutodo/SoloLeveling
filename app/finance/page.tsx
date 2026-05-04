'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { MdAdd, MdClose, MdDelete, MdTrendingUp, MdTrendingDown, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import styles from './finance.module.css';

interface Transaction { _id: string; date: string; amount: number; type: 'income' | 'expense'; category: string; description: string; }

const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other Income'],
  expense: ['Rent', 'Food', 'Transport', 'Shopping', 'Subscriptions', 'Health', 'Entertainment', 'Utilities', 'Education', 'Other'],
};

export default function FinancePage() {
  const { status } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, net: 0 });
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ amount: '', type: 'expense' as 'income' | 'expense', category: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => { if (status === 'authenticated') fetchData(); }, [status, month, year]);

  const fetchData = async () => {
    const [fRes, uRes] = await Promise.all([fetch(`/api/finance?month=${month}&year=${year}`), fetch('/api/user')]);
    if (fRes.ok) { const d = await fRes.json(); setTransactions(d.transactions); setSummary(d.summary); setCategoryBreakdown(d.categoryBreakdown); }
    if (uRes.ok) { const d = await uRes.json(); setSidebarData({ userName: d.stats.name, level: d.stats.level, xp: d.stats.xp, xpToNext: d.stats.xpToNext, rank: d.stats.rank, title: d.stats.title, rankColor: d.stats.rankColor }); }
  };

  const addTransaction = async () => {
    if (!form.amount || !form.category || !form.description) return;
    await fetch('/api/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
    setShowModal(false); setForm({ amount: '', type: 'expense', category: '', description: '', date: new Date().toISOString().split('T')[0] }); fetchData();
  };

  const deleteTransaction = async (id: string) => { await fetch(`/api/finance?id=${id}`, { method: 'DELETE' }); fetchData(); };
  const maxCat = Math.max(...Object.values(categoryBreakdown), 1);

  if (status === 'loading') return null;

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className="sl-page-header"><h1 className="sl-page-title">💰 Finance Tracker</h1><p className="sl-page-subtitle">[SYSTEM] Gold reserve management</p></div>

        <div className={styles.monthNav}>
          <button className="sl-btn sl-btn-ghost" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}><MdChevronLeft /></button>
          <span className={styles.monthLabel}>{monthName}</span>
          <button className="sl-btn sl-btn-ghost" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}><MdChevronRight /></button>
          <button className="sl-btn sl-btn-primary" onClick={() => setShowModal(true)} style={{ marginLeft: 'auto' }}><MdAdd /> Add</button>
        </div>

        <div className={styles.summaryGrid}>
          <div className={`sl-panel ${styles.summaryCard}`}><MdTrendingUp style={{ fontSize: '1.5rem', color: 'var(--sl-accent-green)' }} /><div className={styles.summaryLabel}>Income</div><div className={styles.summaryValue} style={{ color: 'var(--sl-accent-green)' }}>₹{summary.income.toLocaleString()}</div></div>
          <div className={`sl-panel ${styles.summaryCard}`}><MdTrendingDown style={{ fontSize: '1.5rem', color: 'var(--sl-accent-red)' }} /><div className={styles.summaryLabel}>Expenses</div><div className={styles.summaryValue} style={{ color: 'var(--sl-accent-red)' }}>₹{summary.expenses.toLocaleString()}</div></div>
          <div className={`sl-panel ${styles.summaryCard}`}><div className={styles.summaryLabel}>Net</div><div className={styles.summaryValue} style={{ color: summary.net >= 0 ? 'var(--sl-accent-green)' : 'var(--sl-accent-red)' }}>{summary.net >= 0 ? '+' : ''}₹{summary.net.toLocaleString()}</div></div>
        </div>

        <div className={styles.financeLayout}>
          <div className="sl-panel" style={{ padding: '24px' }}>
            <h2 className="sl-section-title">Expense Breakdown</h2>
            {Object.keys(categoryBreakdown).length > 0 ? (
              <div className={styles.categoryList}>
                {Object.entries(categoryBreakdown).sort(([, a], [, b]) => b - a).map(([cat, amount]) => (
                  <div key={cat} className={styles.categoryItem}>
                    <div className={styles.categoryInfo}><span>{cat}</span><span style={{ color: 'var(--sl-accent-blue)', fontFamily: 'var(--sl-font-display)', fontWeight: 700 }}>₹{amount.toLocaleString()}</span></div>
                    <div className={styles.categoryBar}><div className={styles.categoryFill} style={{ width: `${(amount / maxCat) * 100}%` }} /></div>
                  </div>
                ))}
              </div>
            ) : <div style={{ textAlign: 'center', padding: '30px', color: 'var(--sl-text-muted)' }}>No expenses</div>}
          </div>

          <div className="sl-panel" style={{ padding: '24px' }}>
            <h2 className="sl-section-title">Transactions</h2>
            {transactions.length > 0 ? (
              <div className={styles.txList}>
                {transactions.map((t) => (
                  <div key={t._id} className={styles.txItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className={`${styles.txIcon} ${t.type === 'income' ? styles.txIconIncome : styles.txIconExpense}`}>{t.type === 'income' ? <MdTrendingUp /> : <MdTrendingDown />}</div>
                      <div><div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{t.description}</div><div style={{ fontSize: '0.6875rem', color: 'var(--sl-text-muted)' }}>{t.category} • {new Date(t.date).toLocaleDateString()}</div></div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--sl-font-display)', fontWeight: 700, color: t.type === 'income' ? 'var(--sl-accent-green)' : 'var(--sl-accent-red)' }}>{t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}</span>
                      <button className="sl-btn sl-btn-ghost" onClick={() => deleteTransaction(t._id)} style={{ padding: '4px' }}><MdDelete /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={{ textAlign: 'center', padding: '30px', color: 'var(--sl-text-muted)' }}>No transactions</div>}
          </div>
        </div>

        {showModal && (
          <div className="sl-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
              <div className="sl-flex-between" style={{ marginBottom: '16px' }}><h3 className="sl-modal-title">Add Transaction</h3><button className="sl-btn sl-btn-ghost" onClick={() => setShowModal(false)}><MdClose /></button></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className={styles.typeToggle}>
                  <button className={`${styles.typeBtn} ${form.type === 'expense' ? styles.typeBtnExpense : ''}`} onClick={() => setForm({ ...form, type: 'expense', category: '' })}>Expense</button>
                  <button className={`${styles.typeBtn} ${form.type === 'income' ? styles.typeBtnIncome : ''}`} onClick={() => setForm({ ...form, type: 'income', category: '' })}>Income</button>
                </div>
                <div><label className="sl-label">Amount (₹)</label><input className="sl-input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Enter amount" /></div>
                <div><label className="sl-label">Category</label><select className="sl-select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="">Select</option>{CATEGORIES[form.type].map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="sl-label">Description</label><input className="sl-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What was this for?" /></div>
                <div><label className="sl-label">Date</label><input className="sl-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <button className="sl-btn sl-btn-primary" onClick={addTransaction} style={{ width: '100%' }}>⚡ Add Transaction</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
