import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'PUT') {
        try {
            const { query } = req;
            const batchId = query.id as string;
            const { name, employeeCount, employees } = req.body;

            // Validate required fields
            if (!name || !employeeCount || !employees) {
                return res.status(400).json({
                    error: 'Missing required fields: name, employeeCount, employees'
                });
            }

            // Validate batch ID
            if (!batchId) {
                return res.status(400).json({
                    error: 'Batch ID is required'
                });
            }

            const db = await getDBConnection();

            interface Employee {
                Id: string;
                Name: string;
                Avatar?: string;
                [key: string]: any;
            }

            interface EmployeeWithoutAvatar extends Omit<Employee, 'Avatar'> { }

            const employeesWithoutAvatar: EmployeeWithoutAvatar[] = employees.map((employee: Employee): EmployeeWithoutAvatar => {
                const { Avatar, ...employeeWithoutAvatar } = employee;
                return employeeWithoutAvatar;
            });

            // First, check if the batch exists
            const checkRequest = db.request();
            checkRequest.input('batchId', batchId);

            const checkResult = await checkRequest.query(`
                SELECT Id FROM Batch WHERE Id = @batchId
            `);

            if (checkResult.recordset.length === 0) {
                return res.status(404).json({
                    error: 'Batch not found'
                });
            }

            // Update the batch
            const updateRequest = db.request();
            updateRequest.input('batchId', batchId);
            updateRequest.input('name', name);
            updateRequest.input('employeeCount', employeeCount);
            updateRequest.input('employees', JSON.stringify(employeesWithoutAvatar));

            const updateResult = await updateRequest.query(`
                UPDATE Batch 
                SET Name = @name, 
                    EmployeeCount = @employeeCount, 
                    Employees = @employees
                WHERE Id = @batchId
            `);

            console.log('Update result:', updateResult);

            // Fetch the updated batch to return
            const fetchRequest = db.request();
            fetchRequest.input('batchId', batchId);

            const fetchResult = await fetchRequest.query(`
                SELECT Id, Name, CreatedAt, EmployeeCount, Employees 
                FROM Batch 
                WHERE Id = @batchId
            `);

            if (fetchResult.recordset.length === 0) {
                return res.status(404).json({
                    error: 'Updated batch not found'
                });
            }

            const updatedBatch = fetchResult.recordset[0];

            // Parse employees JSON and convert to camelCase
            const parsedEmployees = updatedBatch.Employees ? JSON.parse(updatedBatch.Employees) : [];

            const responseData = {
                id: updatedBatch.Id,
                name: updatedBatch.Name,
                createdAt: updatedBatch.CreatedAt,
                employeeCount: updatedBatch.EmployeeCount,
                employees: parsedEmployees
            };

            return res.status(200).json(responseData);

        } catch (error) {
            console.error('Error updating batch:', error);

            // Send error response
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    }

    // Handle DELETE method for future use
    if (req.method === 'DELETE') {
        try {
            const { query } = req;
            const batchId = query.id as string;

            if (!batchId) {
                return res.status(400).json({
                    error: 'Batch ID is required'
                });
            }

            const db = await getDBConnection();

            const deleteRequest = db.request();
            deleteRequest.input('batchId', batchId);

            const deleteResult = await deleteRequest.query(`
                DELETE FROM Batch WHERE Id = @batchId
            `);

            if (deleteResult.rowsAffected[0] === 0) {
                return res.status(404).json({
                    error: 'Batch not found'
                });
            }

            return res.status(200).json({
                message: 'Batch deleted successfully'
            });

        } catch (error) {
            console.error('Error deleting batch:', error);
            return res.status(500).json({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    }

    // Handle unsupported methods
    return res.status(405).json({
        error: `Method ${req.method} not allowed`,
        allowedMethods: ['PUT', 'DELETE']
    });
}