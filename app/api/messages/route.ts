import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Message from '@/lib/models/Message';
import { pusherServer } from '@/lib/pusher';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const messages = await Message.find({ receiverId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(50);

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { text, receiverId, type = 'chat' } = await req.json();

    await dbConnect();
    const message = await Message.create({
      senderId: session.user.id,
      receiverId,
      text,
      type,
    });

    // Broadcast via Pusher
    // @ts-ignore
    await pusherServer.trigger(`user-${receiverId}`, 'new-message', message);

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Pusher/Message error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    await dbConnect();
    
    const message = await Message.findOneAndUpdate(
      { _id: id, receiverId: session.user.id },
      { isRead: true },
      { new: true }
    );

    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    await dbConnect();

    if (id) {
      await Message.findOneAndDelete({ _id: id, receiverId: session.user.id });
    } else {
      // Clear all
      await Message.deleteMany({ receiverId: session.user.id });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
