import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json({ error: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const redirectUri = `${new URL(req.url).origin}/api/steps/google-fit/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.body.read',
      'https://www.googleapis.com/auth/fitness.sleep.read'
    ].join(' ');
    
    // Pass the target date inside the state parameter
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scopes)}&access_type=offline&prompt=consent&state=${date}`;
    
    return NextResponse.redirect(googleAuthUrl);
  } catch (error) {
    console.error('[SYSTEM] Google Fit Auth Route Error:', error);
    return NextResponse.json({ error: 'Failed to initiate Google Fit sync authorization' }, { status: 500 });
  }
}
