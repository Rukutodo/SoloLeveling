'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { MdAdd, MdClose, MdDelete, MdTrendingUp, MdTrendingDown, MdChevronLeft, MdChevronRight, MdAccountBalanceWallet, MdOutlineAutorenew } from 'react-icons/md';
import { GiHeartBeats } from 'react-icons/gi';
import { FaBolt, FaGoogle, FaFileInvoiceDollar, FaCloudUploadAlt, FaSearchDollar, FaList, FaCheckCircle, FaTrashAlt } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import styles from './finance.module.css';

interface Transaction { _id: string; date: string; amount: number; type: 'income' | 'expense'; category: string; description: string; }

const CATEGORIES = {
  income: ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other Income'],
  expense: ['Rent', 'Food', 'Transport', 'Shopping', 'Subscriptions', 'Health', 'Entertainment', 'Utilities', 'Education', 'Other'],
};

export default function FinancePage() {
  const { status } = useSession();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [emis, setEmis] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [insurances, setInsurances] = useState<any[]>([]);
  const [summary, setSummary] = useState({ income: 0, expenses: 0, net: 0 });
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'tx' | 'emi' | 'inv' | 'ins'>('tx');
  
  const [showModal, setShowModal] = useState(false);
  const [showEmiModal, setShowEmiModal] = useState(false);
  const [showInvModal, setShowInvModal] = useState(false);
  const [showInsModal, setShowInsModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [analysisData, setAnalysisData] = useState<any>(null);

  const [showImportPortal, setShowImportPortal] = useState(false);
  const [importTab, setImportTab] = useState<'gmail' | 'file' | 'paste'>('gmail');
  const [pastedReceipt, setPastedReceipt] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedTransactions, setParsedTransactions] = useState<any[]>([]);
  const [importStats, setImportStats] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('[SYSTEM] INITIALIZING UPLOAD...');

  const [form, setForm] = useState({ amount: '', type: 'expense' as 'income' | 'expense', category: '', description: '', date: new Date().toISOString().split('T')[0] });
  const [emiForm, setEmiForm] = useState({ name: '', amount: '', dayOfMonth: '1', totalMonths: '12', category: 'EMI', principalTotal: '', principalPaid: '' });
  const [invForm, setInvForm] = useState({ fundName: '', investedAmount: '', currentAmount: '', expectedReturnRate: '12', type: 'Mutual Fund', subType: 'Mutual Fund', schemeCode: '', units: '' });
  const [insForm, setInsForm] = useState({ policyName: '', premiumAmount: '', frequency: 'Monthly', provider: '', nextDueDate: new Date().toISOString().split('T')[0] });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [sidebarData, setSidebarData] = useState({ userName: '', level: 1, xp: 0, xpToNext: 100, rank: 'E', title: 'Awakened Hunter', rankColor: '#8b8b8b' });

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  useEffect(() => { if (status === 'authenticated') fetchData(); }, [status, month, year]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (!parsing || !selectedFile) {
      setUploadProgress(0);
      return;
    }
    
    // Simulate progression up to 95%
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 30) {
          setLoadingStatus('[SYSTEM] CONVERTING FILE BYTES TO BASE64...');
          return prev + 12;
        }
        if (prev < 65) {
          setLoadingStatus('[SYSTEM] TRANSMITTING MATRIX TO GEMINI OCR...');
          return prev + 8;
        }
        if (prev < 90) {
          setLoadingStatus('[SYSTEM] ANALYZING PATTERNS AND INVOICE ENTRIES...');
          return prev + 4;
        }
        if (prev < 95) {
          setLoadingStatus('[SYSTEM] DEDUPLICATING AND ALIGNING TRANSACTION SCHEMA...');
          return prev + 1;
        }
        return prev;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [parsing, selectedFile]);

  const fetchData = async () => {
    const [fRes, uRes, eRes, iRes, insRes] = await Promise.all([
      fetch(`/api/finance?month=${month}&year=${year}`),
      fetch('/api/user'),
      fetch('/api/finance/emi'),
      fetch('/api/finance/investments'),
      fetch('/api/finance/insurance')
    ]);

    if (fRes.ok) { const d = await fRes.json(); setTransactions(d.transactions); setSummary(d.summary); setCategoryBreakdown(d.categoryBreakdown); }
    if (uRes.ok) { const d = await uRes.json(); setSidebarData({ userName: d.stats.name, level: d.stats.level, xp: d.stats.xp, xpToNext: d.stats.xpToNext, rank: d.stats.rank, title: d.stats.title, rankColor: d.stats.rankColor }); }
    if (eRes.ok) { const d = await eRes.json(); setEmis(d.emis); }
    if (iRes.ok) { const d = await iRes.json(); setInvestments(d.investments); }
    if (insRes.ok) { const d = await insRes.json(); setInsurances(d.insurances); }
  };

  const addTransaction = async () => {
    if (!form.amount || !form.category || !form.description) return;
    await fetch('/api/finance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
    setShowModal(false); setForm({ amount: '', type: 'expense', category: '', description: '', date: new Date().toISOString().split('T')[0] }); fetchData();
  };

  const deleteTransaction = async (id: string) => { await fetch(`/api/finance?id=${id}`, { method: 'DELETE' }); fetchData(); };

  const syncGmailDirectly = () => {
    const googleObj = (window as any).google;
    if (!googleObj) {
      alert('[SYSTEM] Google Identity Services loading. Please try again in a moment...');
      return;
    }
    
    setParsing(true);
    setParsedTransactions([]);
    setImportStats(null);
    
    try {
      const client = googleObj.accounts.oauth2.initTokenClient({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/gmail.readonly',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('[SYSTEM] OAuth error:', tokenResponse.error);
            setParsing(false);
            alert('[SYSTEM] Google authentication failed.');
            return;
          }
          
          const accessToken = tokenResponse.access_token;
          if (accessToken) {
            await parseGmailReceipts(accessToken);
          } else {
            setParsing(false);
          }
        },
        error_callback: (err: any) => {
          console.error('[SYSTEM] GIS error:', err);
          setParsing(false);
        }
      });
      client.requestAccessToken();
    } catch (err) {
      console.error('[SYSTEM] Direct sync initialization failed:', err);
      setParsing(false);
    }
  };

  const parseGmailReceipts = async (accessToken: string) => {
    try {
      const res = await fetch('/api/finance/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });
      if (res.ok) {
        const data = await res.json();
        setParsedTransactions(data.transactions || []);
        if ((data.transactions || []).length === 0) {
          alert('[SYSTEM] No recent receipt/payment emails identified in your Gmail inbox.');
        }
      } else {
        const err = await res.json();
        alert('[SYSTEM] Error: ' + (err.error || 'Failed to scan inbox.'));
      }
    } catch (e) {
      console.error(e);
      alert('[SYSTEM] Connection failure during inbox extraction.');
    } finally {
      setParsing(false);
    }
  };

  const parsePastedReceipt = async () => {
    if (!pastedReceipt.trim()) return;
    setParsing(true);
    setParsedTransactions([]);
    setImportStats(null);
    try {
      const res = await fetch('/api/finance/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: pastedReceipt }),
      });
      if (res.ok) {
        const data = await res.json();
        setParsedTransactions(data.transactions || []);
        if ((data.transactions || []).length === 0) {
          alert('[SYSTEM] AI could not identify any transaction inside the pasted text.');
        }
      } else {
        const err = await res.json();
        alert('[SYSTEM] Error: ' + (err.error || 'Failed to parse text.'));
      }
    } catch (e) {
      console.error(e);
      alert('[SYSTEM] Connection failure during raw receipt extraction.');
    } finally {
      setParsing(false);
    }
  };

  const parseOFX = (text: string) => {
    const transactionsList: any[] = [];
    const matches = text.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g);
    if (!matches) return [];

    for (const m of matches) {
      const amtMatch = m.match(/<TRNAMT>([\d\.-]+)/);
      const nameMatch = m.match(/<NAME>([^<\r\n]+)/);
      const memoMatch = m.match(/<MEMO>([^<\r\n]+)/);
      const dateMatch = m.match(/<DTPOSTED>(\d{8})/);

      if (amtMatch && (nameMatch || memoMatch)) {
        const rawAmount = parseFloat(amtMatch[1]);
        const amount = Math.abs(rawAmount);
        const type = rawAmount >= 0 ? 'income' : 'expense';
        const description = (nameMatch ? nameMatch[1] : memoMatch ? memoMatch[1] : 'Bank Transaction').trim();
        
        let dateStr = new Date().toISOString().split('T')[0];
        if (dateMatch) {
          const y = dateMatch[1].slice(0, 4);
          const m = dateMatch[1].slice(4, 6);
          const d = dateMatch[1].slice(6, 8);
          dateStr = `${y}-${m}-${d}`;
        }

        let category = type === 'income' ? 'Other Income' : 'Other';
        const descLower = description.toLowerCase();
        if (type === 'expense') {
          if (descLower.includes('uber') || descLower.includes('lyft') || descLower.includes('cab') || descLower.includes('metro') || descLower.includes('fuel') || descLower.includes('petrol')) {
            category = 'Transport';
          } else if (descLower.includes('swiggy') || descLower.includes('zomato') || descLower.includes('rest') || descLower.includes('food') || descLower.includes('cafe') || descLower.includes('starbucks') || descLower.includes('dining')) {
            category = 'Food';
          } else if (descLower.includes('netflix') || descLower.includes('spotify') || descLower.includes('prime') || descLower.includes('youtube') || descLower.includes('sub')) {
            category = 'Subscriptions';
          } else if (descLower.includes('amazon') || descLower.includes('flipkart') || descLower.includes('grocer') || descLower.includes('shopping') || descLower.includes('store') || descLower.includes('mall')) {
            category = 'Shopping';
          } else if (descLower.includes('hospital') || descLower.includes('pharmacy') || descLower.includes('medical') || descLower.includes('health') || descLower.includes('doc')) {
            category = 'Health';
          } else if (descLower.includes('electricity') || descLower.includes('water') || descLower.includes('bill') || descLower.includes('gas') || descLower.includes('utilities')) {
            category = 'Utilities';
          } else if (descLower.includes('rent') || descLower.includes('pg') || descLower.includes('house')) {
            category = 'Rent';
          }
        } else {
          if (descLower.includes('salary') || descLower.includes('payout') || descLower.includes('corp') || descLower.includes('emp')) {
            category = 'Salary';
          } else if (descLower.includes('dividend') || descLower.includes('interest') || descLower.includes('stock')) {
            category = 'Investments';
          }
        }

        const sigString = `temp_${dateStr}_${amount}_${description.toLowerCase()}_${type}`;
        let hash = 0;
        for (let i = 0; i < sigString.length; i++) {
          const chr = sigString.charCodeAt(i);
          hash = ((hash << 5) - hash) + chr;
          hash |= 0;
        }
        const signature = 'ofx_' + Math.abs(hash).toString(16);

        transactionsList.push({
          date: dateStr,
          amount,
          type,
          category,
          description,
          signature,
        });
      }
    }
    return transactionsList;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setParsing(true);
    setUploadProgress(10);
    setLoadingStatus('[SYSTEM] READING FILE BYTES...');
    setParsedTransactions([]);
    setImportStats(null);

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.ofx') || fileName.endsWith('.qfx')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const parsed = parseOFX(text);
        setParsedTransactions(parsed);
        setUploadProgress(100);
        setLoadingStatus('[SYSTEM] OFX STATEMENT PARSED SUCCESSFULLY.');
        setTimeout(() => {
          setParsing(false);
          setSelectedFile(null);
        }, 800);
        if (parsed.length === 0) {
          alert('[SYSTEM] Could not parse any transactions from the uploaded file. Ensure it is a valid OFX/QFX statement.');
        }
      };
      reader.onerror = () => {
        setParsing(false);
        setSelectedFile(null);
        alert('[SYSTEM] File reading error.');
      };
      reader.readAsText(file);
    } 
    else if (fileName.endsWith('.pdf')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const base64Data = (event.target?.result as string).split(',')[1];
          
          console.log('[AI-FRONTEND] Dispatching fetch request to /api/finance/gmail...');
          const res = await fetch('/api/finance/gmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileData: base64Data, mimeType: 'application/pdf' }),
          });
          console.log('[AI-FRONTEND] Fetch request complete.');

          if (res.ok) {
            const data = await res.json();
            setParsedTransactions(data.transactions || []);
            setUploadProgress(100);
            setLoadingStatus('[SYSTEM] TRANSACTION SCHEMA EXTRACTION SUCCESS.');
            if ((data.transactions || []).length === 0) {
              alert('[SYSTEM] Gemini could not extract any transactions from your PDF. Ensure it has legible transaction texts.');
            }
          } else {
            const err = await res.json();
            alert('[SYSTEM] AI extraction failed: ' + (err.error || 'Check file and try again.'));
          }
        } catch (error) {
          console.error(error);
          alert('[SYSTEM] Connection or file preparation error.');
        } finally {
          setTimeout(() => {
            setParsing(false);
            setSelectedFile(null);
          }, 800);
        }
      };
      reader.onerror = () => {
        setParsing(false);
        setSelectedFile(null);
        alert('[SYSTEM] File reading error.');
      };
      reader.readAsDataURL(file);
    }
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const data = new Uint8Array(arrayBuffer);
          console.log('[AI-FRONTEND] File read complete. Starting XLSX parsing...');
          const workbook = XLSX.read(data, { type: 'array' });
          console.log('[AI-FRONTEND] XLSX parsing complete.');
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const csvText = XLSX.utils.sheet_to_csv(sheet);

          console.log('[AI-FRONTEND] Dispatching fetch request to /api/finance/gmail...');
          const res = await fetch('/api/finance/gmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawText: csvText }),
          });
          console.log('[AI-FRONTEND] Fetch request complete.');

          if (res.ok) {
            const parsedData = await res.json();
            setParsedTransactions(parsedData.transactions || []);
            setUploadProgress(100);
            setLoadingStatus('[SYSTEM] SPREADSHEET MATRIX TRANSLATED.');
            if ((parsedData.transactions || []).length === 0) {
              alert('[SYSTEM] Gemini could not extract any transactions from your Excel sheet.');
            }
          } else {
            const err = await res.json();
            alert('[SYSTEM] Excel AI extraction failed: ' + (err.error || 'Check file and try again.'));
          }
        } catch (error) {
          console.error(error);
          alert('[SYSTEM] Spreadsheet parsing error.');
        } finally {
          setTimeout(() => {
            setParsing(false);
            setSelectedFile(null);
          }, 800);
        }
      };
      reader.onerror = () => {
        setParsing(false);
        setSelectedFile(null);
        alert('[SYSTEM] File reading error.');
      };
      reader.readAsArrayBuffer(file);
    }
    else if (fileName.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const csvText = event.target?.result as string;
          console.log('[AI-FRONTEND] Dispatching fetch request to /api/finance/gmail...');
          const res = await fetch('/api/finance/gmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rawText: csvText }),
          });
          console.log('[AI-FRONTEND] Fetch request complete.');

          if (res.ok) {
            const parsedData = await res.json();
            setParsedTransactions(parsedData.transactions || []);
            setUploadProgress(100);
            setLoadingStatus('[SYSTEM] CSV MATRIX PARSING SUCCESS.');
            if ((parsedData.transactions || []).length === 0) {
              alert('[SYSTEM] Gemini could not extract any transactions from your CSV sheet.');
            }
          } else {
            const err = await res.json();
            alert('[SYSTEM] CSV AI extraction failed: ' + (err.error || 'Check file and try again.'));
          }
        } catch (error) {
          console.error(error);
          alert('[SYSTEM] Connection or file preparation error.');
        } finally {
          setTimeout(() => {
            setParsing(false);
            setSelectedFile(null);
          }, 800);
        }
      };
      reader.onerror = () => {
        setParsing(false);
        setSelectedFile(null);
        alert('[SYSTEM] File reading error.');
      };
      reader.readAsText(file);
    }
    else {
      setParsing(false);
      setSelectedFile(null);
      alert('[SYSTEM] Unsupported file format. Please upload PDF, Excel (.xlsx, .xls), CSV, or OFX/QFX.');
    }
  };

  const bulkImportTransactions = async () => {
    if (parsedTransactions.length === 0) return;
    setParsing(true);
    try {
      const res = await fetch('/api/finance/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: parsedTransactions }),
      });
      if (res.ok) {
        const data = await res.json();
        setImportStats(data);
        setParsedTransactions([]);
        fetchData();
      } else {
        const err = await res.json();
        alert('[SYSTEM] Import failed: ' + (err.error || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      alert('[SYSTEM] Connection error during import.');
    } finally {
      setParsing(false);
    }
  };

  const maxCat = Math.max(...Object.values(categoryBreakdown), 1);

  if (status === 'loading') return null;

  return (
    <div className="sl-page-wrapper">
      <Sidebar {...sidebarData} />
      <main className="sl-main-content">
        <div className="sl-page-header">
          <h1 className="sl-page-title"><MdAccountBalanceWallet style={{ verticalAlign: 'middle' }} /> Finance Tracker</h1>
          <p className="sl-page-subtitle">[SYSTEM] Credit reserve management</p>
        </div>

        {/* Month Navigation */}
        <div className={styles.monthNav}>
          <button 
            type="button"
            className="sl-btn sl-btn-ghost" 
            onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
          >
            <MdChevronLeft />
          </button>
          <span className={styles.monthLabel}>{monthName}</span>
          <button 
            type="button"
            className="sl-btn sl-btn-ghost" 
            onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
          >
            <MdChevronRight />
          </button>
          <button 
            type="button"
            className="sl-btn sl-btn-primary" 
            onClick={() => {
              setShowModal(true);
            }} 
            style={{ marginLeft: 'auto' }}
          >
            <MdAdd /> Log Transaction
          </button>
        </div>

        <div className={styles.summaryGrid}>
          <div className={`sl-panel ${styles.summaryCard}`}>
            <MdTrendingUp style={{ fontSize: '2rem', color: 'var(--sl-green)', filter: 'drop-shadow(0 0 10px hsla(150, 100%, 50%, 0.3))' }} />
            <div className={styles.summaryLabel}>Credits Earned</div>
            <div className={styles.summaryValue} style={{ color: 'var(--sl-green)' }}>
              ₹{summary.income.toLocaleString()}
            </div>
          </div>
          <div className={`sl-panel ${styles.summaryCard}`}>
            <MdTrendingDown style={{ fontSize: '2rem', color: 'var(--sl-red)', filter: 'drop-shadow(0 0 10px hsla(0, 100%, 60%, 0.3))' }} />
            <div className={styles.summaryLabel}>Credits Spent</div>
            <div className={styles.summaryValue} style={{ color: 'var(--sl-red)' }}>
              ₹{summary.expenses.toLocaleString()}
            </div>
          </div>
          <div className={`sl-panel ${styles.summaryCard}`}>
            <div className={styles.summaryLabel}>Available Credits</div>
            <div className={styles.summaryValue} style={{ color: summary.net >= 0 ? 'var(--sl-green)' : 'var(--sl-red)' }}>
              {summary.net >= 0 ? '+' : ''}₹{summary.net.toLocaleString()}
            </div>
          </div>
        </div>

        <div className={styles.tabHeader}>
          <button className={`${styles.tabBtn} ${activeTab === 'tx' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('tx')}>
            <MdAdd /> Ledger
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'emi' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('emi')}>
            <MdTrendingDown /> EMIs
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'inv' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('inv')}>
            <MdTrendingUp /> Assets
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'ins' ? styles.tabBtnActive : ''}`} onClick={() => setActiveTab('ins')}>
            <GiHeartBeats /> Insurance
          </button>
        </div>

        <div className={styles.financeLayout}>
          {/* Left Column: Analysis */}
          <div className="sl-panel" style={{ padding: '32px' }}>
            <h2 className="sl-section-title">Analysis Sector</h2>
            <div className={styles.categoryList}>
              <h3 style={{ fontSize: '0.7rem', color: 'var(--sl-text-ghost)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Expense Breakdown</h3>
              {Object.keys(categoryBreakdown).length > 0 ? (
                Object.entries(categoryBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([cat, amount]) => (
                    <div key={cat} className={styles.categoryItem}>
                      <div className={styles.categoryInfo}>
                        <span>{cat}</span>
                        <span style={{ color: 'var(--sl-blue)', fontFamily: 'var(--sl-font-display)', fontWeight: 800 }}>
                          ₹{amount.toLocaleString()}
                        </span>
                      </div>
                      <div className={styles.categoryBar}>
                        <div className={styles.categoryFill} style={{ width: `${(amount / maxCat) * 100}%` }} />
                      </div>
                    </div>
                  ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sl-text-ghost)', fontFamily: 'var(--sl-font-mono)', fontSize: '0.75rem' }}>
                  [SYSTEM] NO DATA
                </div>
              )}
            </div>

            {activeTab === 'inv' && investments.length > 0 && (
              <div style={{ marginTop: '40px' }}>
                <h3 style={{ fontSize: '0.7rem', color: 'var(--sl-text-ghost)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>Investment Growth</h3>
                <div className={styles.invStats}>
                  <div className={styles.invStatItem}>
                    <div className={styles.invStatLabel}>Total Invested</div>
                    <div className={styles.invStatValue}>₹{investments.reduce((s, i) => s + i.investedAmount, 0).toLocaleString()}</div>
                  </div>
                  <div className={styles.invStatItem}>
                    <div className={styles.invStatLabel}>Current Value</div>
                    <div className={styles.invStatValue} style={{ color: 'var(--sl-green)' }}>₹{investments.reduce((s, i) => s + i.currentAmount, 0).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: List Content */}
          <div className="sl-panel" style={{ padding: '32px' }}>
            <div className="sl-flex-between" style={{ marginBottom: '24px' }}>
              <h2 className="sl-section-title">
                {activeTab === 'tx' ? 'Credit Ledger' : activeTab === 'emi' ? 'System Deductions' : activeTab === 'inv' ? 'Asset Management' : 'Protection Grid'}
              </h2>
              {activeTab === 'tx' && (
                <button 
                  className="sl-btn sl-btn-secondary" 
                  onClick={() => setShowImportPortal(!showImportPortal)} 
                  style={{ padding: '8px 16px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FaCloudUploadAlt /> {showImportPortal ? 'Hide Import Sector' : 'Import / Sync Hub'}
                </button>
              )}
              {activeTab === 'emi' && (
                <button className="sl-btn sl-btn-secondary" onClick={() => setShowEmiModal(true)} style={{ padding: '8px 16px', fontSize: '0.75rem' }}>
                  <MdAdd /> New EMI
                </button>
              )}
              {activeTab === 'inv' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="sl-btn sl-btn-secondary" onClick={async () => {
                    const res = await fetch('/api/finance/investments/refresh', { method: 'POST' });
                    if (res.ok) fetchData();
                  }} style={{ padding: '8px 16px', fontSize: '0.75rem' }}>
                    <FaBolt /> Refresh Market
                  </button>
                  <button className="sl-btn sl-btn-secondary" onClick={() => setShowInvModal(true)} style={{ padding: '8px 16px', fontSize: '0.75rem' }}>
                    <MdAdd /> New Asset
                  </button>
                </div>
              )}
              {activeTab === 'ins' && (
                <button className="sl-btn sl-btn-secondary" onClick={() => setShowInsModal(true)} style={{ padding: '8px 16px', fontSize: '0.75rem' }}>
                  <MdAdd /> New Policy
                </button>
              )}
            </div>
            {activeTab === 'tx' && showImportPortal && (
              <div className="sl-panel" style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--sl-glass-border)', borderRadius: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--sl-glass-border)', paddingBottom: '12px', marginBottom: '16px' }}>
                  <button className={`sl-btn ${importTab === 'gmail' ? 'sl-btn-primary' : 'sl-btn-ghost'}`} onClick={() => setImportTab('gmail')} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaGoogle /> Gmail OCR
                  </button>
                  <button className={`sl-btn ${importTab === 'file' ? 'sl-btn-primary' : 'sl-btn-ghost'}`} onClick={() => setImportTab('file')} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaFileInvoiceDollar /> File Upload (PDF, Excel, OFX)
                  </button>
                  <button className={`sl-btn ${importTab === 'paste' ? 'sl-btn-primary' : 'sl-btn-ghost'}`} onClick={() => setImportTab('paste')} style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaList /> Paste Receipt
                  </button>
                </div>

                {importTab === 'gmail' && (
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--sl-text-dim)', marginBottom: '12px' }}>
                      [SYSTEM] Authorize on-demand scan of order/invoice emails to extract credit updates via Gemini Flash.
                    </p>
                    <button className="sl-btn sl-btn-primary" onClick={syncGmailDirectly} disabled={parsing} style={{ background: 'linear-gradient(135deg, #ea4335, #4285f4)', border: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {parsing ? 'Scanning Inbox Sector...' : 'Scan Inbox via Google Auth'}
                    </button>
                  </div>
                )}

                {importTab === 'file' && (
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--sl-text-dim)', marginBottom: '12px' }}>
                      [SYSTEM] Drop any Bank Statement or Receipt file (PDF, Excel, CSV, or OFX/QFX) to parse transactions instantly.
                    </p>
                    
                    {selectedFile ? (
                      <div className="sl-panel" style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--sl-blue-glow)', borderRadius: '12px', textAlign: 'left', position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                          <div style={{ width: '48px', height: '48px', background: 'var(--sl-blue-dim)', border: '1px solid var(--sl-blue)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sl-blue)', fontSize: '1.5rem' }}>
                            <FaFileInvoiceDollar />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--sl-text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {selectedFile.name}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--sl-text-ghost)', marginTop: '2px' }}>
                              {(selectedFile.size / 1024).toFixed(1)} KB · {selectedFile.type || 'Binary Statement'}
                            </div>
                          </div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--sl-blue)', fontFamily: 'var(--sl-font-display)' }}>
                            {uploadProgress}%
                          </div>
                        </div>

                        {/* Premium S-Rank Progress Bar */}
                        <div className="sl-progress sl-progress-blue" style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
                          <div className="sl-progress-fill" style={{ width: `${uploadProgress}%`, background: 'var(--sl-blue)', boxShadow: 'var(--sl-glow-sm)', height: '100%', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.625rem', color: 'var(--sl-blue)', fontFamily: 'var(--sl-font-mono)', fontWeight: 600, letterSpacing: '0.05em' }}>
                            {loadingStatus}
                          </span>
                          {!parsing && (
                            <button 
                              className="sl-btn sl-btn-ghost" 
                              onClick={() => { setSelectedFile(null); setUploadProgress(0); }}
                              style={{ padding: '4px 8px', fontSize: '0.65rem', color: 'var(--sl-red)' }}
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ border: '2px dashed var(--sl-glass-border)', borderRadius: '12px', padding: '24px', textAlign: 'center', cursor: 'pointer' }} onClick={() => fileInputRef.current?.click()}>
                        <FaCloudUploadAlt style={{ fontSize: '2rem', color: 'var(--sl-blue)', marginBottom: '8px' }} />
                        <div style={{ fontSize: '0.8rem', color: 'var(--sl-text-bright)' }}>Click to upload PDF, Excel, CSV, or OFX/QFX</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--sl-text-ghost)' }}>Parses local code or feeds to Gemini multimodal OCR</div>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv,.ofx,.qfx" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </div>
                )}

                {importTab === 'paste' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <textarea 
                      className="sl-input" 
                      style={{ height: '100px', fontSize: '0.8rem', resize: 'vertical' }} 
                      placeholder="Paste receipt email details, SMS debit notifications, or transaction logs here..." 
                      value={pastedReceipt} 
                      onChange={(e) => setPastedReceipt(e.target.value)} 
                    />
                    <button className="sl-btn sl-btn-primary" onClick={parsePastedReceipt} disabled={parsing || !pastedReceipt.trim()}>
                      {parsing ? 'Extracting via Gemini Flash...' : 'Extract Transaction'}
                    </button>
                  </div>
                )}

                {parsing && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px', color: 'var(--sl-blue)', fontFamily: 'var(--sl-font-mono)', fontSize: '0.7rem' }}>
                    <MdOutlineAutorenew className="sl-spin" style={{ fontSize: '1.2rem' }} /> [SYSTEM] PARSING TRANSMISSIONS...
                  </div>
                )}

                {importStats && (
                  <div className="sl-panel" style={{ marginTop: '16px', padding: '16px', background: 'rgba(0, 212, 255, 0.03)', border: '1px solid var(--sl-blue)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--sl-blue)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '8px' }}>
                      <FaCheckCircle /> Synchronization Complete
                    </div>
                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.8rem', color: 'var(--sl-text-bright)' }}>
                      <div>Saved: <span style={{ color: 'var(--sl-green)', fontWeight: 800 }}>{importStats.savedCount}</span></div>
                      <div>Duplicates Skipped: <span style={{ color: 'var(--sl-text-ghost)' }}>{importStats.ignoredCount}</span></div>
                      {importStats.xp && (
                        <div style={{ color: 'var(--sl-purple)', fontWeight: 800 }}>+{importStats.xp.xpGained} XP Level Up!</div>
                      )}
                    </div>
                  </div>
                )}

                {parsedTransactions.length > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <div className="sl-flex-between" style={{ marginBottom: '12px', borderBottom: '1px solid var(--sl-glass-border)', paddingBottom: '8px' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--sl-text-bright)' }}>Parsed Transactions ({parsedTransactions.length})</div>
                      <button className="sl-btn sl-btn-primary" onClick={bulkImportTransactions} disabled={parsing} style={{ padding: '6px 12px', fontSize: '0.7rem' }}>
                        Import All Unique Entries
                      </button>
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {parsedTransactions.map((tx, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--sl-glass-border)', padding: '10px', borderRadius: '8px' }}>
                          <div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--sl-text-bright)' }}>{tx.description}</div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--sl-text-ghost)' }}>{tx.date} • {tx.category}</div>
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: tx.type === 'income' ? 'var(--sl-green)' : 'var(--sl-red)' }}>
                            {tx.type === 'income' ? '+' : '-'}₹{tx.amount}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tx' && (
              <div className={styles.txList}>
                {transactions.map((t) => (
                  <div key={t._id} className={styles.txItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className={`${styles.txIcon} ${t.type === 'income' ? styles.txIconIncome : styles.txIconExpense}`}>
                        {t.type === 'income' ? <MdTrendingUp /> : <MdTrendingDown />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sl-text-bright)' }}>{t.description}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--sl-text-ghost)', fontFamily: 'var(--sl-font-mono)', textTransform: 'uppercase' }}>
                          {t.category} • {new Date(t.date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: 'var(--sl-font-display)', fontSize: '1.125rem', fontWeight: 800, color: t.type === 'income' ? 'var(--sl-green)' : 'var(--sl-red)' }}>
                        {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString()}
                      </span>
                      <button className="sl-btn sl-btn-ghost" onClick={() => deleteTransaction(t._id)} style={{ padding: '8px' }}><MdDelete /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'emi' && (
              <div className={styles.txList}>
                {emis.map((e) => (
                  <div key={e._id} className={styles.txItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
                    <div className="sl-flex-between" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className={`${styles.txIcon} ${styles.txIconExpense}`}><MdTrendingDown /></div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sl-text-bright)' }}>{e.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--sl-text-ghost)', fontFamily: 'var(--sl-font-mono)' }}>
                            Day {e.dayOfMonth} • {e.category}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontFamily: 'var(--sl-font-display)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--sl-red)' }}>
                          ₹{e.amount.toLocaleString()}
                        </span>
                        <button className="sl-btn sl-btn-ghost" onClick={async () => { await fetch(`/api/finance/emi?id=${e._id}`, { method: 'DELETE' }); fetchData(); }} style={{ padding: '8px' }}><MdDelete /></button>
                      </div>
                    </div>

                    <div style={{ width: '100%', display: 'flex', gap: '20px' }}>
                      <div style={{ flex: 1 }}>
                        <div className="sl-flex-between" style={{ marginBottom: '6px', fontSize: '0.65rem', fontWeight: 700, color: 'var(--sl-text-ghost)', textTransform: 'uppercase' }}>
                          <span>Tenure Progress</span>
                          <span>{e.totalMonths - e.remainingMonths} / {e.totalMonths} Months</span>
                        </div>
                        <div className="sl-progress sl-progress-gold">
                          <div className="sl-progress-fill" style={{ width: `${((e.totalMonths - e.remainingMonths) / e.totalMonths) * 100}%` }} />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div className="sl-flex-between" style={{ marginBottom: '6px', fontSize: '0.65rem', fontWeight: 700, color: 'var(--sl-text-ghost)', textTransform: 'uppercase' }}>
                          <span>Principal Status</span>
                          <span>₹{(e.principalTotal - e.principalPaid).toLocaleString()} Left</span>
                        </div>
                        <div className="sl-progress sl-progress-blue">
                          <div className="sl-progress-fill" style={{ width: `${(e.principalPaid / e.principalTotal) * 100}%` }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px', flexWrap: 'wrap' }}>
                      <button className="sl-btn sl-btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '0.7rem', minWidth: '140px' }} onClick={async () => {
                        const val = prompt('Update monthly EMI amount for ' + e.name, String(e.amount));
                        if (val !== null && val !== '') {
                          await fetch('/api/finance/emi', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: e._id, amount: Number(val) }) });
                          fetchData();
                        }
                      }}>Edit Amount</button>
                      <button className="sl-btn sl-btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '0.7rem', minWidth: '140px' }} onClick={async () => {
                        const val = prompt('Update total principal paid for ' + e.name, String(e.principalPaid || 0));
                        if (val !== null && val !== '') {
                          await fetch('/api/finance/emi', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: e._id, principalPaid: Number(val) }) });
                          fetchData();
                        }
                      }}>Edit Principal Paid</button>
                      <button className="sl-btn sl-btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '0.7rem', minWidth: '140px' }} onClick={async () => {
                        const val = prompt('Update months remaining for ' + e.name, String(e.remainingMonths));
                        if (val !== null && val !== '') {
                          await fetch('/api/finance/emi', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: e._id, remainingMonths: Number(val) }) });
                          fetchData();
                        }
                      }}>Edit Months Left</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'inv' && (
              <div className={styles.txList}>
                {investments.length > 0 && (
                  <div className={`sl-panel ${styles.aiCard}`} style={{ marginBottom: '24px', border: '1px solid var(--sl-purple-glow)' }}>
                    <div className="sl-flex-between" style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--sl-purple)', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        <MdTrendingUp /> [SYSTEM] Shadow Advisor Analysis
                      </div>
                      <button 
                        className="sl-btn sl-btn-secondary" 
                        style={{ padding: '4px 12px', fontSize: '0.65rem' }}
                        onClick={async () => {
                          const res = await fetch('/api/ai/advisor', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ type: 'investment', data: investments })
                          });
                          if (res.ok) {
                            const d = await res.json();
                            setAnalysisData(d.analysis);
                            setShowAnalysisModal(true);
                          }
                        }}
                      >
                        Generate Insight
                      </button>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--sl-text-dim)' }}>
                      Request the Shadow Advisor to analyze your asset distribution and project future credit growth.
                    </p>
                  </div>
                )}
                {investments.map((i) => (
                  <div key={i._id} className={styles.txItem} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '16px' }}>
                    <div className="sl-flex-between" style={{ width: '100%' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sl-text-bright)' }}>{i.fundName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--sl-text-ghost)', fontFamily: 'var(--sl-font-mono)' }}>
                          {i.subType || i.type} • Est. {i.expectedReturnRate}% Return
                        </div>
                        {i.lastUpdated && (
                          <div style={{ fontSize: '0.6rem', color: 'var(--sl-blue)', marginTop: '4px' }}>
                            Synced: {new Date(i.lastUpdated).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--sl-font-display)', fontSize: '1.25rem', fontWeight: 800, color: 'var(--sl-green)' }}>
                          ₹{i.currentAmount.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: i.returnPercent >= 0 ? 'var(--sl-green)' : 'var(--sl-red)', textTransform: 'uppercase' }}>
                          {i.returnPercent >= 0 ? '+' : ''}{i.returnPercent.toFixed(2)}% Return
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                      <button className="sl-btn sl-btn-secondary" style={{ flex: 1, padding: '8px', fontSize: '0.7rem' }} onClick={() => {
                        const newAmt = prompt('Enter current value for ' + i.fundName, i.currentAmount);
                        if (newAmt) fetch('/api/finance/investments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: i._id, currentAmount: Number(newAmt) }) }).then(fetchData);
                      }}>Update Value</button>
                      <button className="sl-btn sl-btn-ghost" onClick={async () => { await fetch(`/api/finance/investments?id=${i._id}`, { method: 'DELETE' }); fetchData(); }} style={{ padding: '8px' }}><MdDelete /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ins' && (
              <div className={styles.txList}>
                {insurances.map((ins) => (
                  <div key={ins._id} className={styles.txItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div className={`${styles.txIcon} styles.txIconIncome`} style={{ color: 'var(--sl-purple)' }}><GiHeartBeats /></div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sl-text-bright)' }}>{ins.policyName}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--sl-text-ghost)', fontFamily: 'var(--sl-font-mono)' }}>
                          {ins.provider} • Due {new Date(ins.nextDueDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--sl-font-display)', fontSize: '1.125rem', fontWeight: 800, color: 'var(--sl-purple)' }}>
                          ₹{ins.premiumAmount.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--sl-text-ghost)', textTransform: 'uppercase' }}>
                          {ins.frequency} Premium
                        </div>
                      </div>
                      <button className="sl-btn sl-btn-ghost" onClick={async () => { await fetch(`/api/finance/insurance?id=${ins._id}`, { method: 'DELETE' }); fetchData(); }} style={{ padding: '8px' }}><MdDelete /></button>
                    </div>
                  </div>
                ))}
                {insurances.length === 0 && (
                  <div className="sl-empty"><div className="sl-empty-text">[SYSTEM] No policies active</div></div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL MOVED OUTSIDE MAIN FOR STACKING CONTEXT SAFETY */}
      {showModal && (
        <div className="sl-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sl-flex-between" style={{ marginBottom: '16px' }}>
              <h3 className="sl-modal-title">Log Transaction</h3>
              <button 
                type="button"
                className="sl-btn sl-btn-ghost" 
                onClick={() => setShowModal(false)}
              >
                <MdClose />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className={styles.typeToggle}>
                <button 
                  type="button"
                  className={`${styles.typeBtn} ${styles.typeBtnExpense} ${form.type === 'expense' ? styles.typeBtnActive : ''}`} 
                  onClick={() => setForm({ ...form, type: 'expense', category: '' })}
                >
                  Expense
                </button>
                <button 
                  type="button"
                  className={`${styles.typeBtn} ${styles.typeBtnIncome} ${form.type === 'income' ? styles.typeBtnActive : ''}`} 
                  onClick={() => setForm({ ...form, type: 'income', category: '' })}
                >
                  Income
                </button>
              </div>

              <div>
                <label className="sl-label">Amount (₹)</label>
                <input 
                  className="sl-input" 
                  type="number" 
                  value={form.amount} 
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} 
                  placeholder="0.00" 
                />
              </div>

              <div>
                <label className="sl-label">Category</label>
                <select 
                  className="sl-select" 
                  value={form.category} 
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {CATEGORIES[form.type].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="sl-label">Description</label>
                <input 
                  className="sl-input" 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  placeholder="e.g. S-Rank Mission reward, Housing, Transport" 
                />
              </div>

              <div>
                <label className="sl-label">Date</label>
                <input 
                  className="sl-input" 
                  type="date" 
                  value={form.date} 
                  onChange={(e) => setForm({ ...form, date: e.target.value })} 
                />
              </div>

              <button 
                type="button"
                className="sl-btn sl-btn-primary" 
                onClick={addTransaction} 
                style={{ width: '100%', marginTop: '8px' }}
              >
                <FaBolt /> Complete Entry
              </button>
            </div>
          </div>
        </div>
      )}
      {/* EMI MODAL */}
      {showEmiModal && (
        <div className="sl-modal-overlay" onClick={() => setShowEmiModal(false)}>
          <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sl-flex-between" style={{ marginBottom: '24px' }}>
              <h3 className="sl-modal-title">Authorize New EMI</h3>
              <button className="sl-btn sl-btn-ghost" onClick={() => setShowEmiModal(false)}><MdClose /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="sl-label">Liability Name</label>
                <input className="sl-input" value={emiForm.name} onChange={(e) => setEmiForm({ ...emiForm, name: e.target.value })} placeholder="e.g. Citadel Loan, Gear Installment" />
              </div>
              <div className="sl-grid-2">
                <div>
                  <label className="sl-label">Monthly Payout (₹)</label>
                  <input className="sl-input" type="number" value={emiForm.amount} onChange={(e) => setEmiForm({ ...emiForm, amount: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="sl-label">Due Day (1-31)</label>
                  <input className="sl-input" type="number" min="1" max="31" value={emiForm.dayOfMonth} onChange={(e) => setEmiForm({ ...emiForm, dayOfMonth: e.target.value })} />
                </div>
              </div>
              <div className="sl-grid-2">
                <div>
                  <label className="sl-label">Total Principal (₹)</label>
                  <input className="sl-input" type="number" value={emiForm.principalTotal} onChange={(e) => setEmiForm({ ...emiForm, principalTotal: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="sl-label">Tenure (Months)</label>
                  <input className="sl-input" type="number" value={emiForm.totalMonths} onChange={(e) => setEmiForm({ ...emiForm, totalMonths: e.target.value })} />
                </div>
              </div>
              <button className="sl-btn sl-btn-primary" onClick={async () => {
                await fetch('/api/finance/emi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...emiForm, amount: Number(emiForm.amount), dayOfMonth: Number(emiForm.dayOfMonth), totalMonths: Number(emiForm.totalMonths), principalTotal: Number(emiForm.principalTotal), principalPaid: 0 }) });
                setShowEmiModal(false); fetchData();
              }} style={{ width: '100%', marginTop: '8px' }}><FaBolt /> Authorize Recurring Deduction</button>
            </div>
          </div>
        </div>
      )}

      {/* INVESTMENT MODAL */}
      {showInvModal && (
        <div className="sl-modal-overlay" onClick={() => setShowInvModal(false)}>
          <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sl-flex-between" style={{ marginBottom: '24px' }}>
              <h3 className="sl-modal-title">Initialize Asset</h3>
              <button className="sl-btn sl-btn-ghost" onClick={() => setShowInvModal(false)}><MdClose /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="sl-label">Asset Name</label>
                <input className="sl-input" value={invForm.fundName} onChange={(e) => setInvForm({ ...invForm, fundName: e.target.value })} placeholder="e.g. Core Fund, Ether" />
              </div>
              <div className="sl-grid-2">
                <div>
                  <label className="sl-label">Asset Type</label>
                  <select className="sl-select" value={invForm.subType} onChange={(e) => setInvForm({ ...invForm, subType: e.target.value })}>
                    <option value="Mutual Fund">Mutual Fund</option>
                    <option value="Index Fund">Index Fund</option>
                    <option value="Stock">Stock</option>
                    <option value="Crypto">Crypto</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="sl-label">Target Return (%)</label>
                  <input className="sl-input" type="number" value={invForm.expectedReturnRate} onChange={(e) => setInvForm({ ...invForm, expectedReturnRate: e.target.value })} />
                </div>
              </div>
              
              {(invForm.subType === 'Mutual Fund' || invForm.subType === 'Index Fund') && (
                <div className="sl-panel" style={{ padding: '16px', background: 'rgba(0, 212, 255, 0.05)', border: '1px dashed var(--sl-blue)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--sl-blue)', fontWeight: 800, marginBottom: '12px' }}>REAL-TIME SYNC SETTINGS</div>
                  <div className="sl-grid-2">
                    <div>
                      <label className="sl-label">Scheme Code</label>
                      <input className="sl-input" value={invForm.schemeCode} onChange={(e) => setInvForm({ ...invForm, schemeCode: e.target.value })} placeholder="e.g. 120716" />
                      <div style={{ fontSize: '0.6rem', color: 'var(--sl-text-ghost)', marginTop: '4px' }}>Search on mfapi.in</div>
                    </div>
                    <div>
                      <label className="sl-label">Total Units</label>
                      <input className="sl-input" type="number" step="0.001" value={invForm.units} onChange={(e) => setInvForm({ ...invForm, units: e.target.value })} placeholder="0.000" />
                    </div>
                  </div>
                </div>
              )}

              <div className="sl-grid-2">
                <div>
                  <label className="sl-label">Invested Capital (₹)</label>
                  <input className="sl-input" type="number" value={invForm.investedAmount} onChange={(e) => setInvForm({ ...invForm, investedAmount: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="sl-label">Current Evaluation (₹)</label>
                  <input className="sl-input" type="number" value={invForm.currentAmount} onChange={(e) => setInvForm({ ...invForm, currentAmount: e.target.value })} placeholder="Current worth" />
                </div>
              </div>
              <button className="sl-btn sl-btn-primary" onClick={async () => {
                await fetch('/api/finance/investments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...invForm, investedAmount: Number(invForm.investedAmount), currentAmount: Number(invForm.currentAmount), expectedReturnRate: Number(invForm.expectedReturnRate) }) });
                setShowInvModal(false); fetchData();
              }} style={{ width: '100%', marginTop: '8px' }}><FaBolt /> Register Asset</button>
            </div>
            {/* AI ANALYSIS MODAL */}
      {showAnalysisModal && analysisData && (
        <div className="sl-modal-overlay" onClick={() => setShowAnalysisModal(false)}>
          <div className="sl-modal" style={{ borderColor: 'var(--sl-purple)', maxWidth: '500px' }} onClick={(e) => e.stopPropagation()}>
            <div className="sl-flex-between" style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--sl-purple)', fontWeight: 800 }}>
                <MdTrendingUp /> SHADOW ADVISOR REPORT
              </div>
              <button className="sl-btn sl-btn-ghost" onClick={() => setShowAnalysisModal(false)}><MdClose /></button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="sl-panel" style={{ padding: '16px', background: 'rgba(168, 85, 247, 0.05)' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--sl-purple)', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Current Trend</div>
                <div style={{ fontSize: '0.9rem', color: 'var(--sl-text-bright)' }}>{analysisData.trendSummary}</div>
              </div>
              
              <div className="sl-grid-2">
                <div className="sl-panel" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--sl-red)', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Risk Level</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--sl-text-bright)' }}>{analysisData.riskLevel}</div>
                </div>
                <div className="sl-panel" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--sl-green)', fontWeight: 800, marginBottom: '4px', textTransform: 'uppercase' }}>Projected Growth</div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--sl-text-bright)' }}>{analysisData.projectedGrowth}</div>
                </div>
              </div>

              <div className="sl-panel" style={{ padding: '16px' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--sl-blue)', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>System Suggestions</div>
                <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '0.85rem', color: 'var(--sl-text-dim)', lineHeight: 1.6 }}>
                  {analysisData.suggestions.map((s: string, idx: number) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <button className="sl-btn sl-btn-primary" style={{ background: 'var(--sl-purple)', boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' }} onClick={() => setShowAnalysisModal(false)}>
                Acknowledge Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
        </div>
      )}

      {/* INSURANCE MODAL */}
      {showInsModal && (
        <div className="sl-modal-overlay" onClick={() => setShowInsModal(false)}>
          <div className="sl-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sl-flex-between" style={{ marginBottom: '24px' }}>
              <h3 className="sl-modal-title">Register Policy</h3>
              <button className="sl-btn sl-btn-ghost" onClick={() => setShowInsModal(false)}><MdClose /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label className="sl-label">Policy Name</label>
                <input className="sl-input" value={insForm.policyName} onChange={(e) => setInsForm({ ...insForm, policyName: e.target.value })} placeholder="e.g. Life Shield, Medical Cover" />
              </div>
              <div className="sl-grid-2">
                <div>
                  <label className="sl-label">Premium (₹)</label>
                  <input className="sl-input" type="number" value={insForm.premiumAmount} onChange={(e) => setInsForm({ ...insForm, premiumAmount: e.target.value })} placeholder="0" />
                </div>
                <div>
                  <label className="sl-label">Frequency</label>
                  <select className="sl-select" value={insForm.frequency} onChange={(e) => setInsForm({ ...insForm, frequency: e.target.value as any })}>
                    <option value="Monthly">Monthly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="sl-label">Provider</label>
                <input className="sl-input" value={insForm.provider} onChange={(e) => setInsForm({ ...insForm, provider: e.target.value })} placeholder="e.g. Star Health, HDFC Ergo" />
              </div>
              <div>
                <label className="sl-label">Next Due Date</label>
                <input className="sl-input" type="date" value={insForm.nextDueDate} onChange={(e) => setInsForm({ ...insForm, nextDueDate: e.target.value })} />
              </div>
              <button className="sl-btn sl-btn-primary" onClick={async () => {
                await fetch('/api/finance/insurance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...insForm, premiumAmount: Number(insForm.premiumAmount) }) });
                setShowInsModal(false); fetchData();
              }} style={{ width: '100%', marginTop: '8px' }}><FaBolt /> Bind Policy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
