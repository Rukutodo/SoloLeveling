import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Note from '@/lib/models/Note';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const notes = await Note.find({ userId: session.user.id }).sort({ updatedAt: -1 });
    
    return NextResponse.json({ notes });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { title, section, content } = body;

    await dbConnect();
    
    const note = await Note.create({
      userId: session.user.id,
      title: title || 'Untitled Page',
      section: section || 'General',
      content: content || ''
    });

    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
