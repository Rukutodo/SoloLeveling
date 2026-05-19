'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Sidebar from '@/components/Sidebar';
import { useToast } from '@/components/ToastProvider';
import { MdPersonAdd, MdCheck, MdClose, MdVisibility, MdSend, MdGroup, MdStars } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './network.module.css';

export default function HunterNetwork() {
  const { data: session, status } = useSession();
  const { showToast } = useToast();
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [sidebarData, setSidebarData] = useState<any>(null);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friendQuests, setFriendQuests] = useState<any[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [encourageMsg, setEncourageMsg] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
      fetch('/api/user').then(res => res.json()).then(d => setSidebarData(d.stats));
    }
  }, [status]);

  useEffect(() => {
    if (emailInput.length >= 2) {
      const delayDebounceFn = setTimeout(() => {
        searchHunters(emailInput);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setSearchResults([]);
    }
  }, [emailInput]);

  const fetchData = async () => {
    const res = await fetch('/api/friends');
    if (res.ok) {
      const data = await res.json();
      setFriends(data.friends || []);
      setPending(data.pending || []);
    }
  };

  const searchHunters = async (query: string) => {
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch (e) {}
  };

  const sendRequest = async () => {
    if (!emailInput) return;
    
    const isTag = emailInput.includes('#');
    const payload = isTag ? { recipientTag: emailInput } : { recipientEmail: emailInput };

    const res = await fetch('/api/friends', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (res.ok) {
      showToast('[SYSTEM] Request transmitted to target hunter.');
      setEmailInput('');
      setSearchResults([]);
      fetchData();
    } else {
      const d = await res.json();
      showToast(`[ERROR] ${d.error}`, 'error');
    }
  };

  const handleRequest = async (requestId: string, action: 'accepted' | 'declined') => {
    const res = await fetch('/api/friends', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, status: action })
    });
    if (res.ok) {
      fetchData();
    }
  };

  const viewFriendStatus = async (friend: any) => {
    setSelectedFriend(friend);
    setLoadingQuests(true);
    const hunter = friend.requester._id === session?.user?.id ? friend.recipient : friend.requester;
    const res = await fetch(`/api/friends/status?userId=${hunter._id}`);
    if (res.ok) {
      const data = await res.json();
      setFriendQuests(data.todos || []);
    }
    setLoadingQuests(false);
  };

  const sendEncouragement = async () => {
    if (!encourageMsg || !selectedFriend) return;
    const hunter = selectedFriend.requester._id === session?.user?.id ? selectedFriend.recipient : selectedFriend.requester;
    const res = await fetch('/api/friends/encourage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ friendId: hunter._id, message: encourageMsg })
    });
    if (res.ok) {
      showToast('[SYSTEM] Encouragement sent to comrade.');
      setEncourageMsg('');
    }
  };

  if (status === 'loading') return <div className="sl-loader" style={{ fontFamily: 'var(--sl-font-display)', letterSpacing: '4px' }}>INITIALIZING NETWORK...</div>;

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
          <h1 className="sl-page-title"><MdGroup style={{ verticalAlign: 'middle' }} /> Hunter Network</h1>
          <p className="sl-page-subtitle">[SYSTEM] Comrade tracking and coordination</p>
        </div>

        <div className={styles.networkGrid}>
          <div className={styles.managementCol}>
            <div className={`sl-panel ${styles.searchPanel}`}>
              <h2 className={styles.sectionLabel}><MdPersonAdd /> Recruit New Hunter</h2>
              
              <div className={styles.tagDisplay}>
                <span className={styles.tagLabel}>Your Hunter Tag</span>
                <span className={styles.tagValue}>{sidebarData?.tag || '...'}</span>
              </div>
              
              <p className={styles.searchHint}>Search by Name, Email or Tag (e.g. Sung#1234 or Venu)</p>
              
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="sl-input" 
                  placeholder="Search name or Tag..." 
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
                
                <AnimatePresence>
                  {searchResults.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={styles.searchDropdown}
                    >
                      {searchResults.map(u => (
                        <div key={u.tag} className={styles.searchResultItem} onClick={() => { setEmailInput(u.tag); setSearchResults([]); }}>
                          <div style={{ fontWeight: 800 }}>{u.name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--sl-blue)', fontFamily: 'var(--sl-font-mono)' }}>{u.tag} • LVL {u.level}</div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                <button className="sl-btn sl-btn-primary" onClick={sendRequest} style={{ marginTop: '16px', width: '100%' }}>Recruit Hunter</button>
              </div>
            </div>

            {pending.length > 0 && (
              <div className={`sl-panel ${styles.pendingPanel}`}>
                <h2 className={styles.sectionLabel}>Pending Reinforcements</h2>
                <div className={styles.requestList}>
                  {pending.map(req => (
                    <div key={req._id} className={styles.requestItem}>
                      <div>
                        <div className={styles.hunterName}>{req.requester.name}</div>
                        <div className={styles.hunterRank} style={{ color: 'var(--sl-blue)' }}>{req.requester.tag} • {req.requester.rank}-Rank</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="sl-btn sl-btn-primary" style={{ padding: '8px' }} onClick={() => handleRequest(req._id, 'accepted')}><MdCheck /></button>
                        <button className="sl-btn sl-btn-ghost" style={{ padding: '8px', color: 'var(--sl-red)' }} onClick={() => handleRequest(req._id, 'declined')}><MdClose /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className={`sl-panel ${styles.friendsPanel}`}>
              <h2 className={styles.sectionLabel}>Active Comrades</h2>
              <div className={styles.friendList}>
                {friends.map(friend => {
                  const hunter = friend.requester._id === session?.user?.id ? friend.recipient : friend.requester;
                  return (
                    <div key={friend._id} className={styles.friendItem} onClick={() => viewFriendStatus(friend)}>
                      <div className={styles.hunterAvatar}>{hunter.name[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div className={styles.hunterName}>{hunter.name}</div>
                        <div className={styles.hunterRank}>{hunter.tag} • LVL {hunter.level}</div>
                      </div>
                      <MdVisibility style={{ color: 'var(--sl-text-ghost)' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.visibilityCol}>
            {selectedFriend ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`sl-panel ${styles.statusPanel}`}>
                <div className={styles.statusHeader}>
                  <div className={styles.hunterBigAvatar}>
                    {(selectedFriend.requester._id === session?.user?.id ? selectedFriend.recipient : selectedFriend.requester).name[0]}
                  </div>
                  <div>
                    <h2 className={styles.hunterBigName}>
                      {(selectedFriend.requester._id === session?.user?.id ? selectedFriend.recipient : selectedFriend.requester).name}
                      <span style={{ fontSize: '0.8rem', color: 'var(--sl-text-ghost)', marginLeft: '10px' }}>
                        #{(selectedFriend.requester._id === session?.user?.id ? selectedFriend.recipient : selectedFriend.requester).tag?.split('#')[1]}
                      </span>
                    </h2>
                    <p className={styles.hunterBigTitle}>{(selectedFriend.requester._id === session?.user?.id ? selectedFriend.recipient : selectedFriend.requester).title}</p>
                  </div>
                </div>

                <div className={styles.questFeed}>
                  <h3 className={styles.feedLabel}>Recent Quests</h3>
                  {loadingQuests ? (
                    <div className="sl-loader" style={{ padding: '20px' }}>ACCESSING RECORDS...</div>
                  ) : friendQuests.length > 0 ? (
                    <div className={styles.questList}>
                      {friendQuests.map(quest => (
                        <div key={quest._id} className={styles.questItem}>
                          <MdStars style={{ color: quest.completed ? 'var(--sl-green)' : 'var(--sl-text-ghost)' }} />
                          <span style={{ color: quest.completed ? 'var(--sl-text-bright)' : 'var(--sl-text-ghost)' }}>{quest.title}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ textAlign: 'center', color: 'var(--sl-text-ghost)', padding: '20px' }}>NO ACTIVE QUESTS</p>
                  )}
                </div>

                <div className={styles.encourageArea}>
                  <input 
                    className="sl-input" 
                    placeholder="Send a word of encouragement..." 
                    value={encourageMsg}
                    onChange={(e) => setEncourageMsg(e.target.value)}
                  />
                  <button className="sl-btn sl-btn-primary" onClick={sendEncouragement}><MdSend /> Inspire</button>
                </div>
              </motion.div>
            ) : (
              <div className="sl-empty" style={{ height: '100%' }}>
                <div className="sl-empty-text">SELECT A COMRADE TO VIEW INTEL</div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
