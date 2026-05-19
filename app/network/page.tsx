'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { useToast } from '@/components/ToastProvider';
import { useNotifications } from '@/components/NotificationProvider';
import { MdPersonAdd, MdCheck, MdClose, MdVisibility, MdSend, MdGroup, MdStars, MdNotifications, MdMail, MdDelete } from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './network.module.css';

export default function HunterNetwork() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { messages, markAsRead, addMessage, unreadSystemCount, unreadChatCount } = useNotifications();
  
  const [friends, setFriends] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [sidebarData, setSidebarData] = useState<any>(null);
  
  // Unified view state
  const [activeView, setActiveView] = useState<'intel' | 'comrade'>('intel');
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [friendQuests, setFriendQuests] = useState<any[]>([]);
  const [loadingQuests, setLoadingQuests] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
      fetch('/api/user').then(res => res.json()).then(d => setSidebarData(d.stats));
    }
  }, [status]);

  // Handle deep-linking from notifications
  useEffect(() => {
    if (friends.length > 0) {
      const view = searchParams.get('view');
      const userId = searchParams.get('userId');
      
      if (view === 'comrade' && userId) {
        const friend = friends.find(f => 
          f.requester._id === userId || f.recipient._id === userId
        );
        if (friend) viewFriendStatus(friend);
      }
    }
  }, [friends, searchParams]);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeView, selectedFriend]);

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
    if (res.ok) fetchData();
  };

  const viewFriendStatus = async (friend: any) => {
    setSelectedFriend(friend);
    setActiveView('comrade');
    setLoadingQuests(true);
    const hunter = friend.requester._id === session?.user?.id ? friend.recipient : friend.requester;
    const res = await fetch(`/api/friends/status?userId=${hunter._id}`);
    if (res.ok) {
      const data = await res.json();
      setFriendQuests(data.todos || []);
    }
    setLoadingQuests(false);
  };

  const sendMessage = async () => {
    if (!replyText.trim()) return;
    let receiverId;
    
    if (activeView === 'comrade' && selectedFriend) {
      const hunter = selectedFriend.requester._id === session?.user?.id ? selectedFriend.recipient : selectedFriend.requester;
      receiverId = hunter._id;
    } else {
      return; // Can only send chat to comrades
    }

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId, text: replyText, type: 'chat' })
      });
      if (res.ok) {
        const data = await res.json();
        addMessage(data.message);
        setReplyText('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearSystemIntel = async () => {
    if (!confirm('Purge system intelligence records?')) return;
    await fetch('/api/messages', { method: 'DELETE' });
    window.location.reload();
  };

  if (status === 'loading') return <div className="sl-loader" style={{ fontFamily: 'var(--sl-font-display)', letterSpacing: '4px' }}>INITIALIZING NETWORK...</div>;

  const currentHunter = selectedFriend ? (selectedFriend.requester._id === session?.user?.id ? selectedFriend.recipient : selectedFriend.requester) : null;
  
  // Filter messages for current view
  const chatMessages = messages.filter(m => {
    if (activeView === 'intel') return m.type === 'system';
    if (activeView === 'comrade' && currentHunter) {
      return m.type === 'chat' && (
        (m.senderId === session?.user?.id && m.receiverId === currentHunter._id) ||
        (m.senderId === currentHunter._id && m.receiverId === session?.user?.id)
      );
    }
    return false;
  }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Automatically mark visible messages as read
  useEffect(() => {
    const unreadInView = chatMessages.filter(m => !m.isRead && m.receiverId === session?.user?.id);
    if (unreadInView.length > 0) {
      unreadInView.forEach(msg => markAsRead(msg._id));
    }
  }, [chatMessages, session?.user?.id]);

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
          <p className="sl-page-subtitle">[SYSTEM] Comrade coordination and tactical intelligence</p>
        </div>

        <div className={styles.networkGrid}>
          <div className={styles.managementCol}>
            {/* Intel Hub Selector */}
            <div className={`sl-panel ${styles.navPanel}`}>
              <button 
                className={`${styles.navBtn} ${activeView === 'intel' ? styles.navBtnActive : ''}`}
                onClick={() => { setActiveView('intel'); setSelectedFriend(null); }}
              >
                <div style={{ position: 'relative' }}>
                  <MdNotifications />
                  {unreadSystemCount > 0 && <span className={styles.navBadge}>{unreadSystemCount}</span>}
                </div>
                <span>System Intel</span>
              </button>
            </div>

            <div className={`sl-panel ${styles.searchPanel}`}>
              <h2 className={styles.sectionLabel}><MdPersonAdd /> Recruit Hunter</h2>
              <div className={styles.tagDisplay}>
                <span className={styles.tagLabel}>Your Tag</span>
                <span className={styles.tagValue}>{sidebarData?.tag || '...'}</span>
              </div>
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
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className={styles.searchDropdown}>
                      {searchResults.map(u => (
                        <div key={u.tag} className={styles.searchResultItem} onClick={() => { setEmailInput(u.tag); setSearchResults([]); }}>
                          <div style={{ fontWeight: 800 }}>{u.name}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--sl-blue)', fontFamily: 'var(--sl-font-mono)' }}>{u.tag} • LVL {u.level}</div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                <button className="sl-btn sl-btn-primary" onClick={sendRequest} style={{ marginTop: '16px', width: '100%' }}>Send Request</button>
              </div>
            </div>

            {pending.length > 0 && (
              <div className={`sl-panel ${styles.pendingPanel}`}>
                <h2 className={styles.sectionLabel}>Pending Support</h2>
                <div className={styles.requestList}>
                  {pending.map(req => (
                    <div key={req._id} className={styles.requestItem}>
                      <div style={{ flex: 1 }}>
                        <div className={styles.hunterName}>{req.requester.name}</div>
                        <div className={styles.hunterRank} style={{ color: 'var(--sl-blue)' }}>{req.requester.tag}</div>
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
                  const isSelected = selectedFriend?._id === friend._id;
                  return (
                    <div key={friend._id} className={`${styles.friendItem} ${isSelected ? styles.friendItemActive : ''}`} onClick={() => viewFriendStatus(friend)}>
                      <div className={styles.hunterAvatar}>{hunter.name[0]}</div>
                      <div style={{ flex: 1 }}>
                        <div className={styles.hunterName}>{hunter.name}</div>
                        <div className={styles.hunterRank}>LVL {hunter.level} • {hunter.rank}-Rank</div>
                      </div>
                      <MdVisibility style={{ color: isSelected ? 'var(--sl-blue)' : 'var(--sl-text-ghost)' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.visibilityCol}>
            <div className={`sl-panel ${styles.statusPanel}`}>
              {activeView === 'intel' ? (
                <div className={styles.intelView}>
                  <div className={styles.statusHeader}>
                    <div className={styles.hunterBigAvatar}><MdNotifications /></div>
                    <div style={{ flex: 1 }}>
                      <h2 className={styles.hunterBigName}>System Intelligence</h2>
                      <p className={styles.hunterBigTitle}>High-priority notifications and alerts</p>
                    </div>
                    <button className="sl-btn sl-btn-ghost" onClick={clearSystemIntel} style={{ fontSize: '0.65rem' }}>Purge Intel</button>
                  </div>
                  
                  <div className={styles.chatWindow} ref={scrollRef}>
                    {chatMessages.length > 0 ? (
                      <div className={styles.messageList}>
                        {chatMessages.map(msg => (
                          <div 
                            key={msg._id} 
                            className={`${styles.msgItem} ${!msg.isRead ? styles.msgUnread : ''}`}
                            onMouseEnter={() => !msg.isRead && markAsRead(msg._id)}
                          >
                            <div className={styles.msgIcon}><MdStars style={{ color: 'var(--sl-blue)' }} /></div>
                            <div className={styles.msgBody}>
                              <div className={styles.msgMeta}>
                                <span className={styles.msgTime}>{new Date(msg.createdAt).toLocaleString()}</span>
                              </div>
                              <div className={styles.msgText}>{msg.text}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="sl-empty">
                        <div className="sl-empty-text">NO TACTICAL INTEL AVAILABLE</div>
                      </div>
                    )}
                  </div>
                </div>
              ) : currentHunter ? (
                <div className={styles.comradeView}>
                  <div className={styles.statusHeader}>
                    <div className={styles.hunterBigAvatar}>{currentHunter.name[0]}</div>
                    <div style={{ flex: 1 }}>
                      <h2 className={styles.hunterBigName}>
                        {currentHunter.name}
                        <span className={styles.tagSpan}>#{currentHunter.tag?.split('#')[1]}</span>
                      </h2>
                      <p className={styles.hunterBigTitle}>{currentHunter.title || 'Awakened Hunter'}</p>
                    </div>
                  </div>

                  <div className={styles.comradeContent}>
                    <div className={styles.questFeed}>
                      <h3 className={styles.feedLabel}>Tactical Quests</h3>
                      {loadingQuests ? (
                        <div className="sl-loader" style={{ padding: '40px', fontSize: '0.7rem' }}>ACCESSING RECORDS...</div>
                      ) : friendQuests.length > 0 ? (
                        <div className={styles.questList}>
                          {friendQuests.map(quest => (
                            <div key={quest._id} className={styles.questItem}>
                              <MdStars style={{ color: quest.completed ? 'var(--sl-green)' : 'var(--sl-text-ghost)', fontSize: '1.2rem' }} />
                              <div style={{ flex: 1 }}>
                                <div style={{ color: quest.completed ? 'var(--sl-text-bright)' : 'var(--sl-text-dim)', fontWeight: 700 }}>{quest.title}</div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--sl-text-ghost)', textTransform: 'uppercase', marginTop: '2px' }}>{quest.completed ? 'Mission Accomplished' : 'In Progress'}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="sl-empty" style={{ padding: '40px 0' }}>
                          <div className="sl-empty-text">NO ACTIVE QUESTS</div>
                        </div>
                      )}
                    </div>

                    <div className={styles.chatSection}>
                      <h3 className={styles.feedLabel}>Secure Communication</h3>
                      <div className={styles.chatWindow} ref={scrollRef}>
                        {chatMessages.length > 0 ? (
                          <div className={styles.messageList}>
                            {chatMessages.map((msg, i) => {
                              const isMe = msg.senderId === session?.user?.id;
                              const prevMsg = chatMessages[i - 1];
                              const isFirstInGroup = !prevMsg || prevMsg.senderId !== msg.senderId;
                              
                              return (
                                <div key={msg._id} className={`${styles.chatBubble} ${isMe ? styles.chatMe : styles.chatThem} ${isFirstInGroup ? styles.bubbleTail : ''}`}>
                                  <div className={styles.bubbleText}>{msg.text}</div>
                                  <div className={styles.bubbleTime}>
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {isMe && <MdCheck style={{ marginLeft: '4px', fontSize: '0.8rem', color: msg.isRead ? 'var(--sl-blue)' : 'inherit' }} />}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="sl-empty" style={{ padding: '60px 0' }}>
                            <div className="sl-empty-text">NO MESSAGE HISTORY</div>
                            <p style={{ fontSize: '0.6rem', color: 'var(--sl-text-ghost)', marginTop: '8px' }}>Send an encrypted word of encouragement</p>
                          </div>
                        )}
                      </div>
                      <div className={styles.chatInput}>
                        <input 
                          className="sl-input" 
                          placeholder="Send encrypted message..." 
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                          style={{ borderRadius: '24px', paddingLeft: '24px' }}
                        />
                        <button className="sl-btn sl-btn-primary" onClick={sendMessage} style={{ width: '48px', height: '48px', padding: 0, borderRadius: '50%' }}>
                          <MdSend style={{ fontSize: '1.2rem' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
