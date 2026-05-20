import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Todo from '@/lib/models/Todo';
import { awardXP, XP_REWARDS } from '@/lib/xpSystem';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const todos = await Todo.find({ userId: session.user.id }).sort({ createdAt: -1 });
    return NextResponse.json({ todos });
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
    const todo = await Todo.create({ userId: session.user.id, ...body });
    return NextResponse.json({ todo }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json();
    const { id, ...updates } = body;

    // Check if it was already completed to avoid double XP
    const existingTodo = await Todo.findOne({ _id: id, userId: session.user.id });
    const wasCompleted = existingTodo?.completed || existingTodo?.status === 'Done';
    const isNowCompleted = updates.completed || updates.status === 'Done';

    const todo = await Todo.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: updates },
      { new: true }
    );

    let xpResult = null;
    if (!wasCompleted && isNowCompleted) {
      xpResult = await awardXP(session.user.id, XP_REWARDS.COMPLETE_QUEST);
    }

    return NextResponse.json({ todo, xp: xpResult });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    await dbConnect();
    await Todo.findOneAndDelete({ _id: id, userId: session.user.id });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
