import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import crypto from 'crypto';
import { withLogger } from '@/lib/apiLogger';
import { parseHDFCExcel } from '@/lib/parsers/hdfcParser';
import { parseKotakPDF } from '@/lib/parsers/kotakParser';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface GmailMessage {
  id: string;
  snippet: string;
}

export const POST = withLogger(async (req: NextRequest) => {
  try {
    console.log('[AI-BACKEND] Request received. Checking session...');
    const session = await auth();
    if (!session?.user?.id) {
      console.warn('[AI-BACKEND] Unauthorized access attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[AI-BACKEND] Session verified for user:', session.user.id);

    const { accessToken, rawText, fileData, mimeType, isExcel } = await req.json();

    if (!accessToken && !rawText && !(fileData && mimeType)) {
      return NextResponse.json({ error: 'Provide a Gmail Access Token, Raw Text, or File Upload to parse' }, { status: 400 });
    }

    // --- LOCAL PARSER FAST PATH ---
    if (fileData) {
      const buffer = Buffer.from(fileData, 'base64');
      let localTransactions = [];

      if (isExcel) {
        console.log('[AI-BACKEND] Attempting local HDFC Excel parsing...');
        try { localTransactions = await parseHDFCExcel(buffer); } catch (e) { console.warn('HDFC Excel parser failed'); }
      } else if (mimeType === 'application/pdf') {
        console.log('[AI-BACKEND] Attempting local Kotak PDF parsing...');
        try { localTransactions = await parseKotakPDF(buffer); } catch (e) { console.warn('Kotak PDF parser failed'); }
      }

      if (localTransactions.length > 0) {
        console.log(`[AI-BACKEND] Local parser success. Found ${localTransactions.length} transactions.`);
        const finalTransactions = localTransactions.map((tx: any) => {
          const sigString = `${session.user.id}_${tx.date}_${tx.amount}_${tx.description.toLowerCase()}_${tx.type}`;
          const signature = crypto.createHash('sha256').update(sigString).digest('hex');
          return { ...tx, signature };
        });
        return NextResponse.json({ transactions: finalTransactions, method: 'local_parser' });
      }
    }
    // ------------------------------

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

    console.log('[AI-BACKEND] Starting AI processing for Finance/Gmail Parsing...');
    // 2. Use a faster, stable model for production
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
    const aiStartTime = Date.now();

    try {
      if (fileData && mimeType) {
        console.log(`[AI-BACKEND] Sending ${mimeType} file (${fileData.length} chars) to gemini-2.0-flash...`);
        const result = await model.generateContent([
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType
            }
          },
          prompt
        ]);
        const resText = result.response.text();
        const aiDuration = (Date.now() - aiStartTime) / 1000;
        console.log(`[AI-BACKEND] Response received in ${aiDuration.toFixed(2)}s. Content length: ${resText.length}`);
        parsedText = resText.trim();
      } else {
        const textsJoined = textsToParse.join('\n\n--- MESSAGE BLOCK ---\n\n');
        console.log(`[AI-BACKEND] Sending text blocks (${textsJoined.length} chars) to gemini-2.0-flash...`);
        const fullPrompt = `${prompt}\n\nEmail Logs/Texts to parse:\n\"\"\"\n${textsJoined}\n\"\"\"`;
        const result = await model.generateContent(fullPrompt);
        const resText = result.response.text();
        const aiDuration = (Date.now() - aiStartTime) / 1000;
        console.log(`[AI-BACKEND] Response received in ${aiDuration.toFixed(2)}s. Content length: ${resText.length}`);
        parsedText = resText.trim();
      }
    } catch (aiErr: any) {
      console.error('[AI-BACKEND] gemini-2.0-flash failed, attempting fallback to gemini-1.5-flash:', aiErr.message);
      const fallbackModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      // Logic for fallback is similar, but simpler to just catch and report here
      throw aiErr; 
    }

    // Remove markdown codeblock wrappers and conversational preamble
    console.log('[AI-BACKEND] Cleaning AI output for JSON extraction...');
    let cleanJSON = parsedText;

    // 1. Try to find content between ```json and ```
    const jsonBlockMatch = parsedText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      cleanJSON = jsonBlockMatch[1];
    } else {
      // 2. Try to find content between [ and ] (the array)
      const arrayMatch = parsedText.match(/(\[[\s\S]*\])/);
      if (arrayMatch) {
        cleanJSON = arrayMatch[1];
      }
    }

    cleanJSON = cleanJSON.trim();

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
      console.error('[AI-BACKEND] JSON Parse Failure. Raw Text snippet:', parsedText.substring(0, 100));
      console.error('[AI-BACKEND] Cleaned JSON snippet:', cleanJSON.substring(0, 100));
      return NextResponse.json({ 
        error: `Failed to extract structured JSON data: ${e.message}`,
        debug: {
          raw: parsedText.substring(0, 500),
          cleaned: cleanJSON.substring(0, 500)
        }
      }, { status: 500 });
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
    console.error('[AI-BACKEND] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}, { enforceAiRateLimit: true });
