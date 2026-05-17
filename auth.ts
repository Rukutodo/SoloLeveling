import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/lib/models/User';
import { OAuth2Client } from 'google-auth-library';

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await dbConnect();
        const email = (credentials.email as string).toLowerCase();

        const user = await User.findOne({ email });
        if (!user) {
          console.log(`[SYSTEM] Login failed: User not found for ${email}`);
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        console.log(`[SYSTEM] Auth check for ${email}: ${isValid ? 'PASSED' : 'FAILED'}`);

        if (!isValid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        };
      },
    }),
    Credentials({
      id: 'google-one-tap',
      name: 'Google One Tap',
      credentials: {
        credential: { type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.credential) {
          return null;
        }

        try {
          const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
          if (!clientId) {
            console.error('[SYSTEM] Google One Tap: NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing.');
            return null;
          }

          const client = new OAuth2Client(clientId);
          const ticket = await client.verifyIdToken({
            idToken: credentials.credential as string,
            audience: clientId,
          });

          const payload = ticket.getPayload();
          if (!payload || !payload.email) {
            console.error('[SYSTEM] Google One Tap: Invalid token payload');
            return null;
          }

          await dbConnect();
          const email = payload.email.toLowerCase();
          
          let user = await User.findOne({ email });
          if (!user) {
            console.log(`[SYSTEM] Google One Tap: Creating new user profile for ${email}`);
            const randomPassword = await bcrypt.hash(Math.random().toString(36) + Date.now().toString(), 12);
            user = await User.create({
              email,
              password: randomPassword,
              name: payload.name || 'Awakened Hunter',
            });
          }

          console.log(`[SYSTEM] Google One Tap login successful for: ${email}`);
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
          };
        } catch (error) {
          console.error('[SYSTEM] Google One Tap verification error:', error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,   // 24 hours
  },
});
