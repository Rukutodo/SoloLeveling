import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Note from '@/lib/models/Note';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    await dbConnect();

    const note = await Note.findOneAndUpdate(
      { _id: params.id, userId: session.user.id },
      { $set: body },
      { new: true }
    );

    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ note });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const note = await Note.findOneAndDelete({ _id: params.id, userId: session.user.id });

    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
