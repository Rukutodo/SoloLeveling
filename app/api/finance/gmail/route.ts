import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface GmailMessage {
  id: string;
  snippet: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessToken, rawText, fileData, mimeType } = await req.json();

    if (!accessToken && !rawText && !(fileData && mimeType)) {
      return NextResponse.json({ error: 'Provide a Gmail Access Token, Raw Text, or File Upload to parse' }, { status: 400 });
    }

    let textsToParse: string[] = [];

    if (accessToken) {
      // 1. Fetch recent receipt emails using Google REST API
      const searchUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=subject:(receipt OR order OR payment OR transaction OR invoice OR purchase OR "bank alert" OR debited OR credited)&maxResults=15';
      const searchRes = await fetch(searchUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!searchRes.ok) {
        const errText = await searchRes.text();
        console.error('Gmail API error:', errText);
        return NextResponse.json({ error: 'Failed to fetch messages from Gmail API. Ensure token is valid.' }, { status: 400 });
      }

      const searchData = await searchRes.json();
      const messages: GmailMessage[] = searchData.messages || [];

      // Fetch details of each message in parallel
      const detailPromises = messages.map(async (msg) => {
        try {
          const detailUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=minimal`;
          const detailRes = await fetch(detailUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            return `Snippet: ${detailData.snippet}\nSubject: ${detailData.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || ''}`;
          }
        } catch (e) {
          console.error(`Failed to fetch message details for ${msg.id}:`, e);
        }
        return null;
      });

      const details = await Promise.all(detailPromises);
      textsToParse = details.filter(Boolean) as string[];
    } else if (rawText) {
      textsToParse = [rawText];
    }

    if (textsToParse.length === 0 && !(fileData && mimeType)) {
      return NextResponse.json({ transactions: [] });
    }

    // 2. Feed text snippets or file to Gemini to extract financial transaction structures
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const prompt = `You are a financial parsing engine. Analyze the following receipt email logs/texts or uploaded document and extract structured transaction information.
    For each valid financial transaction found (purchase, refund, bill payment, salary, credit alert):
    - Identify the date (formatted as YYYY-MM-DD). If no clear year is mentioned, assume 2026.
    - Extract the transaction amount as a positive number.
    - Classify the type as "expense" or "income".
    - Categorify it into one of these strict categories:
      For Expense: "Rent", "Food", "Transport", "Shopping", "Subscriptions", "Health", "Entertainment", "Utilities", "Education", "Other".
      For Income: "Salary", "Freelance", "Investments", "Gifts", "Other Income".
    - Provide a short, clean description (e.g. "Amazon.in", "Uber Ride", "Salary Credit", "Starbucks").
    
    Return a JSON response with this EXACT structure (no markdown wrapper, just raw JSON array of objects):
    [
      {
        "date": "YYYY-MM-DD",
        "amount": number,
        "type": "expense" | "income",
        "category": "string",
        "description": "string"
      }
    ]
    
    If no transactions are found, return an empty array. Do not add any text other than the JSON array.`;

    let parsedText = '';
    if (fileData && mimeType) {
      const result = await model.generateContent([
        {
          inlineData: {
            data: fileData,
            mimeType: mimeType
          }
        },
        prompt
      ]);
      parsedText = result.response.text().trim();
    } else {
      const fullPrompt = `${prompt}\n\nEmail Logs/Texts to parse:\n\"\"\"\n${textsToParse.join('\n\n--- MESSAGE BLOCK ---\n\n')}\n\"\"\"`;
      const result = await model.generateContent(fullPrompt);
      parsedText = result.response.text().trim();
    }

    // Remove markdown codeblock wrappers if present
    const cleanJSON = parsedText.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    let extracted: any[] = [];
    try {
      const parsedObj = JSON.parse(cleanJSON);
      if (Array.isArray(parsedObj)) {
        extracted = parsedObj;
      } else if (parsedObj && typeof parsedObj === 'object' && Array.isArray(parsedObj.transactions)) {
        extracted = parsedObj.transactions;
      } else if (parsedObj && typeof parsedObj === 'object' && Array.isArray(parsedObj.data)) {
        extracted = parsedObj.data;
      } else {
        throw new Error('Gemini did not return an array of transactions.');
      }
    } catch (e: any) {
      console.error('Failed to parse Gemini output:', parsedText);
      return NextResponse.json({ error: `Failed to extract structured JSON data: ${e.message}. Raw output: ${parsedText.substring(0, 100)}...` }, { status: 500 });
    }

    // 3. Generate unique signatures for strict deduplication
    const transactions = extracted.map((tx: any) => {
      const dateStr = tx.date ? new Date(tx.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const desc = (tx.description || 'Transaction').trim();
      const amt = Number(tx.amount) || 0;
      const type = tx.type === 'income' ? 'income' : 'expense';

      // Strict signature calculation
      const sigString = `${session.user.id}_${dateStr}_${amt}_${desc.toLowerCase()}_${type}`;
      const signature = crypto.createHash('sha256').update(sigString).digest('hex');

      return {
        ...tx,
        date: dateStr,
        amount: amt,
        type,
        signature,
      };
    });

    return NextResponse.json({ transactions });
  } catch (error: any) {
    console.error('Gmail API parsing error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
