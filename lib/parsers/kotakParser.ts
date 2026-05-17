// Local Categorization Logic
function categorize(description: string, type: 'income' | 'expense') {
  const desc = description.toLowerCase();
  if (type === 'income') {
    if (desc.includes('salary') || desc.includes('payout')) return 'Salary';
    if (desc.includes('refund') || desc.includes('cashback')) return 'Other Income';
    if (desc.includes('dividend') || desc.includes('interest')) return 'Investments';
    return 'Other Income';
  } else {
    if (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('agra sweets') || desc.includes('blinkit') || desc.includes('coffee') || desc.includes('cafe')) return 'Food';
    if (desc.includes('uber') || desc.includes('ola') || desc.includes('fuel')) return 'Transport';
    if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('shopping') || desc.includes('ratnadeep')) return 'Shopping';
    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('google play') || desc.includes('youtube')) return 'Subscriptions';
    if (desc.includes('rent') || desc.includes('pg')) return 'Rent';
    if (desc.includes('hospital') || desc.includes('medical') || desc.includes('pharmacy')) return 'Health';
    if (desc.includes('electricity') || desc.includes('water') || desc.includes('bill')) return 'Utilities';
    return 'Other';
  }
}

function cleanDescription(desc: string) {
  // UPI/NAME/REF/MESSAGE -> NAME
  if (desc.startsWith('UPI/')) {
    const parts = desc.split('/');
    if (parts.length > 1) return parts[1].replace(/\n/g, ' ').trim();
  }
  return desc.replace(/\n/g, ' ').substring(0, 50).trim();
}

export async function parseKotakPDF(buffer: Buffer) {
  // Dynamic require to prevent build-time initialization issues
  const pdf = require('pdf-parse');
  const data = await pdf(buffer);
  const text = data.text;
  const transactions = [];

  // Robust Regex for Kotak Statement Row:
  // (\d{1,2}) - ID
  // (\d{2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}) - Date
  // ([\s\S]*?) - Description (Lazy)
  // (?:UPI-[\d]+)? - Optional Ref prefix
  // ([\d,]+\.\d{2}) - Withdrawal (if exists) OR Deposit
  // ([\d,]+\.\d{2})? - Balance
  
  // Based on extracted text pattern: 
  // 101 May 2026UPI/RAJENDRAN ROSHI/473001972151/Payment from Ph UPI-612160468665160.004,671.71
  // We see ID + Date + Description + Ref + Amount + Balance all smashed together
  
  const rowRegex = /(\d{1,3})(\d{2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4})([\s\S]*?)([\d,]+\.\d{2})([\d,]+\.\d{2})/g;
  
  let match;
  while ((match = rowRegex.exec(text)) !== null) {
    const dateStr = match[2];
    let narrationRaw = match[3].trim();
    const amountStr = match[4].replace(/,/g, '');
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount === 0) continue;

    // Date parsing: DD MMM YYYY -> YYYY-MM-DD
    const months: Record<string, string> = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
    const [d, m, y] = dateStr.split(' ');
    const formattedDate = `${y}-${months[m]}-${d.padStart(2, '0')}`;

    // Detection Logic: 
    // In Kotak text extraction, Description contains the Narration and the UPI Ref.
    // The amount immediately following Narration could be Withdrawal OR Deposit.
    // Heuristic: If 'Salary', 'Refund', or names like 'Potnuru' (owner) appear, it's income.
    let type: 'income' | 'expense' = 'expense';
    const lowerNarration = narrationRaw.toLowerCase();
    
    if (lowerNarration.includes('salary') || 
        lowerNarration.includes('refund') || 
        lowerNarration.includes('interest') ||
        lowerNarration.includes('mr potnuru mano') || 
        lowerNarration.includes('venu go')) {
       type = 'income';
    }

    transactions.push({
      date: formattedDate,
      amount,
      type,
      category: categorize(narrationRaw, type),
      description: cleanDescription(narrationRaw),
    });
  }

  return transactions;
}
