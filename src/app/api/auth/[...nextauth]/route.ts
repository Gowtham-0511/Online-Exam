import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import pool from "@/lib/db/db";
import { Session, User } from "next-auth";

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

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        try {
          const result = await pool.query(
            `SELECT id, "email", "name", "password", "role"
                         FROM "ExternalUsers"
                         WHERE "email" = $1`,
            [credentials.email]
          );

          const user = result.rows[0];

          if (!user || !user.password) {
            throw new Error("Invalid credentials");
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.password
          );
          if (!isPasswordValid) {
            throw new Error("Invalid credentials");
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("Auth error:", error);
          throw new Error("Authentication failed");
        }
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
      console.log("User signed out:", token?.email);
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role || null;
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
          console.error("Error fetching role:", err);
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
