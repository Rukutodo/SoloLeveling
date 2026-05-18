import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { sendSystemMessage } from '@/lib/notifications';
import Friend from '@/lib/models/Friend';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { friendId, message } = await req.json();

    // Verify friendship
    const isFriend = await Friend.findOne({
      $or: [
        { requester: session.user.id, recipient: friendId },
        { requester: friendId, recipient: session.user.id }
      ],
      status: 'accepted'
    });

    if (!isFriend) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await sendSystemMessage(friendId, `[ENCOURAGEMENT] Your comrade ${session.user.name} says: "${message}"`);

    return NextResponse.json({ message: 'Encouragement sent' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to encourage' }, { status: 500 });
  }
}
