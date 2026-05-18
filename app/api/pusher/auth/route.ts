import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { socket_id, channel_name } = await req.json();

    const authResponse = pusherServer.authorizeChannel(socket_id, channel_name, {
      user_id: session.user.id,
      user_info: { name: session.user.name, email: session.user.email },
    });

    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('Pusher auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
