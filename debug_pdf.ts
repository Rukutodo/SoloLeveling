import fs from 'fs';
const pdf = require('pdf-parse');

async function run() {
  const dataBuffer = fs.readFileSync('receipts/AccountStatement_01-May-2026_17-May-2026.pdf');
  try {
    const data = await pdf(dataBuffer);
    console.log('--- RAW PDF TEXT ---');
    console.log(data.text);
    console.log('--- END TEXT ---');
  } catch (err) {
    console.error(err);
  }
}

run();
