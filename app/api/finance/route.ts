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
    const requestedMonth = searchParams.get('month');
    const requestedYear = searchParams.get('year');
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let startDate: Date;
    let endDate: Date;
    let transactions: any[] = [];

    const findAnchorSalary = async (mIndex: number, yNum: number) => {
      // Window: 20th of prev month to 15th of current month
      const windowStart = new Date(yNum, mIndex - 1, 20);
      const windowEnd = new Date(yNum, mIndex, 15);
      return await Transaction.findOne({
        userId: session.user.id,
        category: 'Salary',
        type: 'income',
        date: { $gte: windowStart, $lt: windowEnd }
      }).sort({ date: 1, index: 1 });
    };

    // Determine Financial Cycle Boundaries and Fetch Transactions
    if (!requestedMonth && !requestedYear) {
      // DEFAULT VIEW (Today)
      const anchor = await findAnchorSalary(currentMonth, currentYear);
      const nextAnchor = await findAnchorSalary(currentMonth + 1, currentYear);
      
      if (anchor) {
        startDate = new Date(anchor.date);
        const anchorIdx = anchor.index || 0;
        const nextDate = nextAnchor ? new Date(nextAnchor.date) : new Date(currentYear, currentMonth + 1, 10);
        const nextIdx = nextAnchor ? (nextAnchor.index || 0) : 999;

        transactions = await Transaction.find({
          userId: session.user.id,
          $and: [
            {
              $or: [
                { date: { $gt: startDate } },
                { date: startDate, index: { $gte: anchorIdx } }
              ]
            },
            {
              $or: [
                { date: { $lt: nextDate } },
                { date: nextDate, index: { $lt: nextIdx } }
              ]
            }
          ]
        }).sort({ date: -1, index: -1 });
      } else {
        startDate = new Date(currentYear, currentMonth, 1);
        endDate = nextAnchor ? new Date(nextAnchor.date) : new Date(currentYear, currentMonth + 1, 10);
        transactions = await Transaction.find({
          userId: session.user.id,
          date: { $gte: startDate, $lt: endDate },
        }).sort({ date: -1, index: -1 });
      }
    } else {
      // HISTORICAL / SPECIFIC MONTH VIEW
      const m = parseInt(requestedMonth!);
      const y = parseInt(requestedYear!);
      const anchor = await findAnchorSalary(m, y);
      const nextAnchor = await findAnchorSalary(m + 1, y);

      if (anchor) {
        startDate = new Date(anchor.date);
        const anchorIdx = anchor.index || 0;
        const nextDate = nextAnchor ? new Date(nextAnchor.date) : new Date(y, m + 1, 1);
        const nextIdx = nextAnchor ? (nextAnchor.index || 0) : 999;

        transactions = await Transaction.find({
          userId: session.user.id,
          $and: [
            {
              $or: [
                { date: { $gt: startDate } },
                { date: startDate, index: { $gte: anchorIdx } }
              ]
            },
            {
              $or: [
                { date: { $lt: nextDate } },
                { date: nextDate, index: { $lt: nextIdx } }
              ]
            }
          ]
        }).sort({ date: -1, index: -1 });
      } else {
        startDate = new Date(y, m, 1);
        endDate = nextAnchor ? new Date(nextAnchor.date) : new Date(y, m + 1, 1);
        transactions = await Transaction.find({
          userId: session.user.id,
          date: { $gte: startDate, $lt: endDate },
        }).sort({ date: -1, index: -1 });
      }
    }

    // Fetch active EMIs
    const EMI = (await import('@/lib/models/EMI')).default;
    const activeEmis = await EMI.find({ 
      userId: session.user.id, 
      active: true,
      startDate: { $lt: new Date(currentYear, currentMonth + 1, 1) } 
    });

    // Calculate summary
    let income = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    let expenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const emiTotal = activeEmis.reduce((sum, e) => sum + e.amount, 0);
    expenses += emiTotal;

    const categoryBreakdown: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const isGeneric = !t.category || t.category === 'Other' || t.category === 'Other Income';
        const label = isGeneric
          ? (t.description || 'Transaction').split(/[\s\/\-_|]+/).slice(0, 2).join(' ').replace(/[^a-zA-Z0-9 ]/g, '').trim() || t.description?.slice(0, 20) || 'Transaction'
          : t.category;
        categoryBreakdown[label] = (categoryBreakdown[label] || 0) + t.amount;
      });

    if (emiTotal > 0) {
      categoryBreakdown['EMI'] = (categoryBreakdown['EMI'] || 0) + emiTotal;
    }

    return NextResponse.json({
      transactions,
      summary: { income, expenses, net: income - expenses },
      categoryBreakdown,
      emiTotal,
      isSalaryCycle: !!transactions.find(t => t.category === 'Salary'),
      cycleStart: startDate.toISOString().split('T')[0],
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
      index: body.index || 0,
      source: body.source || 'Manual Entry'
    });

    const xpResult = await awardXP(session.user.id, XP_REWARDS.LOG_TRANSACTION);

    return NextResponse.json({ transaction, xp: xpResult }, { status: 201 });
  } catch (error) {
    console.error('Finance POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const body = await req.json();
    const { id, amount } = body;

    if (!id || amount === undefined) {
      return NextResponse.json({ error: 'Transaction ID and amount required' }, { status: 400 });
    }

    const transaction = await Transaction.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { amount: Number(amount) },
      { new: true }
    );

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ transaction });
  } catch (error) {
    console.error('Finance PUT error:', error);
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
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      await Transaction.deleteMany({ userId: session.user.id });
      return NextResponse.json({ message: 'All records cleared' });
    }

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
