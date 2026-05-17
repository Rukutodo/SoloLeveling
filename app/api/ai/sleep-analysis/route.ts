import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { hours, quality } = body;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `Analyze the effects of ${hours} hours of sleep with a quality rating of ${quality}/5 on a person's body and mind. 
    Provide the analysis in a structured JSON format:
    {
      "bodyEffects": {
        "pros": ["pro 1", "pro 2"],
        "cons": ["con 1", "con 2"]
      },
      "mindEffects": {
        "pros": ["pro 1", "pro 2"],
        "cons": ["con 1", "con 2"]
      },
      "overallAdvice": "A short summary advice"
    }
    Only return the raw JSON.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    const analysis = JSON.parse(jsonStr);
    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Sleep analysis error:', error);
    return NextResponse.json({ error: 'Failed to generate analysis' }, { status: 500 });
  }
}
