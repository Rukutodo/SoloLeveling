import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/lib/models/Transaction';
import { awardXP, XP_REWARDS } from '@/lib/xpSystem';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth()));
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    // Fetch transactions
    const transactions = await Transaction.find({
      userId: session.user.id,
      date: { $gte: startDate, $lt: endDate },
    }).sort({ date: -1 });

    // Fetch active EMIs
    const EMI = (await import('@/lib/models/EMI')).default;
    const activeEmis = await EMI.find({ 
      userId: session.user.id, 
      active: true,
      startDate: { $lt: endDate } // EMI started before or during this month
    });

    // Calculate summary
    let income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    let expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Add EMIs to expenses
    const emiTotal = activeEmis.reduce((sum, e) => sum + e.amount, 0);
    expenses += emiTotal;

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + t.amount;
      });

    // Add EMI category
    if (emiTotal > 0) {
      categoryBreakdown['EMI'] = (categoryBreakdown['EMI'] || 0) + emiTotal;
    }

    return NextResponse.json({
      transactions,
      summary: { income, expenses, net: income - expenses },
      categoryBreakdown,
      emiTotal,
    });
  } catch (error) {
    console.error('Finance GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();

    const transaction = await Transaction.create({
      userId: session.user.id,
      date: body.date || new Date(),
      amount: body.amount,
      type: body.type,
      category: body.category,
      description: body.description,
      recurring: body.recurring || false,
    });

    const xpResult = await awardXP(session.user.id, XP_REWARDS.LOG_TRANSACTION);

    return NextResponse.json({ transaction, xp: xpResult }, { status: 201 });
  } catch (error) {
    console.error('Finance POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    await Transaction.findOneAndDelete({ _id: id, userId: session.user.id });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Finance DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
