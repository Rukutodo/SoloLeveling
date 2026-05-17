'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { useTheme, ThemeName } from './ThemeProvider';
import {
  GiSwordWound, GiMuscleUp, GiMeal, GiHeartBeats, GiCalendar,
  GiGoldBar, GiExitDoor, GiHamburgerMenu, GiTreasureMap,
} from 'react-icons/gi';
import {
  HiOutlineHome, HiOutlineClipboardList, HiOutlineMap, HiOutlineDocumentText,
  HiOutlineBookOpen, HiOutlineFire, HiOutlineHeart, HiOutlineLightningBolt,
  HiOutlineCalendar, HiOutlineCurrencyDollar, HiOutlineLogout,
} from 'react-icons/hi';
import {
  FiHome, FiCheckSquare, FiMap, FiFileText, FiBook,
  FiCoffee, FiActivity, FiZap, FiCalendar, FiDollarSign, FiLogOut,
} from 'react-icons/fi';
import {
  RiDashboardFill, RiTodoFill, RiRoadMapFill, RiStickyNoteFill,
  RiBookFill, RiFireFill, RiHeartPulseFill, RiBoxingFill,
  RiCalendarEventFill, RiMoneyDollarCircleFill, RiLogoutCircleFill,
} from 'react-icons/ri';
import { HiX } from 'react-icons/hi';
import { MdDashboard, MdTaskAlt, MdMenuBook, MdLibraryBooks } from 'react-icons/md';
import ThemeSwitcher from './ThemeSwitcher';
import styles from './Sidebar.module.css';

interface SidebarProps {
  userName?: string; level?: number; xp?: number; xpToNext?: number;
  rank?: string; title?: string; rankColor?: string;
}

// Icon sets per theme
const iconSets: Record<ThemeName, Record<string, React.ComponentType<{className?: string}>>> = {
  sololeveling: {
    dashboard: MdDashboard, todos: MdTaskAlt, quests: GiTreasureMap,
    notes: MdLibraryBooks, logbook: MdMenuBook, calories: GiMeal,
    bmi: GiHeartBeats, workouts: GiMuscleUp, calendar: GiCalendar,
    finance: GiGoldBar, logout: GiExitDoor, logo: GiSwordWound,
  },
  onedark: {
    dashboard: HiOutlineHome, todos: HiOutlineClipboardList, quests: HiOutlineMap,
    notes: HiOutlineDocumentText, logbook: HiOutlineBookOpen, calories: HiOutlineFire,
    bmi: HiOutlineHeart, workouts: HiOutlineLightningBolt, calendar: HiOutlineCalendar,
    finance: HiOutlineCurrencyDollar, logout: HiOutlineLogout, logo: HiOutlineHome,
  },
  rosepine: {
    dashboard: FiHome, todos: FiCheckSquare, quests: FiMap,
    notes: FiFileText, logbook: FiBook, calories: FiCoffee,
    bmi: FiActivity, workouts: FiZap, calendar: FiCalendar,
    finance: FiDollarSign, logout: FiLogOut, logo: FiHome,
  },
  catppuccin: {
    dashboard: RiDashboardFill, todos: RiTodoFill, quests: RiRoadMapFill,
    notes: RiStickyNoteFill, logbook: RiBookFill, calories: RiFireFill,
    bmi: RiHeartPulseFill, workouts: RiBoxingFill, calendar: RiCalendarEventFill,
    finance: RiMoneyDollarCircleFill, logout: RiLogoutCircleFill, logo: RiDashboardFill,
  },
  gruvbox: {
    dashboard: HiOutlineHome, todos: HiOutlineClipboardList, quests: HiOutlineMap,
    notes: HiOutlineDocumentText, logbook: HiOutlineBookOpen, calories: HiOutlineFire,
    bmi: HiOutlineHeart, workouts: HiOutlineLightningBolt, calendar: HiOutlineCalendar,
    finance: HiOutlineCurrencyDollar, logout: HiOutlineLogout, logo: HiOutlineHome,
  },
};

