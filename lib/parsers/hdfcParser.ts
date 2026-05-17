import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import * as XLSX from 'xlsx';

// Local Categorization Logic
function categorize(description: string, type: 'income' | 'expense') {
  const desc = description.toLowerCase();
  if (type === 'income') {
    if (desc.includes('salary') || desc.includes('payout')) return 'Salary';
    if (desc.includes('refund') || desc.includes('cashback')) return 'Other Income';
    if (desc.includes('dividend') || desc.includes('interest')) return 'Investments';
    return 'Other Income';
  } else {
    if (desc.includes('swiggy') || desc.includes('zomato') || desc.includes('agra sweets')) return 'Food';
    if (desc.includes('uber') || desc.includes('ola') || desc.includes('fuel')) return 'Transport';
    if (desc.includes('amazon') || desc.includes('flipkart') || desc.includes('shopping')) return 'Shopping';
    if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('google play')) return 'Subscriptions';
    if (desc.includes('rent') || desc.includes('pg')) return 'Rent';
    if (desc.includes('hospital') || desc.includes('medical')) return 'Health';
    if (desc.includes('electricity') || desc.includes('water')) return 'Utilities';
    return 'Other';
  }
}

// Clean HDFC Descriptions
function cleanDescription(narration: string) {
  // Common UPI cleanup: UPI-NAME-VPA@BANK-REF-REMARK -> NAME
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

  for (const row of rows) {
    if (!headerFound) {
      // Robust header detection: find the row containing 'Narration'
      const idx = row.findIndex(cell => String(row[0] || '').includes('Date') && String(cell || '').toLowerCase().includes('narration'));
      if (idx !== -1) {
        headerFound = true;
        narrationIdx = idx;
        withdrawalIdx = row.findIndex(cell => String(cell || '').toLowerCase().includes('withdrawal'));
        depositIdx = row.findIndex(cell => String(cell || '').toLowerCase().includes('deposit'));
        console.log(`[LOCAL-PARSER] HDFC Header found. Map: Narration:${narrationIdx}, Dr:${withdrawalIdx}, Cr:${depositIdx}`);
      }
      continue;
    }

    // Skip separator lines or empty lines
    const dateCell = String(row[0] || '');
    if (!dateCell || dateCell.includes('***') || dateCell.toLowerCase().includes('date') || dateCell.length < 5) continue;

    const dateStr = dateCell;
    const narration = String(row[narrationIdx] || '');
    
    const withdrawalStr = String(row[withdrawalIdx] || '0').replace(/,/g, '');
    const depositStr = String(row[depositIdx] || '0').replace(/,/g, '');
    
    const withdrawal = parseFloat(withdrawalStr);
    const deposit = parseFloat(depositStr);

    if (isNaN(withdrawal) && isNaN(deposit)) continue;

    const amount = deposit > 0 ? deposit : withdrawal;
    const type = deposit > 0 ? 'income' : 'expense';

    if (amount === 0) continue;

    // Format date: DD/MM/YY -> YYYY-MM-DD
    const parts = dateStr.split('/');
    if (parts.length !== 3) continue;
    
    const [d, m, y] = parts;
    const fullYear = parseInt(y) < 50 ? `20${y}` : `19${y}`;
    const formattedDate = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;

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
