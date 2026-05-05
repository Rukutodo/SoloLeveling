import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import MainQuest from '@/lib/models/MainQuest';
import User from '@/lib/models/User';
import BodyMetric from '@/lib/models/BodyMetric';
import Investment from '@/lib/models/Investment';
import Transaction from '@/lib/models/Transaction';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const quest = await MainQuest.findOne({ userId: session.user.id, status: 'active' });
    return NextResponse.json({ quest });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { targetWeight, targetSalary, deadline } = await req.json();
    await dbConnect();

    // 1. Fetch Current Status
    const user = await User.findById(session.user.id);
    const latestMetric = await BodyMetric.findOne({ userId: session.user.id }).sort({ date: -1 });
    
    // Calculate current monthly income from transactions
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    const incomeTxs = await Transaction.find({ 
      userId: session.user.id, 
      type: 'income',
      date: { $gte: startOfMonth }
    });
    const currentIncome = incomeTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const currentWeight = latestMetric?.weight || 75; // Default if not found

    // 2. Generate Milestones via AI
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      As the "System Advisor" in a Solo Leveling themed self-improvement app, generate a "Main Quest Chain" (Hunter's Roadmap) for a user.
      
      User Status:
      - Current Weight: ${currentWeight}kg
      - Target Weight: ${targetWeight}kg
      - Current Monthly Income: ₹${currentIncome}
      - Target Monthly Income: ₹${targetSalary}
      - Timeframe: Reach targets by ${deadline}
      
      Generate exactly 6 progressive milestones (Sub-Quests) that alternate between health/fitness and financial growth.
      Each milestone must have:
      1. title: (Cool Solo Leveling style name, e.g., "The C-Rank Awakening")
      2. description: (Motivational Hunter description)
      3. targetType: ('weight' or 'income')
      4. targetValue: (Realistic intermediate value)
      5. deadline: (A date between now and the final deadline)
      
      Format as JSON: { "milestones": [ { "title", "description", "targetType", "targetValue", "deadline" } ] }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const { milestones } = JSON.parse(cleanJson);

    // 3. Save Quest Chain
    // Deactivate previous active quest
    await MainQuest.updateMany({ userId: session.user.id, status: 'active' }, { status: 'failed' });

    const newQuest = await MainQuest.create({
      userId: session.user.id,
      title: 'The Road to S-Rank',
      targetWeight,
      targetSalary,
      deadline: new Date(deadline),
      milestones: milestones.map((m: any) => ({
        ...m,
        deadline: new Date(m.deadline)
      }))
    });

    return NextResponse.json({ quest: newQuest });
  } catch (error) {
    console.error('Quest generation error:', error);
    return NextResponse.json({ error: 'Failed to generate quest chain' }, { status: 500 });
  }
}
