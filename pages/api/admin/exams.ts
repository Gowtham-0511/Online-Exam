import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "../../../lib/database";

// export default function handler(req: NextApiRequest, res: NextApiResponse) {
//     if (req.method !== "GET") return res.status(405).end();

//     try {
//         const db = getDatabase();
//         const stmt = db.prepare("SELECT * FROM exams ORDER BY createdAt DESC");
//         const exams = stmt.all().map((e) => ({
//             ...(typeof e === "object" && e !== null ? e : {}),
//             questions: JSON.parse((e && typeof e === "object" ? (e as any).questions : undefined) || "[]"),
//         }));
//         res.status(200).json(exams);
//     } catch (err) {
//         console.error("Error fetching exams:", err);
//         res.status(500).json({ error: "Failed to fetch exams" });
//     }
// }



export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const pool = await getDBConnection();

    // Query SQL Server
    const result = await pool
      .request()
      .query('SELECT * FROM exams ORDER BY createdAt DESC');

    // Parse and map the results
    const exams = result.recordset.map((e) => ({
      ...e,
      questions: JSON.parse(e?.questions || '[]'),
    }));

    res.status(200).json(exams);
  } catch (error) {
    console.error('Error fetching exams:', error);
    res.status(500).json({ error: 'Failed to fetch exams' });
  }
}

