import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "PATCH") return res.status(405).end();

    const { email, role } = req.body;

    console.log("Request Body:", req.body);

    if (!email || !role) {
        return res.status(400).json({ error: "Missing email or role in request body" });
    }

    try {
        const db = await getDBConnection();

        const query = `
            UPDATE Users
            SET role = @role
            WHERE email = @email
        `;

        await db.request()
            .input("email", email)
            .input("role", role)
            .query(query);

        res.status(200).json({ message: "User role updated successfully" });
    } catch (error) {
        console.error("Error updating user role:", error);
        res.status(500).json({
            error: "Internal server error",
            message: "Failed to update user role"
        });
    }
}