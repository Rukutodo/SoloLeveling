import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import BodyMetric from '@/lib/models/BodyMetric';
import User from '@/lib/models/User';
import { awardXP, XP_REWARDS } from '@/lib/xpSystem';

function calculateBMI(weight: number, height: number): { bmi: number; category: string } {
  const heightInMeters = height / 100;
  const bmi = weight / (heightInMeters * heightInMeters);
  let category = 'Normal';

  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';

  return { bmi: Math.round(bmi * 10) / 10, category };
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const metrics = await BodyMetric.find({ userId: session.user.id })
      .sort({ date: -1 })
      .limit(30);

    const user = await User.findById(session.user.id).select('height');

    return NextResponse.json({ metrics, savedHeight: user?.height });
  } catch (error) {
    console.error('BMI GET error:', error);
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
    const { weight, height } = await req.json();

    if (!weight || !height) {
      return NextResponse.json({ error: 'Weight and height are required' }, { status: 400 });
    }

    const { bmi, category } = calculateBMI(weight, height);

    const metric = await BodyMetric.create({
      userId: session.user.id,
      date: new Date(),
      weight,
      height,
      bmi,
      category,
    });

    // Save height to user profile
    await User.findByIdAndUpdate(session.user.id, { height });

    // Award XP
    const xpResult = await awardXP(session.user.id, XP_REWARDS.LOG_WEIGHT);

    return NextResponse.json({ metric, xp: xpResult }, { status: 201 });
  } catch (error) {
    console.error('BMI POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
