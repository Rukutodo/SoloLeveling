import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Sleep from '@/lib/models/Sleep';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    
    await dbConnect();
    if (dateStr) {
      const date = new Date(dateStr);
      date.setUTCHours(0, 0, 0, 0);
      const sleep = await Sleep.findOne({ userId: session.user.id, date });
      return NextResponse.json({ sleep });
    } else {
      const history = await Sleep.find({ userId: session.user.id }).sort({ date: -1 }).limit(7);
      return NextResponse.json({ history });
    }
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
    const { date: dateStr, hours, quality, notes } = body;
    const date = new Date(dateStr);
    date.setUTCHours(0, 0, 0, 0);

    const sleep = await Sleep.findOneAndUpdate(
      { userId: session.user.id, date },
      { hours, quality, notes },
      { upsert: true, new: true }
    );

    return NextResponse.json({ sleep });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
