import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import CalendarEvent from '@/lib/models/CalendarEvent';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    const events = await CalendarEvent.find({
      userId: session.user.id,
      date: { $gte: startDate, $lt: endDate },
    }).sort({ date: 1 });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Calendar GET error:', error);
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

    const event = await CalendarEvent.create({
      userId: session.user.id,
      title: body.title,
      date: body.date,
      endDate: body.endDate,
      type: body.type || 'general',
      color: body.color || '#00d4ff',
      notes: body.notes,
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error('Calendar POST error:', error);
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
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    await CalendarEvent.findOneAndDelete({ _id: id, userId: session.user.id });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Calendar DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
    }

    const event = await CalendarEvent.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      updates,
      { new: true }
    );

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Calendar PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
