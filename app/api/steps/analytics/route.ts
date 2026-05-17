import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Steps from '@/lib/models/Steps';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'daily'; // daily, weekly, monthly, yearly

    await dbConnect();
    const userId = session.user.id;

    const dataPoints: Array<{ label: string; steps: number; calories: number }> = [];
    const now = new Date();

    if (view === 'daily') {
      // Last 7 days
      const startDate = new Date();
      startDate.setDate(now.getDate() - 6);
      startDate.setUTCHours(0, 0, 0, 0);

      const records = await Steps.find({
        userId,
        date: { $gte: startDate, $lte: now }
      }).sort({ date: 1 });

      for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        const record = records.find(r => r.date.toISOString().split('T')[0] === dateStr);
        const label = d.toLocaleDateString('en-US', { weekday: 'short' });

        dataPoints.push({
          label,
          steps: record ? record.steps : 0,
          calories: record ? record.caloriesBurned : 0
        });
      }
    } else if (view === 'weekly') {
      // Last 4 weeks (28 days)
      const startDate = new Date();
      startDate.setDate(now.getDate() - 27);
      startDate.setUTCHours(0, 0, 0, 0);

      const records = await Steps.find({
        userId,
        date: { $gte: startDate, $lte: now }
      }).sort({ date: 1 });

      for (let w = 0; w < 4; w++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(startDate.getDate() + w * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        let totalSteps = 0;
        let totalCalories = 0;

        records.forEach(r => {
          if (r.date >= weekStart && r.date <= weekEnd) {
            totalSteps += r.steps;
            totalCalories += r.caloriesBurned;
          }
        });

        const label = `Wk ${w + 1}`;
        dataPoints.push({
          label,
          steps: Math.round(totalSteps),
          calories: Math.round(totalCalories)
        });
      }
    } else if (view === 'monthly') {
      // Last 6 months
      const startDate = new Date();
      startDate.setMonth(now.getMonth() - 5);
      startDate.setDate(1);
      startDate.setUTCHours(0, 0, 0, 0);

      const records = await Steps.find({
        userId,
        date: { $gte: startDate, $lte: now }
      }).sort({ date: 1 });

      for (let m = 0; m < 6; m++) {
        const d = new Date(startDate);
        d.setMonth(startDate.getMonth() + m);
        const monthNum = d.getMonth();
        const yearNum = d.getFullYear();

        let totalSteps = 0;
        let totalCalories = 0;

        records.forEach(r => {
          if (r.date.getMonth() === monthNum && r.date.getFullYear() === yearNum) {
            totalSteps += r.steps;
            totalCalories += r.caloriesBurned;
          }
        });

        const label = d.toLocaleDateString('en-US', { month: 'short' });
        dataPoints.push({
          label,
          steps: Math.round(totalSteps),
          calories: Math.round(totalCalories)
        });
      }
    } else if (view === 'yearly') {
      // Last 12 months (yearly aggregate)
      const startDate = new Date();
      startDate.setMonth(now.getMonth() - 11);
      startDate.setDate(1);
      startDate.setUTCHours(0, 0, 0, 0);

      const records = await Steps.find({
        userId,
        date: { $gte: startDate, $lte: now }
      }).sort({ date: 1 });

      for (let m = 0; m < 12; m++) {
        const d = new Date(startDate);
        d.setMonth(startDate.getMonth() + m);
        const monthNum = d.getMonth();
        const yearNum = d.getFullYear();

        let totalSteps = 0;
        let totalCalories = 0;

        records.forEach(r => {
          if (r.date.getMonth() === monthNum && r.date.getFullYear() === yearNum) {
            totalSteps += r.steps;
            totalCalories += r.caloriesBurned;
          }
        });

        const label = d.toLocaleDateString('en-US', { month: 'short' });
        dataPoints.push({
          label,
          steps: Math.round(totalSteps),
          calories: Math.round(totalCalories)
        });
      }
    }

    return NextResponse.json({ dataPoints });
  } catch (error) {
    console.error('[SYSTEM] Analytics retrieval error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
