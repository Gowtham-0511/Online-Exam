import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const db = await getDBConnection();

    const totalResult = await db.query(`SELECT COUNT(*) AS total FROM Submissions`);
    const disqResult = await db.query(`SELECT COUNT(*) AS disqualified FROM Submissions WHERE disqualified = 1`);

    const total = totalResult.recordset[0]?.total || 0;
    const disqualified = disqResult.recordset[0]?.disqualified || 0;
    const percentage = total > 0 ? Math.round((disqualified / total) * 100) : 0;

    res.status(200).json({ total, disqualified, percentage });
  } catch (err) {
    console.error("Error fetching disqualification rate:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
}
