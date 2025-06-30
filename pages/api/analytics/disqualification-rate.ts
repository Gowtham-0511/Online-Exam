import { NextApiRequest, NextApiResponse } from "next";
import { getDatabase } from "../../../lib/database";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const db = getDatabase();

    const totalStmt = db.prepare("SELECT COUNT(*) as total FROM submissions");
    const disqStmt = db.prepare("SELECT COUNT(*) as disqualified FROM submissions WHERE disqualified = 1");

    const total = (totalStmt.get() as { total: number }).total;
    const disqualified = (disqStmt.get() as { disqualified: number }).disqualified;

    const percentage = total > 0 ? Math.round((disqualified / total) * 100) : 0;

    return res.status(200).json({ total, disqualified, percentage });
  } catch (err) {
    console.error("Error fetching disqualification rate:", err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
}
