import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Todo from '@/lib/models/Todo';
import Friend from '@/lib/models/Friend';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const friendId = searchParams.get('userId');

    if (!friendId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    await dbConnect();

    // Verify they are friends
    const isFriend = await Friend.findOne({
      $or: [
        { requester: session.user.id, recipient: friendId },
        { requester: friendId, recipient: session.user.id }
      ],
      status: 'accepted'
    });

    if (!isFriend) return NextResponse.json({ error: 'You can only view status of accepted friends' }, { status: 403 });

    const todos = await Todo.find({ userId: friendId }).sort({ createdAt: -1 }).limit(10);
    
    return NextResponse.json({ todos });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch friend data' }, { status: 500 });
  }
}
