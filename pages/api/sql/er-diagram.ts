import type { NextApiRequest, NextApiResponse } from 'next';
import pool from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import { Pool } from 'pg';
import sql from 'mssql';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { examId } = req.query;

    if (!examId || typeof examId !== 'string') {
        return res.status(400).json({ message: 'examId is required' });
    }

    let client;
    try {
        client = await pool.connect();

        // First, get the sqlCredentialId from the Assessment table
        const assessmentResult = await client.query(
            'SELECT "sqlCredentialId" FROM "Assessment" WHERE title = $1',
            [examId]
        );

        if (assessmentResult.rows.length === 0) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const sqlCredentialId = assessmentResult.rows[0].sqlCredentialId;

        if (!sqlCredentialId) {
            return res.status(404).json({ message: 'No SQL credentials configured for this exam' });
        }

        // Now fetch the credential using the ID
        const result = await client.query(
            'SELECT * FROM sql_credentials WHERE id = $1',
            [sqlCredentialId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Credentials not found' });
        }

        const credential = result.rows[0];
        const decryptedPassword = decrypt(credential.password);

        let schemaData;
        let relationships;

        if (credential.server_type === 'postgres') {
            const data = await getPostgresSchema(credential, decryptedPassword);
            schemaData = data.tables;
            relationships = data.relationships;
        } else if (credential.server_type === 'ssms') {
            const data = await getSqlServerSchema(credential, decryptedPassword);
            schemaData = data.tables;
            relationships = data.relationships;
        } else {
            return res.status(400).json({ message: 'Unknown server type' });
        }

        return res.status(200).json({
            schemaData,
            relationships,
            serverType: credential.server_type
        });

    } catch (error: any) {
        console.error('Error getting schema:', error);
        return res.status(500).json({
            message: 'Failed to get schema',
            error: error.message
        });
    } finally {
        if (client) client.release();
    }
}

// Keep all the existing helper functions unchanged
async function getPostgresSchema(credential: any, password: string) {
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

        const tablesQuery = `
            SELECT 
                t.table_name,
                c.column_name,
                c.data_type,
                c.character_maximum_length,
                c.is_nullable,
                c.column_default,
                c.ordinal_position,
                CASE 
                    WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
                    WHEN fk.column_name IS NOT NULL THEN 'FOREIGN KEY'
                    ELSE NULL
                END as constraint_type
            FROM information_schema.tables t
            LEFT JOIN information_schema.columns c 
                ON t.table_name = c.table_name AND t.table_schema = c.table_schema
            LEFT JOIN (
                SELECT ku.table_name, ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku
                    ON tc.constraint_name = ku.constraint_name
                WHERE tc.constraint_type = 'PRIMARY KEY'
                    AND tc.table_schema = 'public'
            ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
            LEFT JOIN (
                SELECT ku.table_name, ku.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage ku
                    ON tc.constraint_name = ku.constraint_name
                WHERE tc.constraint_type = 'FOREIGN KEY'
                    AND tc.table_schema = 'public'
            ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
            WHERE t.table_schema = 'public' 
                AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name, c.ordinal_position;
        `;

        const relationshipsQuery = `
            SELECT
                tc.table_name as from_table,
                kcu.column_name as from_column,
                ccu.table_name as to_table,
                ccu.column_name as to_column,
                tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public';
        `;

        const tablesResult = await pgPool.query(tablesQuery);
        const relationshipsResult = await pgPool.query(relationshipsQuery);

        await pgPool.end();

        const tables = tablesResult.rows.reduce((acc: any, row: any) => {
            if (!acc[row.table_name]) {
                acc[row.table_name] = {
                    table_name: row.table_name,
                    columns: []
                };
            }
            acc[row.table_name].columns.push({
                column_name: row.column_name,
                data_type: row.data_type + (row.character_maximum_length ? `(${row.character_maximum_length})` : ''),
                is_nullable: row.is_nullable === 'YES',
                column_default: row.column_default,
                constraint_type: row.constraint_type,
                ordinal_position: row.ordinal_position
            });
            return acc;
        }, {});

        return {
            tables: Object.values(tables),
            relationships: relationshipsResult.rows
        };

    } catch (error) {
        if (pgPool) await pgPool.end();
        throw error;
    }
}

async function getSqlServerSchema(credential: any, password: string) {
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

        const tablesQuery = `
            SELECT 
                t.TABLE_NAME as table_name,
                c.COLUMN_NAME as column_name,
                c.DATA_TYPE as data_type,
                c.CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
                c.IS_NULLABLE as is_nullable,
                c.COLUMN_DEFAULT as column_default,
                c.ORDINAL_POSITION as ordinal_position,
                CASE 
                    WHEN pk.COLUMN_NAME IS NOT NULL THEN 'PRIMARY KEY'
                    WHEN fk.COLUMN_NAME IS NOT NULL THEN 'FOREIGN KEY'
                    ELSE NULL
                END as constraint_type
            FROM INFORMATION_SCHEMA.TABLES t
            LEFT JOIN INFORMATION_SCHEMA.COLUMNS c 
                ON t.TABLE_NAME = c.TABLE_NAME
            LEFT JOIN (
                SELECT ku.TABLE_NAME, ku.COLUMN_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS ku
                    ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
                WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
            LEFT JOIN (
                SELECT ku.TABLE_NAME, ku.COLUMN_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS ku
                    ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
                WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
            ) fk ON c.TABLE_NAME = fk.TABLE_NAME AND c.COLUMN_NAME = fk.COLUMN_NAME
            WHERE t.TABLE_TYPE = 'BASE TABLE'
            ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION;
        `;

        const relationshipsQuery = `
            SELECT 
                fk.name as constraint_name,
                tp.name as from_table,
                cp.name as from_column,
                tr.name as to_table,
                cr.name as to_column
            FROM sys.foreign_keys fk
            INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
            INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
            INNER JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
            INNER JOIN sys.columns cp ON fkc.parent_column_id = cp.column_id AND fkc.parent_object_id = cp.object_id
            INNER JOIN sys.columns cr ON fkc.referenced_column_id = cr.column_id AND fkc.referenced_object_id = cr.object_id;
        `;

        const tablesResult = await sqlPool.request().query(tablesQuery);
        const relationshipsResult = await sqlPool.request().query(relationshipsQuery);

        await sqlPool.close();

        const tables = tablesResult.recordset.reduce((acc: any, row: any) => {
            if (!acc[row.table_name]) {
                acc[row.table_name] = {
                    table_name: row.table_name,
                    columns: []
                };
            }
            acc[row.table_name].columns.push({
                column_name: row.column_name,
                data_type: row.data_type + (row.character_maximum_length ? `(${row.character_maximum_length})` : ''),
                is_nullable: row.is_nullable === 'YES',
                column_default: row.column_default,
                constraint_type: row.constraint_type,
                ordinal_position: row.ordinal_position
            });
            return acc;
        }, {});

        return {
            tables: Object.values(tables),
            relationships: relationshipsResult.recordset
        };

    } catch (error) {
        if (sqlPool) await sqlPool.close();
        throw error;
    }
}