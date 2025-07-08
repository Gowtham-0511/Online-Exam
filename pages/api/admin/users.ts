// import { NextApiRequest, NextApiResponse } from "next";
// import { getDBConnection } from "../../../lib/database";

// export default function handler(req: NextApiRequest, res: NextApiResponse) {
//     if (req.method !== "GET") return res.status(405).end();

//     try {
//         const pool = getDBConnection();
//         const stmt =  pool.request().query("SELECT * FROM users ORDER BY created_at DESC");
//         const users = stmt.all();
//         res.status(200).json(users);
//     } catch (err) {
//         console.error("Error fetching users:", err);
//         res.status(500).json({ error: "Failed to fetch users" });
//     }
// }

// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getDBConnection } from "../../../lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const pool = await getDBConnection();
    const result = await pool.request().query('SELECT * FROM users ORDER BY created_at DESC');

    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('DB Error:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
}

