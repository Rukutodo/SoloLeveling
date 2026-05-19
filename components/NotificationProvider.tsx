'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface NotificationContextType {
  messages: any[];
  unreadCount: number; // Total unread
  unreadSystemCount: number;
  unreadChatCount: number;
  markAsRead: (id: string) => void;
  addMessage: (msg: any) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  
  const myUnreadMessages = messages.filter(m => !m.isRead && m.receiverId === session?.user?.id);
  const unreadCount = myUnreadMessages.length;
  const unreadSystemCount = myUnreadMessages.filter(m => m.type === 'system').length;
  const unreadChatCount = myUnreadMessages.filter(m => m.type === 'chat').length;

  const fetchMessages = () => {
    if (!session?.user?.id) return;
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => {
        if (data.messages) {
           setMessages(data.messages);
        }
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchMessages();
    // Simple persistent polling every 10 seconds
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  const markAsRead = async (id: string) => {
    setMessages(prev => prev.map(m => m._id === id ? { ...m, isRead: true } : m));
    try {
      await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
    } catch (e) {
      console.error('Failed to mark message as read', e);
    }
  };

  const addMessage = (msg: any) => {
    setMessages(prev => [msg, ...prev]);
  };

  return (
    <NotificationContext.Provider value={{ messages, unreadCount, unreadSystemCount, unreadChatCount, markAsRead, addMessage }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
