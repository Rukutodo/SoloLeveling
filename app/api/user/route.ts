import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { getUserStats } from '@/lib/xpSystem';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    let user = await User.findById(session.user.id).select('-password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // --- MIGRATION: Assign tag if missing ---
    if (!user.tag) {
      const firstName = user.name.split(' ')[0].replace(/[^a-zA-Z0-9]/g, '');
      let uniqueTag = '';
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 10) {
        const random = Math.floor(1000 + Math.random() * 9000);
        uniqueTag = `${firstName}#${random}`;
        const existing = await User.findOne({ tag: uniqueTag });
        if (!existing) isUnique = true;
        attempts++;
      }
      user.tag = uniqueTag;
      await user.save();
      console.log(`[MIGRATION] Assigned tag ${uniqueTag} to existing user ${user.name}`);
    }
    // ----------------------------------------

    const stats = await getUserStats(session.user.id);

    return NextResponse.json({ user, stats });
  } catch (error: unknown) {
    console.error('User fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updates = await req.json();
    const allowedFields = ['name', 'height', 'dailyCalorieGoal'];
    const filteredUpdates: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    await dbConnect();
    const user = await User.findByIdAndUpdate(
      session.user.id,
      filteredUpdates,
      { new: true }
    ).select('-password');

    return NextResponse.json({ user });
  } catch (error: unknown) {
    console.error('User update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
