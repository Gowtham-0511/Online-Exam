// import { NextApiRequest, NextApiResponse } from "next";
// import { getDBConnection } from "@/lib/database";

// export default async function handler(req: NextApiRequest, res: NextApiResponse) {
//     // Handle only POST requests
//     if (req.method === 'POST') {
//         try {
//             const { assessmentId, batchIds, startTime, endTime } = req.body;

//             const db = await getDBConnection();

//             // Verify assessment exists
//             const verifyAssessment = await db
//                 .request()
//                 .input("id", assessmentId)
//                 .query(`
//                     SELECT * FROM Assessment WHERE id = @id
//                 `);

//             if (!verifyAssessment.recordset || verifyAssessment.recordset.length === 0) {
//                 return res.status(404).json({
//                     error: 'Assessment not found',
//                     message: `Assessment with ID ${assessmentId} does not exist`
//                 });
//             }

//             // Verify batches exist - create a NEW request object
//             const placeholders = batchIds.map((_: any, i: any) => `@id${i}`).join(",");
//             const batchRequest = db.request(); // New request object

//             batchIds.forEach((id: any, i: any) => {
//                 batchRequest.input(`id${i}`, id);
//             });

//             const verifyBatch = await batchRequest.query(`
//                 SELECT * FROM Batch WHERE id IN (${placeholders})
//             `);

//             if (!verifyBatch.recordset || verifyBatch.recordset.length === 0) {
//                 return res.status(404).json({
//                     error: 'Batch not found',
//                     message: 'One or more specified batches do not exist'
//                 });
//             }

//             // Extract employees from batches
//             const employees = verifyBatch.recordset.flatMap((batch: any) => JSON.parse(batch.Employees));
//             const emails = employees.map((emp: any) => emp.Email);

//             console.log('Extracted emails:', emails);

//             // Update assessment with parameterized query - create ANOTHER new request object
//             const updateRequest = db.request();
//             updateRequest.input('assessmentId', assessmentId);
//             updateRequest.input('allowedUsers', JSON.stringify(emails));
//             updateRequest.input('startTime', startTime);
//             updateRequest.input('endTime', endTime);

//             const updateQuery = `
//                 UPDATE Assessment
//                 SET allowedUsers = @allowedUsers, 
//                     startTime = @startTime, 
//                     endTime = @endTime,
//                     isBatchUpdated = 1
//                 WHERE id = @assessmentId
//             `;

//             const result = await updateRequest.query(updateQuery);

//             console.log('Update result:', result);

//             return res.status(200).json({
//                 success: true,
//                 message: "Exam scheduled successfully",
//                 data: {
//                     assessmentId,
//                     batchIds,
//                     startTime,
//                     endTime,
//                     affectedRows: result.rowsAffected[0]
//                 }
//             });

//         } catch (error) {
//             console.error("Error scheduling exam:", error);

//             return res.status(500).json({
//                 success: false,
//                 message: "Failed to schedule exam",
//                 error: error instanceof Error ? error.message : "Unknown error"
//             });
//         }
//     } else {
//         res.setHeader('Allow', ['POST']);
//         return res.status(405).json({
//             success: false,
//             message: `Method ${req.method} not allowed`
//         });
//     }
// }

import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";
import sql from "mssql";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { assessmentId, batchIds, startTime, endTime } = req.body;

            const db = await getDBConnection();

            const verifyAssessment = await db
                .request()
                .input("id", assessmentId)
                .query(`
                    SELECT * FROM Assessment WHERE id = @id
                `);

            if (!verifyAssessment.recordset || verifyAssessment.recordset.length === 0) {
                return res.status(404).json({
                    error: 'Assessment not found',
                    message: `Assessment with ID ${assessmentId} does not exist`
                });
            }

            const placeholders = batchIds.map((_: any, i: any) => `@id${i}`).join(",");
            const batchRequest = db.request();

            batchIds.forEach((id: any, i: any) => {
                batchRequest.input(`id${i}`, id);
            });

            const verifyBatch = await batchRequest.query(`
                SELECT * FROM Batch WHERE id IN (${placeholders})
            `);

            if (!verifyBatch.recordset || verifyBatch.recordset.length === 0) {
                return res.status(404).json({
                    error: 'Batch not found',
                    message: 'One or more specified batches do not exist'
                });
            }

            if (verifyBatch.recordset.length !== batchIds.length) {
                return res.status(404).json({
                    error: 'Some batches not found',
                    message: 'One or more specified batches do not exist'
                });
            }

            let insertedCount = 0;
            for (const batchId of batchIds) {
                try {
                    const insertRequest = db.request();
                    insertRequest.input('assessmentId', sql.Int, assessmentId);
                    insertRequest.input('batchId', sql.Int, batchId);
                    insertRequest.input('startTime', sql.DateTime, new Date(startTime));
                    insertRequest.input('endTime', sql.DateTime, new Date(endTime));

                    await insertRequest.query(`
                        INSERT INTO AssessmentBatchMapping (assessmentId, batchId, startTime, endTime)
                        VALUES (@assessmentId, @batchId, @startTime, @endTime)
                    `);

                    insertedCount++;
                } catch (insertError) {
                    console.error(`Error inserting mapping for batch ${batchId}:`, insertError);
                }
            }

            console.log(`Successfully created ${insertedCount} mappings`);

            return res.status(200).json({
                success: true,
                message: "Exam scheduled successfully",
                data: {
                    assessmentId,
                    batchIds,
                    startTime,
                    endTime,
                    mappingsCreated: insertedCount
                }
            });

        } catch (error) {
            console.error("Error scheduling exam:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to schedule exam",
                error: error instanceof Error ? error.message : "Unknown error"
            });
        }
    } else {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({
            success: false,
            message: `Method ${req.method} not allowed`
        });
    }
}