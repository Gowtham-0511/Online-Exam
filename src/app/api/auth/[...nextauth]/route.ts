import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";

import pool from "@/lib/db/db";
import { Session, User } from "next-auth";
import logger from "@/lib/logger";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      role?: string | null;
    };
  }
  interface User {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    role?: string | null;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),


  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
  events: {
    async signOut({ token }) {
      logger.info("User signed out: %s", token?.email);
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      logger.info("User signing in: %s, Provider: %s", user.email, account?.provider);
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role || null;
      }

      // Hardcode admin role for app owner
      if (token.email === "gowthamr@systechusa.com") {
        token.role = "admin";
      }

      if (!token.role && token.email) {
        try {
          const result = await pool.query(
            `SELECT role FROM users WHERE email = $1`,
            [token.email]
          );
          if (result.rows.length > 0) {
            token.role = result.rows[0].role;
          }
        } catch (err) {
          logger.error("Error fetching role for %s: %o", token.email, err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },

  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
