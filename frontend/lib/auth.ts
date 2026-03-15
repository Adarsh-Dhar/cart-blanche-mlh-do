/**
 * lib/auth.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Central NextAuth configuration.
 * - Google OAuth provider
 * - Prisma adapter (stores sessions & users in your existing PostgreSQL DB)
 * - Session strategy: database (server-side sessions, no JWT secrets to manage)
 */

import { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  // Use the Prisma adapter — this auto-creates the required tables via migrations
  adapter: PrismaAdapter(prisma) as any,

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // Request offline access so a refresh_token is returned
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],

  // Server-side database sessions (no JWT)
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Custom pages
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  callbacks: {
    // Expose the user id on the session object so client components can use it
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
      }
      return session;
    },

    // Allow all sign-ins (add domain restriction here if needed)
    async signIn({ user, account, profile }) {
      return true;
    },
  },

  // Events (optional: log sign-ins, etc.)
  events: {},

  // Needed for the CSRF token cookie to work behind a proxy / in production
  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === "development",
};