'use client';

import React from 'react';
import Link from 'next/link';
import { useNotifications } from './NotificationProvider';
import { MdNotifications } from 'react-icons/md';
import styles from './TopHeader.module.css';

const TopHeader = () => {
  const { unreadCount } = useNotifications();

  return (
    <div className={styles.topHeader}>
      <Link href="/network" className={styles.notificationIcon} aria-label="Notifications">
        <MdNotifications />
        {unreadCount > 0 && (
          <span className={styles.badge}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
};

export default TopHeader;
