import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import FoodEntry from '@/lib/models/FoodEntry';
import { awardXP, XP_REWARDS } from '@/lib/xpSystem';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');

    let query: Record<string, unknown> = { userId: session.user.id };

    if (dateStr) {
      const date = new Date(dateStr);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      query = { ...query, date: { $gte: date, $lt: nextDay } };
    }

    const entries = await FoodEntry.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Calories GET error:', error);
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

    const entry = await FoodEntry.create({
      userId: session.user.id,
      date: body.date || new Date(),
      mealType: body.mealType,
      foodName: body.foodName,
      calories: body.calories,
      protein: body.protein || 0,
      carbs: body.carbs || 0,
      fat: body.fat || 0,
      fiber: body.fiber || 0,
      source: body.source || 'manual',
      confidence: body.confidence,
    });

    // Award XP
    const xpResult = await awardXP(session.user.id, XP_REWARDS.LOG_MEAL);

    return NextResponse.json({ entry, xp: xpResult }, { status: 201 });
  } catch (error) {
    console.error('Calories POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    await FoodEntry.findOneAndDelete({ _id: id, userId: session.user.id });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Calories DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
