'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { useSession } from 'next-auth/react';

interface NotificationContextType {
  messages: any[];
  unreadCount: number;
  markAsRead: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const unreadCount = messages.filter(m => !m.isRead).length;

  useEffect(() => {
    if (!session?.user?.id) return;

    // Fetch initial messages
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => setMessages(data.messages || []));

    // Initialize Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`user-${session.user.id}`);
    
    channel.bind('new-message', (newMessage: any) => {
      setMessages(prev => [newMessage, ...prev]);
      // Play system sound if it's a system message
      if (newMessage.type === 'system') {
        const audio = new Audio('/sounds/system-alert.mp3');
        audio.play().catch(() => {}); // Catch if browser blocks auto-play
      }
    });

    return () => {
      pusher.unsubscribe(`user-${session.user.id}`);
      pusher.disconnect();
    };
  }, [session?.user?.id]);

  const markAsRead = (id: string) => {
    // API call to mark as read could go here
    setMessages(prev => prev.map(m => m._id === id ? { ...m, isRead: true } : m));
  };

  return (
    <NotificationContext.Provider value={{ messages, unreadCount, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
};
