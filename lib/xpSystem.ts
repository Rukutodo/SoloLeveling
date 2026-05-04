import dbConnect from './mongodb';
import User from './models/User';

/* ─── XP Rewards ───────────────────────────────────────────────────── */
export const XP_REWARDS = {
  LOG_MEAL: 10,
  COMPLETE_WORKOUT: 25,
  LOG_WEIGHT: 5,
  LOG_TRANSACTION: 5,
  SEVEN_DAY_STREAK: 50,
  COMPLETE_DAILY_GOALS: 30,
} as const;

/* ─── Rank Thresholds ──────────────────────────────────────────────── */
export const RANKS = [
  { rank: 'E', minLevel: 1, maxLevel: 5, color: '#8b8b8b', title: 'Awakened Hunter' },
  { rank: 'D', minLevel: 6, maxLevel: 15, color: '#4fc3f7', title: 'Skilled Hunter' },
  { rank: 'C', minLevel: 16, maxLevel: 30, color: '#66bb6a', title: 'Elite Hunter' },
  { rank: 'B', minLevel: 31, maxLevel: 50, color: '#7b2ff7', title: 'Master Hunter' },
  { rank: 'A', minLevel: 51, maxLevel: 75, color: '#ffd700', title: 'National-Level Hunter' },
  { rank: 'S', minLevel: 76, maxLevel: 100, color: '#ff3e3e', title: 'Shadow Monarch' },
] as const;

/* ─── XP to next level calculation ─────────────────────────────────── */
export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/* ─── Get rank info from level ─────────────────────────────────────── */
export function getRankInfo(level: number) {
  const rank = RANKS.find((r) => level >= r.minLevel && level <= r.maxLevel) || RANKS[0];
  return rank;
}

/* ─── Award XP and handle level-ups ────────────────────────────────── */
export async function awardXP(userId: string, amount: number) {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  user.xp += amount;
  user.totalXp += amount;

  let leveledUp = false;
  let newLevel = user.level;

  // Check for level up(s)
  while (user.xp >= xpForLevel(user.level)) {
    user.xp -= xpForLevel(user.level);
    user.level += 1;
    leveledUp = true;
    newLevel = user.level;
  }

  // Update rank and title
  const rankInfo = getRankInfo(user.level);
  user.rank = rankInfo.rank;
  user.title = rankInfo.title;

  await user.save();

  return {
    level: newLevel,
    xp: user.xp,
    totalXp: user.totalXp,
    xpToNext: xpForLevel(newLevel),
    rank: rankInfo.rank,
    title: rankInfo.title,
    leveledUp,
  };
}

/* ─── Get user stats ───────────────────────────────────────────────── */
export async function getUserStats(userId: string) {
  await dbConnect();

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const rankInfo = getRankInfo(user.level);

  return {
    level: user.level,
    xp: user.xp,
    totalXp: user.totalXp,
    xpToNext: xpForLevel(user.level),
    rank: rankInfo.rank,
    title: rankInfo.title,
    rankColor: rankInfo.color,
    name: user.name,
  };
}
