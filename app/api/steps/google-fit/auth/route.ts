import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.' }, { status: 500 });
    }

    await dbConnect();
    const user = await User.findById(session.user.id);
    
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const force = searchParams.get('force') === 'true'; // Allow user to force re-auth
    const redirectUri = `${new URL(req.url).origin}/api/steps/google-fit/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.body.read',
      'https://www.googleapis.com/auth/fitness.sleep.read'
    ].join(' ');
    
    // If we have a refresh token and aren't forcing re-auth, we can potentially skip this or handle it differently
    // For now, let's just make it smarter about the prompt
    const prompt = (user?.googleRefreshToken && !force) ? 'none' : 'consent';
    
    // access_type=offline is critical for getting the refresh token
    let googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&state=${date}`;
    
    if (force || !user?.googleRefreshToken) {
      googleAuthUrl += '&prompt=consent';
    } else {
      // If we already have a token, we might not even need to redirect if we implement a background sync route
      // But for the existing UI flow, 'select_account' is less annoying than 'consent'
      googleAuthUrl += '&prompt=select_account';
    }
    
    return NextResponse.redirect(googleAuthUrl);
  } catch (error) {
    console.error('[SYSTEM] Google Fit Auth Route Error:', error);
    return NextResponse.json({ error: 'Failed to initiate Google Fit sync authorization' }, { status: 500 });
  }
}
