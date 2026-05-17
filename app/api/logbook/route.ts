import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import DailyLog from '@/lib/models/DailyLog';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');

    if (!dateStr) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

    await dbConnect();
    const log = await DailyLog.findOne({ userId: session.user.id, dateStr });
    
    return NextResponse.json({ log });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { dateStr, drawingData } = body;

    if (!dateStr || drawingData === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();
    
    // Upsert drawing data for the specific day
    const log = await DailyLog.findOneAndUpdate(
      { userId: session.user.id, dateStr },
      { $set: { drawingData } },
      { new: true, upsert: true }
    );

    return NextResponse.json({ log }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
