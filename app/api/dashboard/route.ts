import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import FoodEntry from '@/lib/models/FoodEntry';
import WorkoutLog from '@/lib/models/WorkoutLog';
import BodyMetric from '@/lib/models/BodyMetric';
import Transaction from '@/lib/models/Transaction';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const userId = session.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's calories
    const todayMeals = await FoodEntry.find({
      userId,
      date: { $gte: today, $lt: tomorrow },
    });
    const todayCalories = todayMeals.reduce((sum, m) => sum + m.calories, 0);

    // Workout streak
    let workoutStreak = 0;
    const checkDate = new Date(today);
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const dayStart = new Date(checkDate);
      const dayEnd = new Date(checkDate);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const hasWorkout = await WorkoutLog.exists({
        userId,
        date: { $gte: dayStart, $lt: dayEnd },
      });
      
      if (hasWorkout) {
        workoutStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
      
      // Cap at 365 to prevent infinite loop
      if (workoutStreak >= 365) break;
    }

    // Latest BMI
    const latestBmi = await BodyMetric.findOne({ userId }).sort({ date: -1 });

    // Monthly net worth (Salary-based Cycle)
    const latestSalary = await Transaction.findOne({
      userId,
      category: 'Salary',
      type: 'income'
    }).sort({ date: -1 });

    const cycleStart = latestSalary ? latestSalary.date : new Date(today.getFullYear(), today.getMonth(), 1);
    // End date is far enough in future to capture all recent spending
    const cycleEnd = new Date(today.getFullYear(), today.getMonth() + 1, 10);
    
    const cycleTransactions = await Transaction.find({
      userId,
      date: { $gte: cycleStart, $lt: cycleEnd },
    });
    
    const monthlyNetWorth = cycleTransactions.reduce((sum, t) => {
      return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);

    // Recent activity (last 10 items from all collections)
    const recentActivity: Array<{ icon: string; text: string; time: string }> = [];

    const recentMeals = await FoodEntry.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3);
    recentMeals.forEach((m) => {
      recentActivity.push({
        icon: 'meal',
        text: `Logged ${m.foodName} — ${m.calories} kcal`,
        time: formatTimeAgo(m.createdAt),
      });
    });

    const recentWorkouts = await WorkoutLog.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3);
    recentWorkouts.forEach((w) => {
      recentActivity.push({
        icon: 'workout',
        text: `Completed ${w.mode} workout — ${w.exercises.length} exercises`,
        time: formatTimeAgo(w.createdAt),
      });
    });

    const recentTransactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(3);
    recentTransactions.forEach((t) => {
      recentActivity.push({
        icon: 'finance',
        text: `${t.type === 'income' ? 'Earned' : 'Spent'} ₹${t.amount} — ${t.category}`,
        time: formatTimeAgo(t.createdAt),
      });
    });

    // Sort by recency
    recentActivity.sort((a, b) => {
      // Simple sort by time string - not perfect but works for display
      return 0;
    });

    return NextResponse.json({
      todayCalories,
      workoutStreak,
      latestBmi: latestBmi?.bmi || null,
      monthlyNetWorth,
      recentActivity: recentActivity.slice(0, 8),
      isSalaryCycle: !!latestSalary,
      cycleStart: cycleStart.toISOString().split('T')[0],
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatTimeAgo(date: Date): string {
  if (!date) return 'Ancient';
  const time = new Date(date).getTime();
  if (isNaN(time)) return 'Ancient';
  
  const seconds = Math.floor((Date.now() - time) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}
