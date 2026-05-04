'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import {
  GiSwordWound,
  GiMuscleUp,
  GiMeal,
  GiHeartBeats,
  GiCalendar,
  GiGoldBar,
  GiExitDoor,
  GiHamburgerMenu,
} from 'react-icons/gi';
import { HiX } from 'react-icons/hi';
import { MdDashboard } from 'react-icons/md';
import styles from './Sidebar.module.css';

interface SidebarProps {
  userName?: string;
  level?: number;
  xp?: number;
  xpToNext?: number;
  rank?: string;
  title?: string;
  rankColor?: string;
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: MdDashboard, section: 'hub' },
  { href: '/calories', label: 'Calorie Tracker', icon: GiMeal, section: 'fitness' },
  { href: '/bmi', label: 'BMI Tracker', icon: GiHeartBeats, section: 'fitness' },
  { href: '/workouts', label: 'Workouts', icon: GiMuscleUp, section: 'fitness' },
  { href: '/calendar', label: 'Calendar', icon: GiCalendar, section: 'planning' },
  { href: '/finance', label: 'Finance', icon: GiGoldBar, section: 'planning' },
];

export default function Sidebar({
  userName = 'Hunter',
  level = 1,
  xp = 0,
  xpToNext = 100,
  rank = 'E',
  title = 'Awakened Hunter',
  rankColor = '#8b8b8b',
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const xpPercent = xpToNext > 0 ? Math.min((xp / xpToNext) * 100, 100) : 0;
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sections = {
    hub: 'Command Center',
    fitness: 'Fitness',
    planning: 'Planning',
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className={styles.mobileToggle}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
        id="sidebar-toggle"
      >
        {mobileOpen ? <HiX /> : <GiHamburgerMenu />}
      </button>

      {/* Mobile Overlay */}
      <div
        className={`${styles.mobileOverlay} ${mobileOpen ? styles.mobileOverlayVisible : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        {/* Logo */}
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <GiSwordWound />
            </div>
            <div>
              <div className={styles.logoText}>SOLO LEVELING</div>
              <div className={styles.logoSubtext}>System v1.0</div>
            </div>
          </div>
        </div>

        {/* Player Profile */}
        <div className={styles.playerProfile}>
          <div className={styles.playerInfo}>
            <div className={styles.playerAvatar}>{initials}</div>
            <div className={styles.playerDetails}>
              <div className={styles.playerName}>{userName}</div>
              <div className={styles.playerRank} style={{ color: rankColor }}>
                {rank}-Rank • {title}
              </div>
            </div>
          </div>
          <div className={styles.xpBarContainer}>
            <div className={styles.xpLabel}>
              <span>LVL {level}</span>
              <span>{xp} / {xpToNext} XP</span>
            </div>
            <div className={styles.xpBar}>
              <div className={styles.xpFill} style={{ width: `${xpPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {Object.entries(sections).map(([key, sectionTitle]) => (
            <div key={key} className={styles.navSection}>
              <div className={styles.navSectionTitle}>{sectionTitle}</div>
              {navItems
                .filter((item) => item.section === key)
                .map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                      id={`nav-${item.href.slice(1)}`}
                    >
                      <Icon className={styles.navIcon} />
                      <span className={styles.navLabel}>{item.label}</span>
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className={styles.sidebarFooter}>
          <button
            className={styles.logoutBtn}
            onClick={() => signOut({ callbackUrl: '/login' })}
            id="logout-btn"
          >
            <GiExitDoor className={styles.navIcon} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
