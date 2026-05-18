'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { useSession } from 'next-auth/react';

interface NotificationContextType {
  messages: any[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  addMessage: (msg: any) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const unreadCount = messages.filter(m => !m.isRead && m.receiverId === session?.user?.id).length;

  useEffect(() => {
    if (!session?.user?.id) return;

    // Fetch initial messages
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => setMessages(data.messages || []));

    // Initialize Pusher only if keys are available
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!pusherKey || !pusherCluster) {
      console.warn('[SYSTEM] Pusher environment variables missing. Real-time notifications disabled.');
      return;
    }

    const pusher = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    const channel = pusher.subscribe(`user-${session.user.id}`);
    
    channel.bind('new-message', (newMessage: any) => {
      setMessages(prev => [newMessage, ...prev]);
      // Play system sound if it's a system message
      if (newMessage.type === 'system') {
        try {
          const audio = new Audio('/sounds/system-alert.mp3');
          audio.play().catch(() => {}); 
        } catch (e) {}
      }
    });

    return () => {
      pusher.unsubscribe(`user-${session.user.id}`);
      pusher.disconnect();
    };
  }, [session?.user?.id]);

  const markAsRead = async (id: string) => {
    // Optimistic UI update
    setMessages(prev => prev.map(m => m._id === id ? { ...m, isRead: true } : m));
    
    // Persist to database
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
    <NotificationContext.Provider value={{ messages, unreadCount, markAsRead, addMessage }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
