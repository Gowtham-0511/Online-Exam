import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

    const { useremails, scheduleStart, scheduleEnd } = req.body;

    if (!Array.isArray(useremails) || useremails.length === 0) {
        return res.status(400).json({ error: "No users provided" });
    }

    try {
        const db = await getDBConnection();

        // Convert to proper JS Date objects (SQL Server will receive these as datetime)
        const start = scheduleStart ? new Date(scheduleStart) : null;
        const end = scheduleEnd ? new Date(scheduleEnd) : null;

        const request = db.request()
            .input("scheduleStart", start)
            .input("scheduleEnd", end);

        const emailList = useremails.map(email => `'${email}'`).join(', ');
        const query = `
            UPDATE Candidates
            SET schedule_start = @scheduleStart, schedule_end = @scheduleEnd, is_active = 1
            WHERE email IN (${emailList})
        `;
        console.log(query);
        await request.query(query);

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error("Failed to update user schedules:", error);
        return res.status(500).json({ error: "Database update failed" });
    }
}