import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import Investment from '@/lib/models/Investment';

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const investments = await Investment.find({ userId: session.user.id });
    
    const results = [];
    for (const inv of investments) {
      if (inv.type === 'Mutual Fund' && inv.schemeCode) {
        try {
          // Fetch from mfapi.in (Free API for Indian Mutual Funds)
          const res = await fetch(`https://api.mfapi.in/mf/${inv.schemeCode}`);
          if (res.ok) {
            const data = await res.json();
            const latestNav = parseFloat(data.data[0].nav);
            
            if (inv.units) {
              const newAmount = inv.units * latestNav;
              inv.currentAmount = newAmount;
              inv.lastUpdated = new Date();
              await inv.save();
              results.push({ id: inv._id, success: true, newAmount });
            }
          }
        } catch (err) {
          console.error(`Failed to refresh investment ${inv._id}:`, err);
          results.push({ id: inv._id, success: false, error: 'API Error' });
        }
      }
    }

    return NextResponse.json({ message: 'Refresh complete', results });
  } catch (error) {
    console.error('Refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
