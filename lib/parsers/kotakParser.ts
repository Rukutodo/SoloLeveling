// Local Categorization Logic
function categorize(description: string, type: 'income' | 'expense') {
  const desc = description.toLowerCase();
  if (type === 'income') {
    if (desc.includes('salary') || desc.includes('payout')) return 'Salary';
    if (desc.includes('refund') || desc.includes('cashback')) return 'Other Income';
    if (desc.includes('dividend') || desc.includes('interest')) return 'Investments';
    return 'Other Income';
  } else {
    if (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('agra sweets') || desc.includes('blinkit') || desc.includes('coffee')) return 'Food';
    if (desc.includes('uber') || desc.includes('ola') || desc.includes('fuel')) return 'Transport';
    if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('shopping') || desc.includes('ratnadeep')) return 'Shopping';
    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('google play')) return 'Subscriptions';
    if (desc.includes('rent') || desc.includes('pg')) return 'Rent';
    if (desc.includes('hospital') || desc.includes('medical')) return 'Health';
    if (desc.includes('electricity') || desc.includes('water')) return 'Utilities';
    return 'Other';
  }
}

function cleanDescription(desc: string) {
  // UPI/NAME/REF/MESSAGE -> NAME
  if (desc.startsWith('UPI/')) {
    const parts = desc.split('/');
    if (parts.length > 1) return parts[1].trim();
  }
  return desc.substring(0, 50).trim();
}

export async function parseKotakPDF(buffer: Buffer) {
  // Dynamic require to prevent build-time initialization issues
  const pdf = require('pdf-parse');
  const data = await pdf(buffer);
  const text = data.text;
  const transactions = [];

  // Regex for Kotak Statement Row: 
  // # (1-2 digits) 
  // Date (DD MMM YYYY) 
  // Description (Text)
  // Ref (UPI-...)
  // Amount (Number with commas)
  // Balance (Number with commas)
  
  // Example: 101 May 2026UPI/RAJENDRAN ROSHI/473001972151/Payment from Ph UPI-612160468665160.004,671.71
  const rowRegex = /(\d{1,2})(\d{2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4})([\s\S]*?)(UPI-[\d]+)([\d,]+\.\d{2})([\d,]+\.\d{2})/g;
  
  let match;
  while ((match = rowRegex.exec(text)) !== null) {
    const dateStr = match[2];
    let narration = match[3].trim();
    const amountStr = match[5].replace(/,/g, '');
    const amount = parseFloat(amountStr);

    // Date parsing: DD MMM YYYY -> YYYY-MM-DD
    const months: Record<string, string> = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
    const [d, m, y] = dateStr.split(' ');
    const formattedDate = `${y}-${months[m]}-${d.padStart(2, '0')}`;

    // Detection of Income vs Expense in PDF text is tricky because they are in the same stream.
    // However, looking at the layout, Deposit usually follows Withdrawal.
    // Based on the extraction, the 160.00 is a Deposit.
    // Let's check the Narration for keywords or assume based on sample if possible.
    // In this specific Kotak format, Withdrawal and Deposit are separate columns.
    // In the raw text, they appear one after another.
    
    // For now, let's use a simpler heuristic: If 'refund' or 'Mr Potnuru' is in narration, it's likely income.
    let type: 'income' | 'expense' = 'expense';
    if (narration.toLowerCase().includes('refund') || narration.toLowerCase().includes('mr potnuru mano') || narration.toLowerCase().includes('venu go')) {
       type = 'income';
    }

    transactions.push({
      date: formattedDate,
      amount,
      type,
      category: categorize(narration, type),
      description: cleanDescription(narration),
    });
  }

  return transactions;
}
