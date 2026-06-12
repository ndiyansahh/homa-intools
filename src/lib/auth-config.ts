import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { userDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { logAuthEvent } from '@/lib/logger';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      const users = await db
        .select()
        .from(userDB)
        .where(eq(userDB.email, user.email))
        .limit(1);

      if (users.length === 0 || !users[0].isActive) {
        logAuthEvent({
          action: 'login_failed',
          email: user.email,
          details: { success: false, error: 'Google email not authorized', method: 'google' },
        });
        return false;
      }

      return true;
    },
    async jwt({ token, account }) {
      // Store provider info in token so we can detect Google login
      if (account?.provider === 'google') {
        token.provider = 'google';
      }
      return token;
    },
    async session({ session, token }) {
      // Pass provider to session
      if (token.provider) {
        (session as any).provider = token.provider;
      }
      return session;
    },
    async redirect({ baseUrl }) {
      return `${baseUrl}/api/auth/google-session`;
    },
  },
});
