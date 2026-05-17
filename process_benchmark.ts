import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemma-4-31b-it' });

const PROMPT = `You are a financial parsing engine. Analyze the following receipt email logs/texts or uploaded document and extract structured transaction information.
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

async function processFile(filePath: string) {
  const fileName = path.basename(filePath);
  const start = Date.now();
  console.log(`\n[SYSTEM] PROCESSING: ${fileName}`);

  try {
    let result;
    if (fileName.endsWith('.pdf')) {
      const data = fs.readFileSync(filePath);
      const base64 = data.toString('base64');
      result = await model.generateContent([
        { inlineData: { data: base64, mimeType: 'application/pdf' } },
        PROMPT
      ]);
    } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
      const data = fs.readFileSync(filePath);
      const workbook = XLSX.read(data, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      result = await model.generateContent(`${PROMPT}\n\nCSV Data:\n${csv}`);
    } else {
      console.log(`[SKIP] Unsupported format: ${fileName}`);
      return;
    }

    const duration = (Date.now() - start) / 1000;
    const text = result.response.text();
    console.log(`[SUCCESS] ${fileName} | Time: ${duration.toFixed(2)}s | Response Length: ${text.length}`);
    return { fileName, duration, success: true };
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    console.error(`[ERROR] ${fileName} | Time: ${duration.toFixed(2)}s | Error: ${error.message}`);
    return { fileName, duration, success: false, error: error.message };
  }
}

async function run() {
  const receiptsDir = 'receipts';
  const files = fs.readdirSync(receiptsDir)
    .filter(f => (f.endsWith('.xls') || f.endsWith('.xlsx')))
    .map(f => path.join(receiptsDir, f));

  console.log(`[SYSTEM] Starting sequential processing of ${files.length} files...`);
  const report = [];

  for (const file of files) {
    const res = await processFile(file);
    if (res) report.push(res);
    // 5 second cooldown to avoid rate limits
    if (files.indexOf(file) < files.length - 1) {
      console.log('[COOLDOWN] Waiting 5s before next request...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('FINAL PERFORMANCE REPORT');
  console.log('='.repeat(50));
  report.forEach(r => {
    console.log(`${r.success ? 'Γ£ô' : 'Γ£û'} ${r.fileName.padEnd(45)} | ${r.duration.toFixed(2)}s`);
  });
  console.log('='.repeat(50));
  process.exit(0);
}

run();
