"use client";

/**
 * components/session-provider.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Thin wrapper around NextAuth's SessionProvider.
 * Must be a Client Component so it can set up the React context.
 * Drop this into your root layout.
 */

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: any;
}) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  );
}