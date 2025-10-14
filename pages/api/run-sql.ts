import { NextApiRequest, NextApiResponse } from "next";
import sql from 'mssql';
import pool from "@/lib/db";
import { decrypt } from '@/lib/encryption';
import { Pool } from 'pg';

const baseConfig: Partial<sql.config> = {
    user: "SysPortalAdmin",
    password: "spa@Systech2o23",
    server: "sysportaldbs.database.windows.net",
    database: "SysRankDB",
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).end("Only POST allowed");

    const { query, examId } = req.body;
    console.log('Received request with body:', req.body);
    if (!query) {
        return res.status(400).json({ error: "Missing query" });
    }

    if (!examId) {
        return res.status(400).json({ error: "Missing examId" });
    }

    let client;

    try {

        client = await pool.connect();

        const result = await client.query(
            'select * from sql_credentials where lower(exam_title) = $1',
            [examId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "SQL credentials not found" });
        }

        const credential = result.rows[0];
        const decryptedPassword = decrypt(credential.password);

        if (credential.server_type === 'postgres') {
            return await executePostgresQuery(query, credential, decryptedPassword, res);
        } else if (credential.server_type === 'ssms') {
            return await executeSqlServerQuery(query, credential, decryptedPassword, res);
        } else {
            return res.status(400).json({ error: "Unknown server type" });
        }
    } catch (err: any) {
        console.error("Error executing SQL:", err);
        return res.status(500).json({ error: err.message || "SQL execution failed" });
    } finally {
        if (client) client.release();
    }
}

async function executeWithDefaultConfig(query: string, res: NextApiResponse) {
    try {
        const config: sql.config = {
            user: "SysPortalAdmin",
            password: "spa@Systech2o23",
            server: "sysportaldbs.database.windows.net",
            database: "SysRankDB",
            options: {
                encrypt: true,
                trustServerCertificate: true,
            },
        } as sql.config;

        const pool = await sql.connect(config);
        const result = await pool.request().query(query);
        await pool.close();

        const columns = result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [];
        const rows = result.recordset;

        return res.status(200).json({ columns, rows });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "SQL execution failed" });
    }
}

async function executePostgresQuery(
    query: string,
    credential: any,
    password: string,
    res: NextApiResponse
) {
    let pgPool;
    try {
        pgPool = new Pool({
            host: credential.host,
            port: credential.port,
            user: credential.username,
            password: password,
            database: credential.database_name,
            connectionTimeoutMillis: 5000,
        });

        const result = await pgPool.query(query);

        const columns = result.fields.map(field => field.name);
        const rows = result.rows;

        await pgPool.end();

        return res.status(200).json({ columns, rows });
    } catch (err: any) {
        if (pgPool) await pgPool.end();
        throw err;
    }
}

async function executeSqlServerQuery(
    query: string,
    credential: any,
    password: string,
    res: NextApiResponse
) {
    let sqlPool;
    try {
        const config: sql.config = {
            user: credential.username,
            password: password,
            server: credential.host,
            port: credential.port,
            database: credential.database_name,
            options: {
                encrypt: true,
                trustServerCertificate: true,
            },
            connectionTimeout: 5000,
        } as sql.config;

        sqlPool = await sql.connect(config);
        const result = await sqlPool.request().query(query);
        await sqlPool.close();

        const columns = result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [];
        const rows = result.recordset;

        return res.status(200).json({ columns, rows });
    } catch (err: any) {
        if (sqlPool) await sqlPool.close();
        throw err;
    }
}