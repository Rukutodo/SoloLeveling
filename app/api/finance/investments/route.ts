import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Investment from '@/lib/models/Investment';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const investments = await Investment.find({ userId: session.user.id });
    
    // Enrich with return calculations
    const enriched = investments.map(inv => {
      const totalReturn = inv.currentAmount - inv.investedAmount;
      const returnPercent = (totalReturn / inv.investedAmount) * 100;
      return {
        ...inv.toObject(),
        totalReturn,
        returnPercent,
      };
    });

    return NextResponse.json({ investments: enriched });
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
    
    const investment = await Investment.create({
      userId: session.user.id,
      ...body,
      // Ensure numeric fields are correctly typed if they come as strings
      investedAmount: Number(body.investedAmount),
      currentAmount: Number(body.currentAmount),
      units: body.units ? Number(body.units) : undefined
    });

    return NextResponse.json({ investment }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const body = await req.json(); // { id, currentAmount }
    
    const investment = await Investment.findOneAndUpdate(
      { _id: body.id, userId: session.user.id },
      { currentAmount: body.currentAmount },
      { new: true }
    );

    return NextResponse.json({ investment });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    await Investment.findOneAndDelete({ _id: id, userId: session.user.id });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
