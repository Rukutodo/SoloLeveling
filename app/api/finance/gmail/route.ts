import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import crypto from 'crypto';
import { withLogger } from '@/lib/apiLogger';
import { parseHDFCExcel } from '@/lib/parsers/hdfcParser';
import { parseKotakPDF } from '@/lib/parsers/kotakParser';

export const POST = withLogger(async (req: NextRequest) => {
  try {
    console.log('[AI-BACKEND] Request received. Checking session...');
    const session = await auth();
    if (!session?.user?.id) {
      console.warn('[AI-BACKEND] Unauthorized access attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[AI-BACKEND] Session verified for user:', session.user.id);

    const { rawText, fileData, mimeType, isExcel, source } = await req.json();

    // --- LOCAL PARSER ONLY ---
    if (fileData) {
      const buffer = Buffer.from(fileData, 'base64');
      let localTransactions: any[] = [];

      if (isExcel) {
        console.log('[AI-BACKEND] Attempting local HDFC Excel parsing...');
        try { 
          localTransactions = await parseHDFCExcel(buffer); 
        } catch (e) { 
          console.error('HDFC Excel parser error:', e);
          return NextResponse.json({ error: 'Failed to parse Excel file locally.' }, { status: 422 });
        }
      } else if (mimeType === 'application/pdf') {
        console.log('[AI-BACKEND] Attempting local Kotak PDF parsing...');
        try { 
          localTransactions = await parseKotakPDF(buffer); 
        } catch (e) { 
          console.error('Kotak PDF parser error:', e);
          return NextResponse.json({ error: 'Failed to parse PDF file locally.' }, { status: 422 });
        }
      }

      if (localTransactions && localTransactions.length > 0) {
        console.log(`[AI-BACKEND] Local parser success. Found ${localTransactions.length} transactions from ${source}.`);
        
        const finalTransactions = localTransactions.map((tx: any) => {
          const sigString = `${session.user.id}_${tx.date}_${tx.amount}_${tx.description.toLowerCase()}_${tx.type}`;
          const signature = crypto.createHash('sha256').update(sigString).digest('hex');
          return { ...tx, signature, source: source || 'Local Parser' };
        });
        
        return NextResponse.json({ transactions: finalTransactions, method: 'local_parser' });
      } else {
        return NextResponse.json({ 
          error: 'This file format is not supported for local parsing. Please upload HDFC Excel or Kotak PDF statements.' 
        }, { status: 400 });
      }
    }

    if (rawText) {
       return NextResponse.json({ error: 'Text pasting is currently disabled (AI fallback removed).' }, { status: 400 });
    }

    return NextResponse.json({ error: 'No file data provided or format not supported.' }, { status: 400 });
  } catch (error: any) {
    console.error('[AI-BACKEND] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}, { enforceAiRateLimit: false });
