import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key not found in environment' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const result = await genAI.listModels();
    
    return NextResponse.json({ models: result.models });
  } catch (error: any) {
    console.error('List Models Error:', error);
    return NextResponse.json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
