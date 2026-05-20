import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Steps from '@/lib/models/Steps';
import BodyMetric from '@/lib/models/BodyMetric';
import Sleep from '@/lib/models/Sleep';
import WorkoutLog from '@/lib/models/WorkoutLog';
import { awardXP } from '@/lib/xpSystem';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const user = await User.findById(session.user.id);
    if (!user || !user.googleRefreshToken) {
      return NextResponse.json({ error: 'Google Fit not connected. Please authorize first.' }, { status: 400 });
    }

    // Exchange Refresh Token for Access Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: user.googleRefreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.json();
      console.error('[SYSTEM] Google Fit token refresh failed:', errorData);
      return NextResponse.json({ error: 'Failed to refresh access token' }, { status: 500 });
    }

    const { access_token: accessToken } = await tokenRes.json();
    const userHeight = user.height || 175;

    // --- REUSED SYNC LOGIC ---
    const today = new Date();
    const startRange = new Date();
    startRange.setDate(today.getDate() - 7);
    startRange.setHours(0, 0, 0, 0);

    const endRange = new Date();
    endRange.setHours(23, 59, 59, 999);

    const startTimeMillis = startRange.getTime();
    const endTimeMillis = endRange.getTime();

    // 1. Fetch Steps Aggregate
    const stepsRes = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aggregateBy: [{
          dataTypeName: 'com.google.step_count.delta',
          dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps'
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis,
        endTimeMillis
      }),
    });

    // 2. Fetch Calories Aggregate
    const caloriesRes = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aggregateBy: [{
          dataTypeName: 'com.google.calories.expended',
          dataSourceId: 'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended'
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis,
        endTimeMillis
      }),
    });

    // 3. Fetch Body Weight
    const weightRes = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aggregateBy: [{
          dataTypeName: 'com.google.weight',
          dataSourceId: 'derived:com.google.weight:com.google.android.gms:merge_weight'
        }],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis,
        endTimeMillis
      }),
    });

    // 4. Fetch Sessions
    const startTimeStr = startRange.toISOString();
    const endTimeStr = endRange.toISOString();
    const sessionsRes = await fetch(`https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${startTimeStr}&endTime=${endTimeStr}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    // Processing
    const dailyStepsMap = new Map<string, number>();
    const dailyCaloriesMap = new Map<string, number>();

    if (stepsRes.ok) {
      const stepsData = await stepsRes.json();
      const buckets = stepsData.bucket || [];
      for (const bucket of buckets) {
        const bucketDateStr = new Date(Number(bucket.startTimeMillis)).toISOString().split('T')[0];
        const val = bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0;
        dailyStepsMap.set(bucketDateStr, Math.round(val));
      }
    }

    if (caloriesRes.ok) {
      const caloriesData = await caloriesRes.json();
      const buckets = caloriesData.bucket || [];
      for (const bucket of buckets) {
        const bucketDateStr = new Date(Number(bucket.startTimeMillis)).toISOString().split('T')[0];
        const val = bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || 0;
        dailyCaloriesMap.set(bucketDateStr, Math.round(val));
      }
    }

    let totalSyncedSteps = 0;
    for (const [dateStr, steps] of dailyStepsMap.entries()) {
      const date = new Date(dateStr);
      date.setUTCHours(0, 0, 0, 0);
      const caloriesBurned = dailyCaloriesMap.get(dateStr) || Math.round(steps * 0.04);
      totalSyncedSteps += steps;
      await Steps.findOneAndUpdate({ userId: session.user.id, date }, { steps, caloriesBurned }, { upsert: true });
    }

    if (weightRes.ok) {
      const weightData = await weightRes.json();
      const buckets = weightData.bucket || [];
      for (const bucket of buckets) {
        const bucketDateStr = new Date(Number(bucket.startTimeMillis)).toISOString().split('T')[0];
        const weightVal = bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.fpVal || bucket.dataset?.[0]?.point?.[0]?.value?.[0]?.intVal || 0;
        if (weightVal > 0) {
          const date = new Date(bucketDateStr);
          date.setUTCHours(0, 0, 0, 0);
          const bmi = Number((weightVal / ((userHeight / 100) * (userHeight / 100))).toFixed(1));
          let category = 'Normal';
          if (bmi < 18.5) category = 'Underweight';
          else if (bmi < 25) category = 'Normal';
          else if (bmi < 30) category = 'Overweight';
          else category = 'Obese';
          await BodyMetric.findOneAndUpdate({ userId: session.user.id, date }, { weight: Number(weightVal.toFixed(1)), height: userHeight, bmi, category }, { upsert: true });
        }
      }
    }

    let syncedSleepCount = 0;
    let syncedWorkoutsCount = 0;
    let totalXpEarned = 0;

    if (sessionsRes.ok) {
      const sessionsData = await sessionsRes.json();
      const sessions = sessionsData.session || [];
      for (const sessionObj of sessions) {
        const startTime = Number(sessionObj.startTimeMillis);
        const endTime = Number(sessionObj.endTimeMillis);
        const durationMin = Math.round((endTime - startTime) / (1000 * 60));

        if (sessionObj.activityType === 72) {
          const hours = Number((durationMin / 60).toFixed(1));
          if (hours > 0) {
            const date = new Date(endTime);
            date.setUTCHours(0, 0, 0, 0);
            let quality = 3;
            if (hours >= 7 && hours <= 9) quality = 5;
            else if (hours >= 6) quality = 4;
            await Sleep.findOneAndUpdate({ userId: session.user.id, date }, { hours, quality, notes: `[Background Sync] Sleep session: ${sessionObj.name || 'Auto-tracked'}` }, { upsert: true });
            syncedSleepCount++;
          }
        } else if (durationMin >= 10) {
          const sessionDate = new Date(startTime);
          const exists = await WorkoutLog.findOne({
            userId: session.user.id,
            date: { $gte: new Date(sessionDate.getTime() - 1000 * 60 * 10), $lte: new Date(sessionDate.getTime() + 1000 * 60 * 10) }
          });
          if (!exists) {
            const nameLower = (sessionObj.name || '').toLowerCase();
            const mode = nameLower.includes('gym') || nameLower.includes('lift') || nameLower.includes('strength') ? 'gym' : 'home';
            await WorkoutLog.create({
              userId: session.user.id,
              date: sessionDate,
              mode,
              duration: durationMin,
              notes: `[Background Sync] ${sessionObj.name || 'Synced Workout'}`,
              exercises: [{ exerciseId: 'google-fit', name: sessionObj.name || 'Synced Workout Session', sets: 3, reps: 10 }],
              caloriesBurned: Math.round(durationMin * 6)
            });
            const xpReward = Math.min(Math.max(durationMin, 15), 50);
            await awardXP(session.user.id, xpReward);
            totalXpEarned += xpReward;
            syncedWorkoutsCount++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalSteps: totalSyncedSteps,
        syncedSleep: syncedSleepCount,
        syncedWorkouts: syncedWorkoutsCount,
        xpEarned: totalXpEarned
      }
    });

  } catch (error: any) {
    console.error('[SYSTEM] Background Google Fit Sync Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
