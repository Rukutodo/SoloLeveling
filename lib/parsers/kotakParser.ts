// Local Categorization Logic
function categorize(description: string, type: 'income' | 'expense') {
  const desc = description.toLowerCase();
  if (type === 'income') {
    if (desc.includes('salary') || desc.includes('payout') || desc.includes('tata consultancy') || desc.includes('tcs ')) return 'Salary';
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
  // Pass explicit empty options to fix 'default_options is not defined' ReferenceError
  const data = await pdf(buffer, {});
  const text = data.text;
  const transactions: any[] = [];

  // Robust Regex for Kotak Statement Row with Anti-Smash Logic:
  // (\d{1,3}) - ID
  // (\d{2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4}) - Date
  // ([\s\S]*?) - Description
  // (\d{12})? - UPI Ref (Exactly 12 digits, optional)
  // ([\d,]+\.\d{2}) - Amount
  // ([\d,]+\.\d{2}) - Balance
  
  const rowRegex = /(\d{1,3})(\d{2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{4})([\s\S]*?)(\d{12})?([\d,]+\.\d{2})([\d,]+\.\d{2})/g;
  
  let match;
  while ((match = rowRegex.exec(text)) !== null) {
    const dateStr = match[2];
    let narrationRaw = match[3].trim();
    const amountStr = match[5].replace(/,/g, '');
    const amount = parseFloat(amountStr);

    if (isNaN(amount) || amount === 0 || amount > 10000000) continue;

    // Date parsing: DD MMM YYYY -> YYYY-MM-DD
    const months: Record<string, string> = { Jan:'01', Feb:'02', Mar:'03', Apr:'04', May:'05', Jun:'06', Jul:'07', Aug:'08', Sep:'09', Oct:'10', Nov:'11', Dec:'12' };
    const [d, m, y] = dateStr.split(' ');
    const formattedDate = `${y}-${months[m]}-${d.padStart(2, '0')}`;

    let type: 'income' | 'expense' = 'expense';
    const lowerNarration = narrationRaw.toLowerCase();
    
    // Heuristic for Kotak: Balance Check is better but harder in raw text stream.
    // Use keyword detection + owner name identification.
    if (lowerNarration.includes('salary') || 
        lowerNarration.includes('refund') || 
        lowerNarration.includes('interest') ||
        lowerNarration.includes('mr potnuru mano') || 
        lowerNarration.includes('venu go') ||
        lowerNarration.includes('cr/')) {
       type = 'income';
    }

    // --- SELF-TRANSFER EXCLUSION ---
    const selfNames = ['POTNURU VENU GOPAL', 'VENU GOPAL', 'RUKUTODO'];
    if (type === 'income' && selfNames.some(name => narrationRaw.toUpperCase().includes(name))) {
      console.log(`[LOCAL-PARSER] Skipping self-transfer: ${narrationRaw}`);
      continue;
    }
    // -----------------------------

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
