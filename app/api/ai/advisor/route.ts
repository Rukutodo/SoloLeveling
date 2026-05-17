import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type, data } = body;

    console.log('[AI-BACKEND] Starting gemma-4-31b-it processing for AI Advisor...');
    const model = genAI.getGenerativeModel({ model: 'gemma-4-31b-it' });

    let prompt = '';
    if (type === 'investment') {
      prompt = `Analyze these investments for a user. Find trends, potential risks, and suggest improvements.
      Investments Data: ${JSON.stringify(data)}
      
      Return a response in this JSON structure:
      {
        "trendSummary": "Overall trend description",
        "suggestions": ["Suggestion 1", "Suggestion 2"],
        "projectedGrowth": "Estimated growth description",
        "riskLevel": "Low/Medium/High"
      }
      Only return the JSON.`;
    } else if (type === 'workout') {
      prompt = `Suggest a workout routine for a user based on their level and current exercises.
      User Data: ${JSON.stringify(data)}
      
      Return a response in this JSON structure:
      {
        "routineName": "Name of the routine",
        "focus": "Muscle groups focused",
        "exercises": [
          { "name": "Exercise 1", "sets": "3", "reps": "12", "reason": "Why this exercise" },
          { "name": "Exercise 2", "sets": "4", "reps": "10", "reason": "Why this exercise" }
        ],
        "advisorTip": "General fitness tip"
      }
      Only return the JSON.`;
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    console.log('[AI-BACKEND] Sending payload to model...');
    const result = await model.generateContent(prompt);
    console.log('[AI-BACKEND] Response received. Content length:', result.response.text().length);
    const responseText = result.response.text();

    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const analysis = JSON.parse(jsonStr);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('[AI-BACKEND] Error:', error);
    return NextResponse.json({ error: 'Failed to generate advice' }, { status: 500 });
  }
}
