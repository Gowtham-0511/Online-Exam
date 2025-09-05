import { NextApiRequest, NextApiResponse } from "next";
import { getDBConnection } from "@/lib/database";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {

        const db = await getDBConnection();

        const databaseQuery = `
            SELECT name as database_name 
            FROM sys.databases 
            WHERE database_id > 4
            AND state = 0
            ORDER BY name
        `;

        const databaseResult = await db.query(databaseQuery);
        const databases = [];

        for (const dbt of databaseResult.recordset) {
            const dbName = dbt.database_name;

            // console.log(dbName);

            try {
                const tablesQuery = `
                    USE [SysRank];

                    SELECT 
                        t.TABLE_NAME,
                        c.COLUMN_NAME,
                        c.DATA_TYPE,
                        c.CHARACTER_MAXIMUM_LENGTH,
                        c.IS_NULLABLE,
                        c.COLUMN_DEFAULT,
                        CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 'YES' ELSE 'NO' END AS IS_PRIMARY_KEY
                    FROM INFORMATION_SCHEMA.TABLES t
                    LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME
                    LEFT JOIN (
                        SELECT ku.TABLE_NAME, ku.COLUMN_NAME
                        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                        INNER JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
                            ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
                        WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
                    ) pk ON c.TABLE_NAME = pk.TABLE_NAME AND c.COLUMN_NAME = pk.COLUMN_NAME
                    WHERE t.TABLE_TYPE = 'BASE TABLE'
                    ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
                `;

                const tablesResult = await db.request().query(tablesQuery);

                const tablesMap = new Map();

                tablesResult.recordset.forEach(row => {
                    const tableName = row.TABLE_NAME;

                    if (!tablesMap.has(tableName)) {
                        tablesMap.set(tableName, {
                            name: tableName,
                            columns: []
                        });
                    }

                    const table = tablesMap.get(tableName);

                    let columnType = row.DATA_TYPE.toUpperCase();
                    if (row.CHARACTER_MAXIMUM_LENGTH) {
                        columnType += `(${row.CHARACTER_MAXIMUM_LENGTH})`;
                    }
                    if (row.IS_PRIMARY_KEY === 'YES') {
                        columnType += ' PRIMARY KEY';
                    }
                    if (row.IS_NULLABLE === 'NO' && row.IS_PRIMARY_KEY === 'NO') {
                        columnType += ' NOT NULL';
                    }

                    table.columns.push({
                        name: row.COLUMN_NAME,
                        type: columnType,
                        nullable: row.IS_NULLABLE === 'YES',
                        defaultValue: row.COLUMN_DEFAULT,
                        isPrimaryKey: row.IS_PRIMARY_KEY === 'YES'
                    });
                });

                databases.push({
                    // name: dbName,
                    name: 'SysRank',
                    tables: Array.from(tablesMap.values())
                });
            } catch (error) {
                console.error(`Error fetching schema for database ${dbName}:`, error);
            }
        }

        res.status(200).json({ databases });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch database schema' });
    }
}