import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import WorkoutLog from '@/lib/models/WorkoutLog';
import { awardXP, XP_REWARDS } from '@/lib/xpSystem';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const workouts = await WorkoutLog.find({ userId: session.user.id })
      .sort({ date: -1 })
      .limit(30);

    return NextResponse.json({ workouts });
  } catch (error) {
    console.error('Workouts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();

    const workout = await WorkoutLog.create({
      userId: session.user.id,
      date: body.date || new Date(),
      mode: body.mode,
      exercises: body.exercises,
      duration: body.duration,
      notes: body.notes,
      caloriesBurned: body.caloriesBurned,
    });

    const xpResult = await awardXP(session.user.id, XP_REWARDS.COMPLETE_WORKOUT);

    return NextResponse.json({ workout, xp: xpResult }, { status: 201 });
  } catch (error) {
    console.error('Workouts POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
