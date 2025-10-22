import NextAuth, { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import pool from "@/lib/db";

import { Session, User } from "next-auth";
declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            email?: string | null;
            name?: string | null;
            image?: string | null;
        };
    }
    interface User {
        id: string;
        email?: string | null;
        name?: string | null;
        image?: string | null;
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID!,
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
                    console.log("Attempting login for:", credentials.email);

                    const result = await pool.query(
                        `SELECT id, "email", "name", "password", "role"
                        FROM "ExternalUsers"
                        WHERE "email" = $1`,
                        [credentials.email]
                    );

                    console.log("Query result:", result.rows.length, "users found");

                    const user = result.rows[0];

                    if (!user) {
                        console.log("No user found with email:", credentials.email);
                        throw new Error("Invalid credentials");
                    }

                    if (!user.password) {
                        console.log("User has no password set:", credentials.email);
                        throw new Error("Invalid credentials");
                    }

                    console.log("Comparing passwords...");
                    const isPasswordValid = await compare(credentials.password, user.password);

                    if (!isPasswordValid) {
                        console.log("Password comparison failed for:", credentials.email);
                        throw new Error("Invalid credentials");
                    }

                    console.log("Login successful for:", credentials.email);
                    return {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.name,
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
    },

    pages: {
        signIn: "/",
    },

    secret: process.env.NEXTAUTH_SECRET,

    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === 'azure-ad' || account?.provider === 'google') {
                try {
                    const result = await pool.query(
                        `SELECT id FROM "ExternalUsers" WHERE email = $1`,
                        [user.email]
                    );

                    if (result.rows.length === 0) {
                        await pool.query(
                            `INSERT INTO "ExternalUsers" (email, name, provider) VALUES ($1, $2, $3)`,
                            [user.email, user.name, account.provider]
                        );
                    }
                } catch (error) {
                    console.error("SignIn callback error:", error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
            }
            return session;
        },
    },
};

export default NextAuth(authOptions);