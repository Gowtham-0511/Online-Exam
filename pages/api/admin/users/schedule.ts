import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

    const { userId, scheduleStart, scheduleEnd } = req.body;

    try {
        const db = await getDBConnection();

        // Convert to proper JS Date objects (SQL Server will receive these as datetime)
        const start = scheduleStart ? new Date(scheduleStart) : null;
        const end = scheduleEnd ? new Date(scheduleEnd) : null;

        await db.request()
            .input("userId", userId)
            .input("scheduleStart", start)
            .input("scheduleEnd", end)
            .query(`
                UPDATE users
                SET schedule_start = @scheduleStart, schedule_end = @scheduleEnd
                WHERE id = @userId
            `);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Failed to update user schedule:", error);
        return res.status(500).json({ error: "Database update failed" });
    }
}
