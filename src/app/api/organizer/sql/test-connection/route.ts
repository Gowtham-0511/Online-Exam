import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import sql from "mssql";
import pool from "@/lib/db/db";
import { encrypt } from "@/lib/encryption";
import logger from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serverType, credentials, saveCredentials, examTitle, createdBy } =
      body;

    // Test connection first
    let connectionSuccess = false;

    if (serverType === "postgres") {
      const testPool = new Pool({
        host: credentials.host,
        port: parseInt(credentials.port),
        user: credentials.username,
        password: credentials.password,
        database: credentials.database,
        connectionTimeoutMillis: 5000,
      });

      await testPool.query("SELECT 1");
      await testPool.end();
      connectionSuccess = true;
    } else if (serverType === "ssms") {
      const config = {
        server: credentials.host,
        port: parseInt(credentials.port),
        user: credentials.username,
        password: credentials.password,
        database: credentials.database,
        options: {
          encrypt: true,
          trustServerCertificate: true,
        },
        connectionTimeout: 5000,
      };

      const connection = await sql.connect(config);
      await connection.query("SELECT 1");
      await connection.close();
      connectionSuccess = true;
    }

    if (!connectionSuccess) {
      return NextResponse.json(
        {
          success: false,
          message: "Connection failed",
        },
        { status: 400 }
      );
    }

    // Save credentials if requested
    let credentialId = null;
    if (saveCredentials) {
      let client;
      try {
        client = await pool.connect();
        const encryptedPassword = encrypt(credentials.password);

        const result = await client.query(
          `INSERT INTO sql_credentials 
                    (server_type, host, port, username, password, database_name, exam_title, created_by) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                    RETURNING id`,
          [
            serverType,
            credentials.host,
            parseInt(credentials.port),
            credentials.username,
            encryptedPassword,
            credentials.database,
            examTitle,
            createdBy,
          ]
        );

        credentialId = result.rows[0].id;
      } finally {
        if (client) client.release();
      }
    }

    return NextResponse.json({
      success: true,
      message: `${serverType === "postgres" ? "PostgreSQL" : "SQL Server"
        } connection successful`,
      credentialId,
    });
  } catch (error: any) {
    logger.error("Connection test failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Connection failed",
      },
      { status: 400 }
    );
  }
}
