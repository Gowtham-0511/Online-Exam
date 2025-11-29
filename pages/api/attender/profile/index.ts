import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { email } = req.query;
    
    // Allow email to be passed in query for GET, or body for PUT if needed, 
    // but typically we trust the session or token. 
    // For this app, it seems we pass email as a query param or rely on client sending it.
    // Based on previous files, we often pass email as query param.
    
    const userEmail = Array.isArray(email) ? email[0] : email;

    if (!userEmail) {
        return res.status(400).json({ error: "Email is required" });
    }

    if (req.method === "GET") {
        try {
            const query = `
                SELECT * FROM "UserProfile" WHERE user_email = $1
            `;
            const result = await pool.query(query, [userEmail]);
            
            if (result.rows.length === 0) {
                return res.status(200).json({ profile: null });
            }

            return res.status(200).json({ profile: result.rows[0] });
        } catch (error) {
            console.error("Error fetching profile:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    } else if (req.method === "PUT") {
        try {
            const { bio, location, occupation, github_url, linkedin_url, website_url, profile_image } = req.body;

            // Check if profile exists
            const checkQuery = `SELECT id FROM "UserProfile" WHERE user_email = $1`;
            const checkResult = await pool.query(checkQuery, [userEmail]);

            if (checkResult.rows.length > 0) {
                // Update
                const updateQuery = `
                    UPDATE "UserProfile"
                    SET bio = $1, location = $2, occupation = $3, github_url = $4, linkedin_url = $5, website_url = $6, profile_image = $7, updated_at = NOW()
                    WHERE user_email = $8
                    RETURNING *
                `;
                const updateResult = await pool.query(updateQuery, [bio, location, occupation, github_url, linkedin_url, website_url, profile_image, userEmail]);
                return res.status(200).json({ profile: updateResult.rows[0], message: "Profile updated successfully" });
            } else {
                // Insert
                const insertQuery = `
                    INSERT INTO "UserProfile" (user_email, bio, location, occupation, github_url, linkedin_url, website_url, profile_image)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *
                `;
                const insertResult = await pool.query(insertQuery, [userEmail, bio, location, occupation, github_url, linkedin_url, website_url, profile_image]);
                return res.status(201).json({ profile: insertResult.rows[0], message: "Profile created successfully" });
            }
        } catch (error) {
            console.error("Error updating profile:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    } else {
        return res.status(405).end();
    }
}
