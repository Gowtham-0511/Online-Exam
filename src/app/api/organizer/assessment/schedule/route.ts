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

    const emailSet = new Set<string>();

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
                  emailSet.add(email);
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
          emailSet.add(schedule.userEmail);
        }
      }
    }

    // Send emails
    if (emailSet.size > 0) {
      const logoPath = path.join(process.cwd(), "public", "syslogo.png");
      const attachments = [
        {
          filename: "syslogo.png",
          path: logoPath,
          cid: "syslogo", // same cid value as in the html img src
        },
      ];

      const emailPromises = Array.from(emailSet).map((email) => {
        return sendEmail(
          email,
          `New Assessment Scheduled: ${assessmentTitle}`,
          `
<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>Assessment Scheduled</title>
    <style>
        /* Base Reset */
        body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
        img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        
        /* Light Mode Variables (Default inline) */
        /* Dark Mode Overrides */
        @media (prefers-color-scheme: dark) {
            .body-bg { background-color: #18181B !important; }
            .container-bg { background-color: #0f172a !important; border-color: #27272A !important; }
            .header-bg { background-color: #0f172a !important; } /* Keep dark header in dark mode */
            .text-primary { color: #f1f5f9 !important; }
            .text-secondary { color: #94a3b8 !important; }
            .card-bg { background-color: #1e293b !important; border-color: #334155 !important; }
            .card-label { color: #94a3b8 !important; }
            .card-value { color: #f1f5f9 !important; }
            .btn-bg { background-color: #3b82f6 !important; }
            .footer-bg { background-color: #0f172a !important; border-top-color: #334155 !important; }
        }

        /* Outlook-specific Dark Mode */
        [data-ogsc] .body-bg { background-color: #18181B !important; }
        [data-ogsc] .container-bg { background-color: #0f172a !important; border-color: #27272A !important; }
        [data-ogsc] .text-primary { color: #f1f5f9 !important; }
        [data-ogsc] .text-secondary { color: #94a3b8 !important; }
        [data-ogsc] .card-bg { background-color: #1e293b !important; border-color: #334155 !important; }
        [data-ogsc] .card-value { color: #f1f5f9 !important; }
    </style>
</head>
<body class="body-bg" style="background-color: #f4f4f7; margin: 0; padding: 0;">
    <div style="padding: 40px 20px;">
        <!-- Container -->
        <div class="container-bg" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e1e1e1;">
            
            <!-- Header -->
            <div class="header-bg" style="background-color: #0f172a; padding: 40px 20px; text-align: center;">
                 <img src="cid:syslogo" alt="SysRank" style="height: 60px; width: auto; display: block; margin: 0 auto; max-width: 200px;" />
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">
                <h1 class="text-primary" style="font-size: 24px; font-weight: 700; color: #0f172a; margin: 0 0 20px 0; text-align: center;">You've been scheduled for an assessment</h1>
                
                <p class="text-secondary" style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
                    Hello,
                    <br><br>
                    A new assessment has been assigned to you by your organization. Please find the details below:
                </p>
                
                <!-- Card -->
                <div class="card-bg" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 30px; text-align: center;">
                    <span class="card-label" style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">Assessment Title</span>
                    <span class="card-value" style="font-size: 20px; color: #0f172a; font-weight: 600; display: block;">${assessmentTitle}</span>
                </div>

                <p class="text-secondary" style="font-size: 16px; line-height: 1.6; color: #334155; margin-bottom: 30px;">
                    The assessment is now available on your dashboard. Please log in to view the scheduled time and instructions.
                </p>

                <!-- Button -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <a href="https://sysrank.systechusa.com/" class="btn-bg" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
                        View Dashboard
                    </a>
                </div>
                
                <p class="text-secondary" style="font-size: 16px; color: #334155; margin: 0; text-align: center;">
                    Good luck!<br>
                    <strong>The SysRank Team</strong>
                </p>
            </div>

            <!-- Footer -->
            <div class="footer-bg" style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                    &copy; ${new Date().getFullYear()} SysRank. All rights reserved.<br>
                    This is an automated message, please do not reply.
                </p>
            </div>
        </div>
    </div>
</body>
</html>
          `,
          attachments
        );
      });

      // We process emails in background or wait?
      // Given it's an API route, better to wait or fire and forget.
      // Promise.allSettled avoids one failure stopping others.
      await Promise.allSettled(emailPromises);
    }

    return NextResponse.json({ status: 201 });

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
