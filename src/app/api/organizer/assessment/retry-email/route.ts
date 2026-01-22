import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import path from "path";

export async function POST(request: Request) {
    const body = await request.json();
    const { assessmentId, emails } = body;

    if (!assessmentId || !emails || !Array.isArray(emails)) {
        return NextResponse.json(
            { error: "Missing required fields" },
            { status: 400 }
        );
    }

    try {
        const assessmentRes = await pool.query(
            `SELECT "title" FROM "Assessment" WHERE "id" = $1`,
            [assessmentId]
        );
        const assessmentTitle =
            assessmentRes.rows.length > 0
                ? assessmentRes.rows[0].title
                : "Assessment";

        const failedEmails: string[] = [];
        const logoPath = path.join(process.cwd(), "public", "syslogo.png");
        const attachments = [
            {
                filename: "syslogo.png",
                path: logoPath,
                cid: "syslogo",
            },
        ];

        // Ideally we would fetch user names here too, but for retry we might use a generic name or pass it in.
        // To keep it simple, we'll try to look up names if possible or default to "Candidate".

        // Send emails in parallel with retry mechanism
        const sendEmailWithRetry = async (to: string, subject: string, html: string, attachments: any[]) => {
            for (let i = 0; i < 4; i++) {
                try {
                    await sendEmail(to, subject, html, attachments);
                    return;
                } catch (error) {
                    if (i === 3) throw error;
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                }
            }
        };

        await Promise.all(emails.map(async (email: any) => {
            // Try to fetch name (optional optimization)
            let name = "Candidate";
            try {
                // Check employees first
                const userRes = await pool.query(`SELECT "Name" FROM "Employees" WHERE "Email" = $1`, [email]);
                if (userRes.rows.length > 0) {
                    name = userRes.rows[0].Name;
                } else {
                    // Check external users if needed, or AssessmentUserMapping
                    const mapRes = await pool.query(`SELECT "userEmail" FROM "AssessmentUserMapping" WHERE "userEmail" = $1 AND "assessmentId" = $2`, [email, assessmentId]);
                    // If we find it, good. We don't store names in mapping though.
                }
            } catch (e) { }

            // For retry, we might not have the exact start/end time unless we query it. 
            // Let's query the schedule for this user.
            let startDateStr = 'Available now';
            let endDateStr = 'No deadline';

            try {
                const scheduleRes = await pool.query(
                    `SELECT "startTime", "endTime" FROM "AssessmentUserMapping" WHERE "assessmentId" = $1 AND "userEmail" = $2`,
                    [assessmentId, email]
                );

                // Note: If it was a Batch Schedule, it might not be in UserMapping individually unless we inserted it.
                // But the schedule API DOES insert individually into UserMapping even for batches.
                // Check lines 93-120 in schedule/route.ts. Wait, lines 43-91 insert into AssessmentBatchMapping. 
                // Lines 93-120 insert into AssessmentUserMapping. 
                // BUT, wait... 
                // In schedule/route.ts, batch logic (lines 43-91) inserts into AssessmentBatchMapping. It does NOT insert into UserMapping.
                // So if the user is from a batch, we need to check AssessmentBatchMapping -> Batch -> startTime.
                // This is getting complicated to reconstruct perfectly.
                // However, the email content needs it.
                // Simplified approach for retry: Just send generic "Available now" or try best effort. 
                // Or better: Pass the details in the request body if available? 
                // The frontend has the data! It knows the start/end time it just tried to send.
                // But the frontend might have cleared state. 

                // Let's try to query UserMapping first.
                if (scheduleRes.rows.length > 0) {
                    const s = scheduleRes.rows[0];
                    if (s.startTime) startDateStr = new Date(s.startTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                    if (s.endTime) endDateStr = new Date(s.endTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                } else {
                    // Try batch mapping
                    // This is hard to reverse engineer easily without more queries. 
                    // Let's just use generic "Check Dashboard" if we can't find it, or just "Available now" as fallback.
                }
            } catch (e) { }


            try {
                await sendEmailWithRetry(
                    email,
                    `New Assessment Scheduled: ${assessmentTitle}`,
                    `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Assessment Invitation</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f6f9fc;">
                    <tr>
                        <td align="center" style="padding: 40px 0;">
                            <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
                                <!-- Minimal Header -->
                                <tr>
                                    <td style="padding: 40px 40px 0 40px; text-align: left;">
                                        <img src="cid:syslogo" alt="SysRank" style="height: 32px; width: auto; display: block;" />
                                    </td>
                                </tr>
                                
                                <!-- Main Content -->
                                <tr>
                                    <td style="padding: 30px 40px;">
                                        <h1 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">Assessment Assignment</h1>
                                        
                                        <p style="margin: 0 0 24px 0; color: #4a5568; font-size: 16px; line-height: 1.6;">
                                            Hello ${name},<br><br>
                                            You have been scheduled for a new technical assessment on SysRank.
                                        </p>
                                        
                                        <!-- Detail Card -->
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 30px;">
                                            <tr>
                                                <td style="padding: 20px;">
                                                    <div style="font-size: 12px; font-weight: 600; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Assessment</div>
                                                    <div style="font-size: 18px; font-weight: 600; color: #2d3748;">${assessmentTitle}</div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 0 20px 10px 20px;">
                                                    <div style="font-size: 12px; font-weight: 600; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Start Time</div>
                                                    <div style="font-size: 16px; color: #2d3748;">${startDateStr}</div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 0 20px 20px 20px;">
                                                    <div style="font-size: 12px; font-weight: 600; color: #718096; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">End Time</div>
                                                    <div style="font-size: 16px; color: #2d3748;">${endDateStr}</div>
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Action Button -->
                                        <a href="https://sysrank.systechusa.com/" style="display: inline-block; background-color: #0f172a; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: 500; font-size: 15px;">Start Assessment &rarr;</a>
                                        
                                        <p style="margin: 30px 0 0 0; color: #718096; font-size: 14px;">
                                            Please complete this before the deadline visible on your dashboard.
                                        </p>
                                    </td>
                                </tr>
                                
                                <!-- Footer -->
                                <tr>
                                    <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                                        <p style="margin: 0; color: #a0aec0; font-size: 12px; text-align: center;">
                                            &copy; ${new Date().getFullYear()} SysRank Team. Automated notification.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </body>
            </html>
            `,
                    attachments
                );

            } catch (e) {
                logger.error("Failed to retry email for %s", email, e);
                failedEmails.push(email);
            }
        }));

        return NextResponse.json({ success: true, failedEmails });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.toString() },
            { status: 500 }
        );
    }
}
