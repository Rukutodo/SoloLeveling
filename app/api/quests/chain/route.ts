import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import MainQuest from '@/lib/models/MainQuest';
import User from '@/lib/models/User';
import BodyMetric from '@/lib/models/BodyMetric';
import Investment from '@/lib/models/Investment';
import Transaction from '@/lib/models/Transaction';
import { GoogleGenerativeAI } from '@google/generative-ai';


export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const quest = await MainQuest.findOne({ userId: session.user.id, status: 'active' });
    if (!quest) return NextResponse.json({ quest: null });

    // 1. Fetch Current Status for evaluation
    const latestMetric = await BodyMetric.findOne({ userId: session.user.id }).sort({ date: -1 });
    const currentWeight = latestMetric?.weight;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const incomeTxs = await Transaction.find({ 
      userId: session.user.id, 
      type: 'income',
      date: { $gte: startOfMonth }
    });
    const currentIncome = incomeTxs.reduce((sum, tx) => sum + tx.amount, 0);

    // 2. Evaluate each incomplete milestone
    let modified = false;
    for (let milestone of quest.milestones) {
      if (milestone.completed) continue;

      if (milestone.targetType === 'weight' && currentWeight !== undefined) {
        // If targetWeight was lower than their starting point (assumed 75 or quest.targetWeight + 5), they are losing weight.
        // Otherwise, they are gaining weight.
        const finalTarget = quest.targetWeight || 70;
        // Let's determine direction: if final target is less than this milestone value, it's a downward progression.
        // Actually, we can check if the user's weight has crossed the target value in the desired direction.
        // A robust way: complete if we are losing weight and current <= target, or if gaining and current >= target.
        // Since we don't have initialWeight, we compare finalTarget to currentWeight.
        const isLoss = finalTarget < 75; // standard assumption
        if (isLoss ? (currentWeight <= milestone.targetValue) : (currentWeight >= milestone.targetValue)) {
          milestone.completed = true;
          modified = true;
        }
      } else if (milestone.targetType === 'income') {
        if (currentIncome >= milestone.targetValue) {
          milestone.completed = true;
          modified = true;
        }
      }
    }

    if (modified) {
      await quest.save();
    }

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
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);
    const incomeTxs = await Transaction.find({ 
      userId: session.user.id, 
      type: 'income',
      date: { $gte: startOfMonth }
    });
    const currentIncome = incomeTxs.reduce((sum, tx) => sum + tx.amount, 0);
    const currentWeight = latestMetric?.weight || 75;

    // 2. Generate Milestones via AI
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'System Error: Advisor core is missing (API Key not found).' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
      As the "System Advisor" in a Solo Leveling themed self-improvement app, generate a highly realistic "Main Quest Chain" (Hunter's Roadmap) for a user.
      
      User Status:
      - Current Weight: ${currentWeight}kg
      - Target Weight: ${targetWeight}kg
      - Current Monthly Income: ₹${currentIncome}
      - Target Monthly Income: ₹${targetSalary}
      - Timeframe: Reach targets by ${deadline} (which is roughly ${Math.round((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30))} months from now)
      
      Generate exactly 6 progressive milestones (Sub-Quests) that alternate between health/fitness (weight) and financial growth (income) in chronological order.
      
      Strictest Rules for values:
      1. Milestones MUST be sequential and chronological (Milestone 1 deadline < Milestone 2 < ... < Final Target Deadline).
      2. Spread the deadlines evenly across the months (e.g. if 6 months total, set one milestone per month).
      3. For weight milestones (Milestone 1, 3, 5): 
         - If targetWeight is less than currentWeight (weight loss), the milestone values MUST strictly decrease progressively towards targetWeight (e.g. if 75kg -> 70kg, milestones could be 74kg, 72.5kg, 71kg).
         - If targetWeight is greater than currentWeight (weight gain), the milestone values MUST strictly increase progressively towards targetWeight.
         - Do not overshoot the final target weight.
      4. For income milestones (Milestone 2, 4, 6):
         - Milestone values MUST strictly increase progressively from current monthly income towards target monthly income (e.g. if ₹0 -> ₹200k, milestones could be ₹30k, ₹90k, ₹150k).
         - Do not overshoot the final target salary.
      
      Structure:
      - Milestone 1 (Weight): E-Rank Directive (Initial small weight progress)
      - Milestone 2 (Income): D-Rank Quest (Initial small financial progress)
      - Milestone 3 (Weight): C-Rank Directive (Halfway weight progress)
      - Milestone 4 (Income): B-Rank Quest (Halfway financial progress)
      - Milestone 5 (Weight): A-Rank Directive (Close to final weight target)
      - Milestone 6 (Income): S-Rank Quest (Close to final income target)

      Each milestone must have:
      1. title: (Sleek Solo Leveling themed title, e.g. "E-Rank Trials: Body Adaptation")
      2. description: (Motivational Hunter description reminding them of the specific numeric target)
      3. targetType: ('weight' or 'income')
      4. targetValue: (The specific progressive target number)
      5. deadline: (Chronological ISO date string, e.g. "2026-06-17")
      
      Format strictly as JSON: { "milestones": [ { "title", "description", "targetType", "targetValue", "deadline" } ] }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    let milestones;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : text;
      const parsed = JSON.parse(cleanJson);
      milestones = parsed.milestones;
    } catch (parseError) {
      console.error('AI JSON Parse Error:', parseError, 'Raw Text:', text);
      return NextResponse.json({ error: 'System error: Invalid roadmap format received.' }, { status: 500 });
    }

    if (!milestones || !Array.isArray(milestones)) {
      return NextResponse.json({ error: 'System error: Roadmap data is incomplete.' }, { status: 500 });
    }

    // 3. Save Quest Chain
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
  } catch (error: any) {
    console.error('Quest generation error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate quest chain' }, { status: 500 });
  }
}