const navConfig = [
  { href: '/dashboard', label: 'Dashboard', key: 'dashboard', section: 'hub' },
  { href: '/todos', label: 'Quest Log', key: 'todos', section: 'hub' },
  { href: '/quests/chain', label: "Hunter's Roadmap", key: 'quests', section: 'hub' },
  { href: '/notes', label: 'System Notes', key: 'notes', section: 'hub' },
  { href: '/logbook', label: "Hunter's Logbook", key: 'logbook', section: 'hub' },
  { href: '/calories', label: 'Calorie Tracker', key: 'calories', section: 'fitness' },
  { href: '/bmi', label: 'BMI Tracker', key: 'bmi', section: 'fitness' },
  { href: '/workouts', label: 'Workouts', key: 'workouts', section: 'fitness' },
  { href: '/calendar', label: 'Calendar', key: 'calendar', section: 'planning' },
  { href: '/finance', label: 'Finance', key: 'finance', section: 'planning' },
  { href: '/admin/logs', label: 'System Monitor', key: 'dashboard', section: 'planning' },
];

// Theme-specific labels for nav sections
const sectionLabels: Record<ThemeName, Record<string, string>> = {
  sololeveling: { hub: 'Command Center', fitness: 'Fitness', planning: 'Planning' },
  onedark: { hub: 'Workspace', fitness: 'Health', planning: 'Organize' },
  rosepine: { hub: 'Garden', fitness: 'Vitality', planning: 'Seasons' },
  catppuccin: { hub: 'Home', fitness: 'Wellness', planning: 'Life' },
  gruvbox: { hub: 'Terminal', fitness: 'Grind', planning: 'Ledger' },
};

// Theme-specific branding
const branding: Record<ThemeName, { name: string; sub: string }> = {
  sololeveling: { name: 'SOLO LEVELING', sub: 'System v1.0' },
  onedark: { name: 'LEVELUP', sub: '// workspace' },
  rosepine: { name: 'Rosewood', sub: 'sanctuary' },
  catppuccin: { name: 'Neko Life', sub: 'meow mode ♪' },
  gruvbox: { name: 'GRUVBOX', sub: '$ retro_mode' },
};

export default function Sidebar({
  userName = 'Hunter', level = 1, xp = 0, xpToNext = 100,
  rank = 'E', title = 'Awakened Hunter', rankColor = '#8b8b8b',
}: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme } = useTheme();

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const xpPercent = xpToNext > 0 ? Math.min((xp / xpToNext) * 100, 100) : 0;
  const initials = userName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  const icons = iconSets[theme] || iconSets.sololeveling;
  const sections = sectionLabels[theme] || sectionLabels.sololeveling;
  const brand = branding[theme] || branding.sololeveling;
  const LogoIcon = icons.logo;
  const LogoutIcon = icons.logout;

  return (
    <>
      <button className={styles.mobileToggle} onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation" id="sidebar-toggle">
        {mobileOpen ? <HiX /> : <GiHamburgerMenu />}
      </button>
      <div className={`${styles.mobileOverlay} ${mobileOpen ? styles.mobileOverlayVisible : ''}`}
        onClick={() => setMobileOpen(false)} />

      <aside className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}><LogoIcon /></div>
            <div>
              <div className={styles.logoText}>{brand.name}</div>
              <div className={styles.logoSubtext}>{brand.sub}</div>
            </div>
          </div>
        </div>

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

        <nav className={styles.nav}>
          {Object.entries(sections).map(([key, sectionTitle]) => (
            <div key={key} className={styles.navSection}>
              <div className={styles.navSectionTitle}>{sectionTitle}</div>
              {navConfig.filter((item) => item.section === key).map((item) => {
                const isActive = pathname === item.href;
                const Icon = icons[item.key];
                return (
                  <Link key={item.href} href={item.href}
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                    id={`nav-${item.href.slice(1)}`}>
                    <Icon className={styles.navIcon} />
                    <span className={styles.navLabel}>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className={styles.sidebarFooter}>
          <ThemeSwitcher />
          <div style={{ height: '4px' }} />
          <button className={styles.logoutBtn} onClick={() => signOut({ callbackUrl: '/login' })} id="logout-btn">
            <LogoutIcon className={styles.navIcon} />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
