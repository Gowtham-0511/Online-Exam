import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";
import bcrypt from 'bcrypt'; // or your preferred hashing librarycls


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end();

    try {
        const { users } = req.body;

        if (!users || !Array.isArray(users)) {
            return res.status(400).json({ error: "Invalid user data" });
        }

        const db = await getDBConnection();

        for (const user of users) {
            const { name, email, password } = user;

            console.log("Processing user:", user);
            console.log("Name:", name, "Email:", email, "Password:", password);

            if (!email || !password) {
                continue; // Skip invalid entries
            }

            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);

            // Insert user
            const request = db.request();
            request.input('name', name || '');
            request.input('email', email);
            request.input('password', hashedPassword);
            await request.query(`
                INSERT INTO Candidates (name, email, password, is_active, created_at) 
                VALUES (@name, @email, @password, 0, GETDATE())
            `);
        }

        res.status(200).json({ message: "Users uploaded successfully" });
    } catch (err) {
        console.error("Error uploading users:", err);
        res.status(500).json({ error: "Failed to upload users" });
    }
}