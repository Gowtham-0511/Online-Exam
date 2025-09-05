import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { id, name, createdAt, employeeCount, employees } = req.body;

            // Validate required fields
            if (!name || !employeeCount || !employees) {
                return res.status(400).json({
                    error: 'Missing required fields: name, employeeCount, employees'
                });
            }

            const db = await getDBConnection();

            interface Employee {
                id: string;
                name: string;
                Avatar?: string;
                [key: string]: any;
            }

            interface EmployeeWithoutAvatar extends Omit<Employee, 'Avatar'> { }

            const employeesWithoutAvatar: EmployeeWithoutAvatar[] = employees.map((employee: Employee): EmployeeWithoutAvatar => {
                const { Avatar, ...employeeWithoutAvatar } = employee;
                return employeeWithoutAvatar;
            });

            const request = db.request();
            request.input('name', name);
            request.input('employeeCount', employeeCount);
            request.input('employees', JSON.stringify(employeesWithoutAvatar));

            const result = await request.query(`
                INSERT INTO Batch (Name, EmployeeCount, Employees) 
                VALUES (@name, @employeeCount, @employees)
            `);

            console.log(result);

            const newBatch = {
                id: id,
                name: name,
                createdAt: createdAt,
                employeeCount: employeeCount,
                employees: employeesWithoutAvatar
            };

            return res.status(201).json(newBatch);

        } catch (error) {
            console.error('Error creating batch:', error);

            // Send error response
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    }

    if (req.method === 'GET') {
        try {
            const db = await getDBConnection();

            const result = await db.query(`
                SELECT * FROM Batch ORDER BY CreatedAt
            `);

            res.status(200).json(result.recordset);
        } catch (error) {
            console.error("Error fetching batch:", error);
            res.status(500).json({ error: "Failed to fetch Batch" });
        }
    }
    
}