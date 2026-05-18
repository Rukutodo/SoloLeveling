'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { useNotifications } from '@/components/NotificationProvider';
import { MdMail, MdNotifications, MdCheckCircle, MdOutlineHistory, MdSend } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './messages.module.css';

export default function MessagesPage() {
  const { data: session, status } = useSession();
  const { messages, markAsRead } = useNotifications();
  const [activeTab, setActiveTab] = useState<'system' | 'chat'>('system');
  const [replyText, setReplyText] = useState('');
  const [sidebarData, setSidebarData] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/user')
      .then(res => res.json())
      .then(data => setSidebarData(data.stats));
      
    fetch('/api/friends')
      .then(res => res.json())
      .then(data => setFriends(data.friends || []));
  }, []);

  const filteredMessages = messages.filter(m => activeTab === 'system' ? m.type === 'system' : m.type === 'chat');

  const sendMessage = async () => {
    if (!replyText.trim() || !selectedChatUser) return;
    
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: selectedChatUser, text: replyText, type: 'chat' })
      });
      if (res.ok) {
        setReplyText('');
        alert('[SYSTEM] MESSAGE TRANSMITTED.');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearMessages = async () => {
    if (!confirm('Clear all messages in this sector?')) return;
    await fetch('/api/messages', { method: 'DELETE' });
    window.location.reload(); // Quick refresh to clear UI state
  };

  if (status === 'loading') return <div className="sl-loader">INITIALIZING SYSTEM...</div>;

  return (
    <div className="sl-page-wrapper">
      <Sidebar 
        userName={sidebarData?.name} 
        level={sidebarData?.level} 
        xp={sidebarData?.xp} 
        xpToNext={sidebarData?.xpToNext} 
        rank={sidebarData?.rank} 
        title={sidebarData?.title} 
        rankColor={sidebarData?.rankColor} 
      />
      
      <main className="sl-main-content">
        <div className="sl-page-header">
          <h1 className="sl-page-title"><MdMail style={{ verticalAlign: 'middle' }} /> Shadow Inbox</h1>
          <p className="sl-page-subtitle">[SYSTEM] Encrypted communications channel</p>
        </div>

        <div className={styles.msgLayout}>
          <div className={`sl-panel ${styles.sidebar}`}>
            <button className={`${styles.tabBtn} ${activeTab === 'system' ? styles.active : ''}`} onClick={() => setActiveTab('system')}>
              <MdNotifications /> System Intel
            </button>
            <button className={`${styles.tabBtn} ${activeTab === 'chat' ? styles.active : ''}`} onClick={() => setActiveTab('chat')}>
              <MdMail /> Hunter Direct
            </button>
          </div>

          <div className={`sl-panel ${styles.messageWindow}`}>
            <div className={styles.msgHeader} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{activeTab === 'system' ? 'A-Rank Intelligence Feed' : 'Encrypted Peer-to-Peer Channel'}</span>
              {activeTab === 'system' && (
                <button className="sl-btn sl-btn-ghost" onClick={clearMessages} style={{ padding: '4px 8px', fontSize: '0.6rem' }}>Clear Intel</button>
              )}
            </div>

            <div className={styles.msgList}>
              <AnimatePresence mode="popLayout">
                {filteredMessages.length > 0 ? (
                  filteredMessages.map((msg) => (
                    <motion.div 
                      key={msg._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className={`${styles.msgItem} ${!msg.isRead ? styles.unread : ''}`}
                      onMouseEnter={() => !msg.isRead && markAsRead(msg._id)}
                    >
                      <div className={styles.msgIcon}>
                        {msg.type === 'system' ? <MdCheckCircle style={{ color: 'var(--sl-blue)' }} /> : <MdMail />}
                      </div>
                      <div className={styles.msgContent}>
                        <div className={styles.msgMeta}>
                          <span className={styles.msgSender}>{msg.senderId === 'system' ? 'SYSTEM' : 'Hunter'}</span>
                          <span className={styles.msgTime}>{new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                        <div className={styles.msgText}>{msg.text}</div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="sl-empty">
                    <div className="sl-empty-text">NO NEW INTEL RECEIVED</div>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {activeTab === 'chat' && (
              <div className={styles.msgInputArea} style={{ flexDirection: 'column' }}>
                <select 
                  className="sl-select" 
                  value={selectedChatUser || ''} 
                  onChange={(e) => setSelectedChatUser(e.target.value)}
                  style={{ marginBottom: '12px' }}
                >
                  <option value="" disabled>Select a Comrade...</option>
                  {friends.map((f: any) => {
                    const hunter = f.requester._id === session?.user?.id ? f.recipient : f.requester;
                    return <option key={hunter._id} value={hunter._id}>{hunter.name} ({hunter.tag})</option>;
                  })}
                </select>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    type="text" 
                    className="sl-input" 
                    placeholder="Send encrypted message..." 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                  />
                  <button className="sl-btn sl-btn-primary" onClick={sendMessage} style={{ padding: '12px' }}><MdSend /></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
