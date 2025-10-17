import { NextApiRequest, NextApiResponse } from "next";
import pool from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // ---------------- PUT: Update Batch ----------------
    if (req.method === "PUT") {
        try {
            const { id } = req.query;
            const batchId = id as string;
            const { name, employeeCount, employees } = req.body;

            if (!batchId) {
                return res.status(400).json({ error: "Batch ID is required" });
            }
            if (!name || !employeeCount || !employees) {
                return res.status(400).json({
                    error: "Missing required fields: name, employeeCount, employees",
                });
            }

            const employeesWithoutAvatar = employees.map((emp: any) => {
                const { Avatar, ...rest } = emp;
                return rest;
            });

            const checkQuery = `SELECT "Id" FROM "Batch" WHERE "Id" = $1`;
            const checkResult = await pool.query(checkQuery, [batchId]);

            if (checkResult.rowCount === 0) {
                return res.status(404).json({ error: "Batch not found" });
            }

            const updateQuery = `
                UPDATE "Batch"
                SET "Name" = $1,
                    "EmployeeCount" = $2,
                    "Employees" = $3
                WHERE "Id" = $4
                RETURNING "Id", "Name", "CreatedAt", "EmployeeCount", "Employees";
            `;

            const updateValues = [
                name,
                employeeCount,
                JSON.stringify(employeesWithoutAvatar),
                batchId,
            ];

            const updateResult = await pool.query(updateQuery, updateValues);

            if (updateResult.rowCount === 0) {
                return res.status(404).json({ error: "Failed to update batch" });
            }

            const updatedBatch = updateResult.rows[0];
            const parsedEmployees = updatedBatch.Employees
                ? JSON.parse(updatedBatch.Employees)
                : [];

            const responseData = {
                id: updatedBatch.Id,
                name: updatedBatch.Name,
                createdAt: updatedBatch.CreatedAt,
                employeeCount: updatedBatch.EmployeeCount,
                employees: parsedEmployees,
            };

            return res.status(200).json(responseData);
        } catch (error) {
            console.error("Error updating batch:", error);
            return res.status(500).json({
                error: "Internal server error",
                message:
                    error instanceof Error ? error.message : "Unknown error occurred",
            });
        }
    }

    // ---------------- DELETE: Delete Batch ----------------
    if (req.method === "DELETE") {
        try {
            const { id } = req.query;
            const batchId = id as string;

            if (!batchId) {
                return res.status(400).json({ error: "Batch ID is required" });
            }

            const deleteQuery = `DELETE FROM "Batch" WHERE "Id" = $1 RETURNING *`;
            const deleteResult = await pool.query(deleteQuery, [batchId]);

            if (deleteResult.rowCount === 0) {
                return res.status(404).json({ error: "Batch not found" });
            }

            return res.status(200).json({ message: "Batch deleted successfully" });
        } catch (error) {
            console.error("Error deleting batch:", error);
            return res.status(500).json({
                error: "Internal server error",
                message:
                    error instanceof Error ? error.message : "Unknown error occurred",
            });
        }
    }

    if(req.method === "GET") {
        try {
            const { id } = req.query;
            const batchId = id as string;
            if (!batchId) {
                return res.status(400).json({ error: "Batch ID is required" });
            }
            const query = `SELECT * FROM "Batch" WHERE "Id" = $1`;
            const result = await pool.query(query, [batchId]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: "Batch not found" });
            }
            const batch = result.rows[0];
            const employees = batch.Employees ? JSON.parse(batch.Employees) : [];
            return res.status(200).json({
                id: batch.Id,
                name: batch.Name,
                createdAt: batch.CreatedAt,
                employeeCount: batch.EmployeeCount,
                employees: employees,
            });
        } catch (error) {
            console.error("Error fetching batch:", error);
            return res.status(500).json({ error: "Failed to fetch batch" });
        }
    }

    // ---------------- Unsupported Methods ----------------
    return res.status(405).json({
        error: `Method ${req.method} not allowed`,
        allowedMethods: ["PUT", "DELETE", "GET"],
    });
}
