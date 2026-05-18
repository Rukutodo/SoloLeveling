import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/lib/models/Transaction';
import { awardXP, XP_REWARDS } from '@/lib/xpSystem';
import { sendSystemMessage } from '@/lib/notifications';

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

    // 2. Filter out duplicates (both against DB and within the batch)
    const uniqueToInsert = [];
    const seenInBatch = new Set();
    let ignoredCount = 0;

    for (const tx of transactions) {
      const amount = Number(tx.amount) || 0;
      if (amount === 0) {
        ignoredCount++;
        continue;
      }
      
      const sig = tx.signature;
      if (sig && (existingSignatures.has(sig) || seenInBatch.has(sig))) {
        ignoredCount++;
      } else {
        if (sig) seenInBatch.add(sig);
        uniqueToInsert.push({
          userId,
          date: tx.date ? new Date(tx.date) : new Date(),
          amount: amount,
          type: tx.type === 'income' ? 'income' : 'expense',
          category: tx.category && tx.category !== 'Other' ? tx.category : (tx.description || 'Transaction').split(/[\s\/\-_|]+/).slice(0, 2).join(' ').replace(/[^a-zA-Z0-9 ]/g, '').trim() || tx.description?.slice(0, 20) || 'Transaction',
          description: tx.description || 'Imported Transaction',
          source: tx.source || 'File Import',
          index: tx.index !== undefined ? tx.index : 0,
          signature: sig,
          recurring: false,
        });
      }
    }

    // 3. Perform bulk insert
    let savedCount = 0;
    try {
      if (uniqueToInsert.length > 0) {
        const results = await Transaction.insertMany(uniqueToInsert, { ordered: false });
        savedCount = results.length;
      }
    } catch (insertErr: any) {
      // If some inserted but some failed (duplicate key), we can still report success for the ones that made it
      console.warn('[FINANCE-IMPORT] Partial insert failure or duplicate key during bulk insert:', insertErr.message);
      savedCount = insertErr.result?.nInserted || 0;
    }

    // 4. Construct a detailed breakdown for the frontend report
    const processedBreakdown = [];
    const finalSeen = new Set(existingTx.map(t => t.signature));
    
    for (const tx of transactions) {
       const amount = Number(tx.amount) || 0;
       if (amount === 0) continue;
       
       const isDuplicate = tx.signature && finalSeen.has(tx.signature);
       if (!isDuplicate && tx.signature) finalSeen.add(tx.signature); // Mark as seen for subsequent items in same list

       processedBreakdown.push({
          date: tx.date || new Date().toISOString(),
          amount: amount,
          type: tx.type === 'income' ? 'income' : 'expense',
          category: tx.category && tx.category !== 'Other' ? tx.category : (tx.description || 'Transaction').split(/[\s\/\-_|]+/).slice(0, 2).join(' ').replace(/[^a-zA-Z0-9 ]/g, '').trim() || tx.description?.slice(0, 20) || 'Transaction',
          description: tx.description || 'Imported Transaction',
          source: tx.source || 'File Import',
          status: isDuplicate ? 'duplicate' : 'imported',
       });
    }

    // 5. Award XP for syncing transactions
    let xpResult = null;
    if (savedCount > 0) {
      xpResult = await awardXP(userId, XP_REWARDS.LOG_TRANSACTION);
      await sendSystemMessage(userId, `[SYSTEM] ${savedCount} transactions successfully synthesized into Gold Reserve.`);
    }

    return NextResponse.json({
      savedCount,
      ignoredCount,
      totalProcessed: transactions.length,
      xp: xpResult,
      breakdown: processedBreakdown,
    });
  } catch (error: any) {
    console.error('[FINANCE-IMPORT] Critical Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
