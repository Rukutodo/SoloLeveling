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
    
    // Find the first weight milestone to determine loss or gain direction
    const firstWeightMilestone = quest.milestones.find((m: any) => m.targetType === 'weight');
    const finalWeightTarget = quest.targetWeight || 70;
    const isLoss = firstWeightMilestone ? (finalWeightTarget < firstWeightMilestone.targetValue) : true;

    for (let milestone of quest.milestones) {
      if (milestone.completed) continue;

      if (milestone.targetType === 'weight' && currentWeight !== undefined) {
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

    const { targetWeight, targetSalary, targetProfession, deadline } = await req.json();
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
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `
      As the "System Advisor" in a Solo Leveling themed self-improvement app, generate a highly realistic and motivating "Main Quest Chain" (Hunter's Roadmap) for a user.
      
      User Status:
      - Current Weight: ${currentWeight}kg
      - Target Weight: ${targetWeight}kg
      - Current Monthly Income: ₹${currentIncome}
      - Target Monthly Income: ₹${targetSalary}
      - Chosen Career/Profession: ${targetProfession || 'Software Engineer'}
      - Timeframe: Reach targets by ${deadline} (which is roughly ${Math.round((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30))} months from now)
      
      Generate exactly 6 milestones (Sub-Quests) arranged in 3 chronological checkpoints (3 sequential Checkpoints with 2 milestones each):
      
      Strictest Rules for the Financial/Career curve (Non-Linear Growth Curve):
      Financial growth in real-life career transitions is NEVER linear. The user is starting out focusing on building skills, portfolios, or MVPs, and cannot make a high income instantly. Therefore, you MUST enforce a highly realistic, progressive "hockey-stick" growth curve for the monthly income targets:
      1. Checkpoint 1 (E-Rank Quest - Month 2 - Foundation Phase):
         - Target Value: MUST be highly modest, representing roughly 5% to 15% of the targetSalary (e.g. ₹5,000 to ₹15,000 if target is ₹200,000).
         - Focus: Gaining foundational skills, simple certifications, and basic portfolios for a ${targetProfession || 'Software Engineer'} rather than generating high income. Explain this realistic focus clearly in the description.
      2. Checkpoint 2 (B-Rank Quest - Month 4 - Market Entry Phase):
         - Target Value: An intermediate step representing roughly 25% to 40% of the targetSalary (e.g. ₹50,000 to ₹80,000 if target is ₹200,000).
         - Focus: Landing an entry-level/junior full-time job, securing a couple of freelance clients, or launching an MVP with initial subscribers.
      3. Checkpoint 3 (S-Rank Quest - Month 6 - Ascension Phase):
         - Target Value: MUST be exactly ₹${targetSalary}!
         - Focus: Command senior-level pay, high-ticket consulting contracts, advanced production architectures, or scaling SaaS subscriptions to reach full target.
      
      The 3 Checkpoints:
      1. Checkpoint 1 (E/D-Rank trials - roughly 1/3 of the timeframe from now):
         - Milestone 1 (Weight): E-Rank Directive. A realistic intermediate weight target (roughly 1/3 of the progress from currentWeight to targetWeight).
         - Milestone 2 (Income/Career): E-Rank Quest. The foundation monthly income target (5% to 15% of targetSalary) tailored SPECIFICALLY to gaining foundational skills/credentials for a ${targetProfession || 'Software Engineer'}.
         - Both Milestone 1 and 2 must have the EXACT SAME deadline (roughly 1/3 of the timeframe).
         
      2. Checkpoint 2 (C/B-Rank trials - roughly 2/3 of the timeframe from now):
         - Milestone 3 (Weight): C-Rank Directive. A realistic intermediate weight target (roughly 2/3 of the progress from currentWeight to targetWeight).
         - Milestone 4 (Income/Career): B-Rank Quest. The market entry monthly income target (25% to 40% of targetSalary) tailored SPECIFICALLY to professional progression in ${targetProfession || 'Software Engineer'}.
         - Both Milestone 3 and 4 must have the EXACT SAME deadline (roughly 2/3 of the timeframe).
         
      3. Checkpoint 3 (A/S-Rank ascension - EXACTLY at the final target deadline):
         - Milestone 5 (Weight): S-Rank Final Weight Directive. MUST be exactly ${targetWeight}kg!
         - Milestone 6 (Income/Career): S-Rank Final Income Quest. MUST be exactly ₹${targetSalary}! Tailored SPECIFICALLY to high-tier professional ascension in ${targetProfession || 'Software Engineer'}.
         - Both Milestone 5 and 6 must have the EXACT SAME deadline (EXACTLY equal to ${deadline}).
      
      Strictest Rules for values and relevance:
      1. The description for each Income/Career milestone MUST give concrete, actionable career suggestions/skills to achieve that income level in the selected profession (${targetProfession || 'Software Engineer'}).
      2. Checkpoint deadlines MUST increase sequentially: Checkpoint 1 Date < Checkpoint 2 Date < Checkpoint 3 Date (${deadline}).
      3. For weight milestones (Milestone 1, 3, 5): 
         - If weight loss (targetWeight < currentWeight), target values MUST decrease progressively: currentWeight > Milestone 1 targetValue > Milestone 3 targetValue > Milestone 5 targetValue (which is exactly ${targetWeight}).
         - If weight gain (targetWeight > currentWeight), target values MUST increase progressively: currentWeight < Milestone 1 targetValue < Milestone 3 targetValue < Milestone 5 targetValue (which is exactly ${targetWeight}).
      4. For income milestones (Milestone 2, 4, 6):
         - Target values MUST increase progressively according to the hockey-stick curve: currentIncome < Milestone 2 targetValue < Milestone 4 targetValue < Milestone 6 targetValue (which is exactly ${targetSalary}).
      
      Each milestone must have:
      1. title: (Sleek Solo Leveling themed title, e.g. "E-Rank Trials: Body Adaptation" or "C-Rank Evolution: Resource Gathering")
      2. description: (Motivational Hunter description explaining the target value clearly, with specific professional suggestions/skills)
      3. targetType: ('weight' or 'income')
      4. targetValue: (The specific progressive target number)
      5. deadline: (ISO date string, e.g. "2026-06-17")
      
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
      targetProfession,
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
