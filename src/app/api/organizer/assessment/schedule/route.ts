import pool from "@/lib/db/db";
import { NextResponse } from "next/server";
import logger from "@/lib/logger";
import { sendEmail } from "@/lib/email";
import path from "path";

export async function POST(request: Request) {
  const body = await request.json();
  const { assessmentId, batchSchedules, userSchedules } = body;

  if (!assessmentId) {
    return NextResponse.json(
      {
        error: "Missing required fields: assessmentId",
      },
      { status: 400 }
    );
  }

  if (
    (!batchSchedules || batchSchedules.length === 0) &&
    (!userSchedules || userSchedules.length === 0)
  ) {
    return NextResponse.json(
      { error: "No schedules provided" },
      { status: 400 }
    );
  }

  try {
    // Fetch Assessment Title to include in the email
    const assessmentRes = await pool.query(
      `SELECT "title" FROM "Assessment" WHERE "id" = $1`,
      [assessmentId]
    );
    const assessmentTitle =
      assessmentRes.rows.length > 0
        ? assessmentRes.rows[0].title
        : "Assessment";

    const emailMap = new Map<string, { name: string; start: any; end: any }>();

    if (batchSchedules && batchSchedules.length > 0) {
      await pool.query(
        `DELETE FROM "AssessmentBatchMapping" WHERE "assessmentId" = $1`,
        [assessmentId]
      );

      const batchInsertQuery = `
        INSERT INTO "AssessmentBatchMapping" (
            "assessmentId", "batchId", "startTime", "endTime"
        )
        VALUES ($1, $2, $3, $4)
      `;

      for (const schedule of batchSchedules) {
        await pool.query(batchInsertQuery, [
          assessmentId,
          schedule.batchId,
          schedule.startTime
            ? new Date(schedule.startTime).toISOString()
            : null,
          schedule.endTime ? new Date(schedule.endTime).toISOString() : null,
        ]);

        // Fetch emails from the batch
        const batchRes = await pool.query(
          `SELECT "Employees" FROM "Batch" WHERE "Id" = $1`,
          [schedule.batchId]
        );
        if (batchRes.rows.length > 0 && batchRes.rows[0].Employees) {
          try {
            const employees = JSON.parse(batchRes.rows[0].Employees);
            if (Array.isArray(employees)) {
              employees.forEach((emp: any) => {
                const email = emp.Email || emp.email;
                if (email) {
                  emailMap.set(email, {
                    name: emp.Name || emp.name || "Candidate",
                    start: schedule.startTime,
                    end: schedule.endTime,
                  });
                }
              });
            }
          } catch (e) {
            logger.error(
              "Error parsing employees JSON for batch %s",
              schedule.batchId,
              e
            );
          }
        }
      }
    }

    if (userSchedules && userSchedules.length > 0) {
      await pool.query(
        `DELETE FROM "AssessmentUserMapping" WHERE "assessmentId" = $1`,
        [assessmentId]
      );

      const userInsertQuery = `
        INSERT INTO "AssessmentUserMapping" (
            "assessmentId", "userEmail", startTime, endTime, "createdAt"
        )
        VALUES ($1, $2, $3, $4, $5)
      `;

      for (const schedule of userSchedules) {
        await pool.query(userInsertQuery, [
          assessmentId,
          schedule.userEmail,
          schedule.startTime
            ? new Date(schedule.startTime).toISOString()
            : null,
          schedule.endTime ? new Date(schedule.endTime).toISOString() : null,
          new Date().toISOString(),
        ]);
        if (schedule.userEmail) {
          const existing = emailMap.get(schedule.userEmail);
          emailMap.set(schedule.userEmail, {
            name: existing?.name || "Candidate",
            start: schedule.startTime,
            end: schedule.endTime,
          });
        }
      }
    }

    // Send emails
    if (emailMap.size > 0) {
      const logoPath = path.join(process.cwd(), "public", "syslogo.png");
      const attachments = [
        {
          filename: "syslogo.png",
          path: logoPath,
          cid: "syslogo", // same cid value as in the html img src
        },
      ];
      const failedEmails: string[] = [];
      const emails = Array.from(emailMap.entries());

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

      // Process emails in batches to avoid concurrent connection limits
      const BATCH_SIZE = 3;
      for (let i = 0; i < emails.length; i += BATCH_SIZE) {
        const batch = emails.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async ([email, details]) => {
          const startDateStr = details.start
            ? new Date(details.start).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })
            : 'Available now';

          const endDateStr = details.end
            ? new Date(details.end).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            })
            : 'No deadline';

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
                                            Hello ${details.name},<br><br>
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
          } catch (error) {
            logger.error(`Failed to send email to ${email}`, error);
            failedEmails.push(email);
          }
        }));

        // Add a small delay between batches
        if (i + BATCH_SIZE < emails.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    // @ts-ignore
    return NextResponse.json({ status: 201, failedEmails: typeof failedEmails !== 'undefined' ? failedEmails : [] });

  } catch (error) {
    logger.error("Error scheduling assessment %s:", assessmentId, error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
