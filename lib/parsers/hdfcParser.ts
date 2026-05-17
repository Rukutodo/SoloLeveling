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

  for (const row of rows) {
    if (!headerFound) {
      if (row[0] === 'Date' && row[1] === 'Narration') {
        headerFound = true;
      }
      continue;
    }

    // Skip separator lines or empty lines
    if (!row[0] || String(row[0]).includes('****') || row[0] === 'Date') continue;

    const dateStr = String(row[0]);
    const narration = String(row[1]);
    const withdrawal = parseFloat(String(row[4] || '0'));
    const deposit = parseFloat(String(row[5] || '0'));

    if (isNaN(withdrawal) && isNaN(deposit)) continue;

    const amount = withdrawal > 0 ? withdrawal : deposit;
    const type = withdrawal > 0 ? 'expense' : 'income';

    // Format date: DD/MM/YY -> YYYY-MM-DD
    const [d, m, y] = dateStr.split('/');
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
