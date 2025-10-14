import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "POST") {
        try {
            const { name, createdAt, employeeCount, employees } = req.body;

            // Validate required fields
            if (!name || !employeeCount || !employees) {
                return res.status(400).json({
                    error: "Missing required fields: name, employeeCount, employees",
                });
            }

            // Remove Avatar from employees
            const employeesWithoutAvatar = employees.map((emp: any) => {
                const { Avatar, ...rest } = emp;
                return rest;
            });

            const query = `
                INSERT INTO "Batch" ("Name", "EmployeeCount", "Employees", "CreatedAt")
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `;

            const values = [
                name,
                employeeCount,
                JSON.stringify(employeesWithoutAvatar),
                createdAt || new Date(),
            ];

            const result = await pool.query(query, values);

            console.log("Batch created:", result.rows[0]);

            return res.status(201).json(result.rows[0]);
        } catch (error) {
            console.error("Error creating batch:", error);
            return res.status(500).json({
                error: "Internal server error",
                message: error instanceof Error ? error.message : "Unknown error occurred",
            });
        }
    }

    if (req.method === "GET") {
        try {
            const query = `
                SELECT * FROM "Batch"
                ORDER BY "CreatedAt" ASC;
            `;
            const result = await pool.query(query);
            return res.status(200).json(result.rows);
        } catch (error) {
            console.error("Error fetching batches:", error);
            return res.status(500).json({ error: "Failed to fetch Batch" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
