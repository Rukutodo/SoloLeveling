import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Birthday from '@/lib/models/Birthday';
import User from '@/lib/models/User';
import nodemailer from 'nodemailer';

export async function GET(req: NextRequest) {
  try {
    // Check for a secret key to prevent unauthorized triggers
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      // Commented out for easier testing, enable in production
    }

    await dbConnect();

    // Find birthdays for tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const targetMonth = tomorrow.getMonth();
    const targetDay = tomorrow.getDate();

    // MongoDB aggregation to find birthdays matching month/day
    const birthdaysTomorrow = await Birthday.aggregate([
      {
        $project: {
          userId: 1,
          name: 1,
          month: { $month: '$date' },
          day: { $dayOfMonth: '$date' }
        }
      },
      {
        $match: {
          month: targetMonth + 1, // MongoDB months are 1-12
          day: targetDay
        }
      }
    ]);

    if (birthdaysTomorrow.length === 0) {
      return NextResponse.json({ message: 'No birthdays tomorrow' });
    }

    // Configure transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const results = [];

    for (const bday of birthdaysTomorrow) {
      const user = await User.findById(bday.userId);
      if (user?.email) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: `Birthday Reminder: ${bday.name}`,
          text: `Hi Hunter, this is a system reminder that ${bday.name}'s birthday is tomorrow! Don't forget to send your regards.`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; background: #0a0a0c; color: #fff; border: 1px solid #00d4ff; border-radius: 8px;">
              <h2 style="color: #00d4ff; margin-top: 0; display: flex; align-items: center; gap: 8px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/></svg>
                Birthday Quest!
              </h2>
              <p>Greetings, Hunter.</p>
              <p>The system has detected a celebration event: <strong>${bday.name}'s birthday</strong> is tomorrow!</p>
              <p>Ensure your preparations are complete.</p>
              <hr style="border-color: #333;" />
              <p style="font-size: 12px; color: #888;">[SYSTEM MESSAGE] Automated reminder from SoloLeveling Tracker.</p>
            </div>
          `
        };

        try {
          await transporter.sendMail(mailOptions);
          results.push({ name: bday.name, email: user.email, status: 'Sent' });
        } catch (e) {
          results.push({ name: bday.name, email: user.email, status: 'Failed', error: e });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
