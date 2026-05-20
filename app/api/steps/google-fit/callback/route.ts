import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Steps from '@/lib/models/Steps';
import BodyMetric from '@/lib/models/BodyMetric';
import Sleep from '@/lib/models/Sleep';
import WorkoutLog from '@/lib/models/WorkoutLog';
import User from '@/lib/models/User';
import { awardXP } from '@/lib/xpSystem';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse('<h1>Unauthorized. Please sign in first.</h1>', { status: 401, headers: { 'Content-Type': 'text/html' } });
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const targetDateStr = searchParams.get('state') || new Date().toISOString().split('T')[0];

    if (!code) {
      return new NextResponse('<h1>Authorization code is missing. Please try again.</h1>', { status: 400, headers: { 'Content-Type': 'text/html' } });
    }

    const redirectUri = `${new URL(req.url).origin}/api/steps/google-fit/callback`;
    
    // Exchange Google Auth code for Access Token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.json();
      console.error('[SYSTEM] Google Fit token exchange failed:', errorData);
      return new NextResponse(`<h1>Token exchange failed</h1><pre>${JSON.stringify(errorData, null, 2)}</pre>`, { status: 500, headers: { 'Content-Type': 'text/html' } });
    }

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token;

    // Connect to database and retrieve user metrics
    await dbConnect();
    
    // Save refresh token if we got one (usually only on first consent)
    if (refreshToken) {
      await User.findByIdAndUpdate(session.user.id, { googleRefreshToken: refreshToken });
    }

    const userObj = await User.findById(session.user.id);
    const userHeight = userObj?.height || 175;

    // We will sync a 7-day historical window to ensure full data tracking
    const today = new Date();
    
    const startRange = new Date();
    startRange.setDate(today.getDate() - 7);
    startRange.setHours(0, 0, 0, 0);

    const endRange = new Date();
    endRange.setHours(23, 59, 59, 999);

    const startTimeMillis = startRange.getTime();
    const endTimeMillis = endRange.getTime();

    // 1. Fetch Steps Aggregate (Last 7 Days)
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

    // 2. Fetch Calories Aggregate (Last 7 Days)
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

    // 3. Fetch Body Weight Aggregate (Last 7 Days)
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

    // 4. Fetch All Sessions (Sleep + Workouts in last 7 Days)
    const startTimeStr = startRange.toISOString();
    const endTimeStr = endRange.toISOString();
    const sessionsRes = await fetch(`https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${startTimeStr}&endTime=${endTimeStr}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    // Processing steps and calories metrics
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

    // Save Steps & Calories into MongoDB Steps Schema
    let totalSyncedSteps = 0;
    for (const [dateStr, steps] of dailyStepsMap.entries()) {
      const date = new Date(dateStr);
      date.setUTCHours(0, 0, 0, 0);

      const caloriesBurned = dailyCaloriesMap.get(dateStr) || Math.round(steps * 0.04);
      totalSyncedSteps += steps;

      await Steps.findOneAndUpdate(
        { userId: session.user.id, date },
        { steps, caloriesBurned },
        { upsert: true, new: true }
      );
    }

    // Processing body weight metric
    let syncedWeightCount = 0;
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

          await BodyMetric.findOneAndUpdate(
            { userId: session.user.id, date },
            { weight: Number(weightVal.toFixed(1)), height: userHeight, bmi, category },
            { upsert: true, new: true }
          );
          syncedWeightCount++;
        }
      }
    }

    // Processing Sessions (Sleep and Workouts)
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

        // Sleep sessions (Activity type 72 = Sleep)
        if (sessionObj.activityType === 72) {
          const hours = Number((durationMin / 60).toFixed(1));
          if (hours > 0) {
            const date = new Date(endTime);
            date.setUTCHours(0, 0, 0, 0);

            // Dynamically evaluate sleep quality
            let quality = 3;
            if (hours >= 7 && hours <= 9) quality = 5;
            else if (hours >= 6) quality = 4;

            await Sleep.findOneAndUpdate(
              { userId: session.user.id, date },
              { hours, quality, notes: `[Google Fit Sync] Sleep session: ${sessionObj.name || 'Auto-tracked'}` },
              { upsert: true, new: true }
            );
            syncedSleepCount++;
          }
        } 
        // Active workout sessions
        else if (durationMin >= 10) {
          const sessionDate = new Date(startTime);
          
          // Check if similar workout exists
          const exists = await WorkoutLog.findOne({
            userId: session.user.id,
            date: {
              $gte: new Date(sessionDate.getTime() - 1000 * 60 * 10),
              $lte: new Date(sessionDate.getTime() + 1000 * 60 * 10)
            }
          });

          if (!exists) {
            const nameLower = (sessionObj.name || '').toLowerCase();
            const mode = nameLower.includes('gym') || nameLower.includes('lift') || nameLower.includes('strength') ? 'gym' : 'home';
            
            await WorkoutLog.create({
              userId: session.user.id,
              date: sessionDate,
              mode,
              duration: durationMin,
              notes: `[Google Fit Sync] ${sessionObj.name || 'Synced Workout'}`,
              exercises: [{
                exerciseId: 'google-fit',
                name: sessionObj.name || 'Synced Workout Session',
                sets: 3,
                reps: 10
              }],
              caloriesBurned: Math.round(durationMin * 6)
            });

            // S-Rank reward XP system integration
            const xpReward = Math.min(Math.max(durationMin, 15), 50); // min 15, max 50 XP
            await awardXP(session.user.id, xpReward);
            totalXpEarned += xpReward;
            syncedWorkoutsCount++;
          }
        }
      }
    }

    // Return gorgeous custom HTML success dashboard page
    const htmlResponse = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Fit Synced</title>
        <style>
          body {
            background: #0b0f19;
            color: #ffffff;
            font-family: 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 40px 20px;
            overflow-x: hidden;
          }
          .icon {
            width: 80px;
            height: 80px;
            margin: 0 auto 24px auto;
            background: linear-gradient(135deg, #00d4ff, #0072ff);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 25px rgba(0, 212, 255, 0.4);
            animation: pulse 2s infinite alternate;
          }
          .icon svg {
            fill: #ffffff;
            width: 40px;
            height: 40px;
          }
          .title {
            color: #00d4ff;
            font-size: 24px;
            font-weight: 800;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
          }
          .subtitle {
            color: #8b9bb4;
            font-size: 14px;
            margin-bottom: 30px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            max-width: 400px;
            margin: 0 auto 30px auto;
          }
          .card {
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            padding: 16px;
            text-align: left;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }
          .card-title {
            font-size: 11px;
            text-transform: uppercase;
            color: #8b9bb4;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
          }
          .card-value {
            font-size: 18px;
            font-weight: 800;
            color: #ffffff;
          }
          .highlight {
            color: #00ffcc;
          }
          .xp-highlight {
            color: #7b2ff7;
          }
          .spinner {
            border: 3px solid rgba(0, 212, 255, 0.1);
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border-left-color: #00d4ff;
            animation: spin 0.8s linear infinite;
            display: inline-block;
            margin-top: 10px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 0 25px rgba(0, 212, 255, 0.4); }
            100% { transform: scale(1.05); box-shadow: 0 0 35px rgba(0, 212, 255, 0.7); }
          }
        </style>
      </head>
      <body>
        <div class="icon">
          <svg viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
        </div>
        <div class="title">Sync Completed</div>
        <div class="subtitle">[SYSTEM] S-Rank physical stats successfully aggregated</div>
        
        <div class="grid">
          <div class="card">
            <div class="card-title">Steps & Cal</div>
            <div class="card-value"><span class="highlight">${totalSyncedSteps.toLocaleString()}</span> steps</div>
          </div>
          <div class="card">
            <div class="card-title">Sleep Recovery</div>
            <div class="card-value"><span class="highlight">${syncedSleepCount}</span> sessions</div>
          </div>
          <div class="card">
            <div class="card-title">Body Composition</div>
            <div class="card-value"><span class="highlight">${syncedWeightCount}</span> weight logs</div>
          </div>
          <div class="card">
            <div class="card-title">XP Rewards</div>
            <div class="card-value"><span class="xp-highlight">+${totalXpEarned} XP</span> (${syncedWorkoutsCount} workouts)</div>
          </div>
        </div>

        <div class="spinner"></div>
        
        <script>
          if (window.opener) {
            window.opener.postMessage({ 
              type: 'GOOGLE_FIT_SYNC_SUCCESS',
              date: '${targetDateStr}'
            }, '*');
          }
          setTimeout(() => {
            window.close();
          }, 2000);
        </script>
      </body>
      </html>
    `;

    return new NextResponse(htmlResponse, { headers: { 'Content-Type': 'text/html' } });
  } catch (error: any) {
    console.error('[SYSTEM] Google Fit callback error:', error);
    return new NextResponse(`
      <div style="background: #0b0f19; color: #ff5252; padding: 40px; text-align: center; font-family: sans-serif; height: 100vh;">
        <h2>Google Fit System Sync Error</h2>
        <p>${error.message || 'An unknown error occurred during aggregate sync.'}</p>
      </div>
    `, { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}
