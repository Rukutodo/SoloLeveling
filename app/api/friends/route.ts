import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import Friend from '@/lib/models/Friend';
import { sendSystemMessage } from '@/lib/notifications';
import { pusherServer } from '@/lib/pusher';

// GET: Fetch friends and pending requests
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const userId = session.user.id;

    const friends = await Friend.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted'
    }).populate('requester recipient', 'name email level rank title');

    const pending = await Friend.find({
      recipient: userId,
      status: 'pending'
    }).populate('requester', 'name email level rank title');

    return NextResponse.json({ friends, pending });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Send a friend request
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { recipientEmail } = await req.json();
    await dbConnect();

    const recipient = await User.findOne({ email: recipientEmail });
    if (!recipient) return NextResponse.json({ error: 'Hunter not found' }, { status: 404 });

    if (recipient._id.toString() === session.user.id) {
      return NextResponse.json({ error: 'You cannot add yourself' }, { status: 400 });
    }

    const existingRequest = await Friend.findOne({
      $or: [
        { requester: session.user.id, recipient: recipient._id },
        { requester: recipient._id, recipient: session.user.id }
      ]
    });

    if (existingRequest) {
      return NextResponse.json({ error: 'Request already exists or you are already friends' }, { status: 400 });
    }

    const friendRequest = await Friend.create({
      requester: session.user.id,
      recipient: recipient._id,
      status: 'pending'
    });

    // Notify recipient
    await sendSystemMessage(recipient._id.toString(), `[SYSTEM] New Friend Request from ${session.user.name}.`);
    await pusherServer.trigger(`user-${recipient._id}`, 'friend-request', {
        from: session.user.name,
        requestId: friendRequest._id
    });

    return NextResponse.json({ message: 'Request sent' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send request' }, { status: 500 });
  }
}

// PUT: Accept/Decline request
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { requestId, status } = await req.json(); // status: 'accepted' | 'declined'
    await dbConnect();

    const request = await Friend.findOne({
      _id: requestId,
      recipient: session.user.id
    });

    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    request.status = status;
    await request.save();

    if (status === 'accepted') {
        await sendSystemMessage(request.requester.toString(), `[SYSTEM] ${session.user.name} accepted your friend request. You can now track each other's progress.`);
        await pusherServer.trigger(`user-${request.requester}`, 'friend-accepted', {
            by: session.user.name
        });
    }

    return NextResponse.json({ message: `Request ${status}` });
  } catch (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
