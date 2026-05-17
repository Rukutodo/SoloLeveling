import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/lib/models/Transaction';
import { awardXP, XP_REWARDS } from '@/lib/xpSystem';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    const { transactions } = await req.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'Invalid transactions array' }, { status: 400 });
    }

    const userId = session.user.id;

    // 1. Fetch all existing signatures for this user to guarantee absolute deduplication
    const signatures = transactions.map((t) => t.signature).filter(Boolean);
    const existingTx = await Transaction.find({
      userId,
      signature: { $in: signatures },
    });
    
    const existingSignatures = new Set(existingTx.map((t) => t.signature));

    // 2. Filter out duplicates
    const uniqueToInsert = [];
    let ignoredCount = 0;

    for (const tx of transactions) {
      if (tx.signature && existingSignatures.has(tx.signature)) {
        ignoredCount++;
      } else {
        uniqueToInsert.push({
          userId,
          date: tx.date ? new Date(tx.date) : new Date(),
          amount: Number(tx.amount) || 0,
          type: tx.type === 'income' ? 'income' : 'expense',
          category: tx.category && tx.category !== 'Other' ? tx.category : (tx.description || 'Transaction').split(/[\s\/\-_|]+/).slice(0, 2).join(' ').replace(/[^a-zA-Z0-9 ]/g, '').trim() || tx.description?.slice(0, 20) || 'Transaction',
          description: tx.description || 'Imported Transaction',
          signature: tx.signature,
          recurring: false,
        });
      }
    }

    // 3. Perform bulk insert
    let savedCount = 0;
    if (uniqueToInsert.length > 0) {
      const results = await Transaction.insertMany(uniqueToInsert);
      savedCount = results.length;
    }

    // 4. Construct a detailed breakdown for the frontend report
    const breakdown = transactions.map((tx) => {
      const isDuplicate = tx.signature && existingSignatures.has(tx.signature);
      return {
        date: tx.date || new Date().toISOString(),
        amount: Number(tx.amount) || 0,
        type: tx.type === 'income' ? 'income' : 'expense',
        category: tx.category && tx.category !== 'Other' ? tx.category : (tx.description || 'Transaction').split(/[\s\/\-_|]+/).slice(0, 2).join(' ').replace(/[^a-zA-Z0-9 ]/g, '').trim() || tx.description?.slice(0, 20) || 'Transaction',
        description: tx.description || 'Imported Transaction',
        status: isDuplicate ? 'duplicate' : 'imported',
      };
    });

    // 5. Award XP for syncing transactions if at least one transaction was imported
    let xpResult = null;
    if (savedCount > 0) {
      xpResult = await awardXP(userId, XP_REWARDS.LOG_TRANSACTION);
    }

    return NextResponse.json({
      savedCount,
      ignoredCount,
      totalProcessed: transactions.length,
      xp: xpResult,
      breakdown,
    });
  } catch (error) {
    console.error('Import API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
