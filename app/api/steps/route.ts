import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Steps from '@/lib/models/Steps';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);

    await dbConnect();
    const stepsData = await Steps.findOne({ userId: session.user.id, date });
    return NextResponse.json({ stepsData });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { date: dateStr, steps } = body;
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);

    // Calories burned = steps * 0.04
    const caloriesBurned = Math.round(steps * 0.04);

    const stepsData = await Steps.findOneAndUpdate(
      { userId: session.user.id, date },
      { steps, caloriesBurned },
      { upsert: true, new: true }
    );

    return NextResponse.json({ stepsData });
  } catch (error) {
    console.error('Steps error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
