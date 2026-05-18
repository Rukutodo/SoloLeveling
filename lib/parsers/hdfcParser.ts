import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as XLSX from 'xlsx';

// Local Categorization Logic
function categorize(description: string, type: 'income' | 'expense') {
  const desc = description.toLowerCase();
  if (type === 'income') {
    if (desc.includes('salary') || desc.includes('payout') || desc.includes('tata consultancy') || desc.includes('tcs ')) return 'Salary';
    if (desc.includes('refund') || desc.includes('cashback')) return 'Other Income';
    if (desc.includes('dividend') || desc.includes('interest') || desc.includes('int.pd')) return 'Investments';
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

// Clean HDFC Descriptions
function cleanDescription(narration: string) {
  if (narration.startsWith('UPI-')) {
    const parts = narration.split('-');
    if (parts.length > 1) return parts[1].trim();
  }
  return narration.substring(0, 50).trim();
}

export async function parseHDFCExcel(buffer: Buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const transactions = [];
  let headerFound = false;
  let narrationIdx = 1;
  let withdrawalIdx = 4;
  let depositIdx = 5;
  let globalIndex = 0;

  for (const row of rows) {
    if (!headerFound) {
      // Find row containing Date and Narration
      const idx = row.findIndex(cell => String(cell || '').toLowerCase().includes('narration'));
      const dateIdx = row.findIndex(cell => String(cell || '').toLowerCase().includes('date'));
      
      if (idx !== -1 && dateIdx !== -1) {
        headerFound = true;
        narrationIdx = idx;
        withdrawalIdx = row.findIndex(cell => String(cell || '').toLowerCase().includes('withdrawal'));
        depositIdx = row.findIndex(cell => String(cell || '').toLowerCase().includes('deposit'));
        console.log(`[LOCAL-PARSER] HDFC Header found. Map: Narration:${narrationIdx}, Dr:${withdrawalIdx}, Cr:${depositIdx}`);
      }
      continue;
    }

    const dateCell = String(row[0] || '');
    if (!dateCell || dateCell.includes('***') || dateCell.toLowerCase().includes('date') || dateCell.length < 5) continue;

    const dateStr = dateCell;
    const narration = String(row[narrationIdx] || '');
    
    // Robust numeric parsing
    const parseAmount = (val: any) => {
        if (val === undefined || val === null || val === '') return 0;
        const cleaned = String(val).replace(/,/g, '').trim();
        const num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
    };

    const withdrawal = parseAmount(row[withdrawalIdx]);
    const deposit = parseAmount(row[depositIdx]);

    if (withdrawal === 0 && deposit === 0) continue;

    const amount = deposit > 0 ? deposit : withdrawal;
    const type = deposit > 0 ? 'income' : 'expense';
    
    // Explicit check for Interest
    let finalType = type;
    if (narration.toLowerCase().includes('int.pd') || narration.toLowerCase().includes('interest')) {
       finalType = 'income';
    }

    // --- SELF-TRANSFER EXCLUSION ---
    const selfNames = ['POTNURU VENU GOPAL', 'VENU GOPAL', 'RUKUTODO'];
    if (finalType === 'income' && selfNames.some(name => narration.toUpperCase().includes(name))) {
      continue;
    }

    const parts = dateStr.split('/');
    if (parts.length !== 3) continue;
    
    const [d, m, y] = parts;
    const fullYear = parseInt(y) < 50 ? `20${y}` : `19${y}`;
    const formattedDate = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

    transactions.push({
      date: formattedDate,
      amount,
      type: finalType,
      category: categorize(narration, finalType),
      description: cleanDescription(narration),
      index: globalIndex++,
    });
  }

  return transactions;
}
