import type { NextApiRequest, NextApiResponse } from "next";
import { hash } from "bcryptjs";
import pool from "@/lib/db"; // ← Your pg Pool instance

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ message: "Method not allowed" });
    }

    const { email, password, name } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        // Check if user exists
        const existing = await pool.query(
            `SELECT id FROM "ExternalUsers" WHERE "email" = $1`,
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password
        const hashedPassword = await hash(password, 12);

        // Insert new user
        const result = await pool.query(
            `INSERT INTO "ExternalUsers" ("email", "name", "password", "role", "createdAt")
             VALUES ($1, $2, $3, $4, NOW())
             RETURNING id`,
            [email, name || email.split("@")[0], hashedPassword, "attender"]
        );

        return res.status(201).json({
            message: "User created successfully",
            userId: result.rows[0].id,
        });
    } catch (error: any) {
        console.error("Signup error:", error);
        return res.status(500).json({
            message: "Error creating user",
            error: error.message || "Unknown error",
        });
    }
}
