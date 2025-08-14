import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const db = await getDBConnection();

    if (req.method === "POST") {
        const { jobId, skillIds } = req.body;

        try {
            await db.request().input("jobId", jobId).query("DELETE FROM JobSkillMapping WHERE jobId = @jobId");

            for (const skillId of skillIds) {
                await db.request()
                    .input("jobId", jobId)
                    .input("skillId", skillId)
                    .query("INSERT INTO JobSkillMapping (jobId, skillId) VALUES (@jobId, @skillId)");
            }

            return res.status(200).json({ success: true });
        } catch (err) {
            console.error(err);
            return res.status(500).json({ error: "Failed to map skills" });
        }
    }

    if (req.method === "GET") {
        const { jobId } = req.query;

        if (!jobId) return res.status(400).json({ error: "Missing jobId" });

        const result = await db.request()
            .input("jobId", jobId)
            .query(`
        SELECT Skills.id, Skills.name
        FROM JobSkillMapping
        JOIN Skills ON Skills.id = JobSkillMapping.skillId
        WHERE JobSkillMapping.jobId = @jobId
      `);

        return res.status(200).json(result.recordset);
    }

    res.status(405).end();
}
