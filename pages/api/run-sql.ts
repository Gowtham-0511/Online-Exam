import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import sql from 'mssql';

const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN!;
const DATABRICKS_HOST = process.env.DATABRICKS_HOSTNAME!;
const WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID!;

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

    const { query, database } = req.body;

    if (!query || !database) {
        return res.status(400).json({ error: "Missing query or database" });
    }

    try {

        const config: sql.config = {
            ...baseConfig,
            database,
        } as sql.config;

        const pool = await sql.connect(config);
        const result = await pool.request().query(query);

        // console.log(result.recordset);

        const columns = result.recordset.length > 0 ? Object.keys(result.recordset[0]) : []
        const rows = result.recordset

        console.log(columns);
        console.log(rows);


        // // Step 1: Create a SQL execution request
        // const response = await axios.post(
        //     `${DATABRICKS_HOST}/api/2.0/sql/statements`,
        //     {
        //         statement: query,
        //         warehouse_id: WAREHOUSE_ID,
        //         format: "JSON",
        //     },
        //     {
        //         headers: {
        //             Authorization: `Bearer ${DATABRICKS_TOKEN}`,
        //             "Content-Type": "application/json",
        //         },
        //     }
        // );

        // const statementId = response.data.statement_id;

        // // Step 2: Poll for result
        // const pollResult = async (): Promise<any> => {
        //     const result = await axios.get(
        //         `${DATABRICKS_HOST}/api/2.0/sql/statements/${statementId}`,
        //         {
        //             headers: {
        //                 Authorization: `Bearer ${DATABRICKS_TOKEN}`,
        //             },
        //         }
        //     );

        //     if (result.data.status.state === "SUCCEEDED") {
        //         return result.data;
        //     } else if (["FAILED", "CANCELED"].includes(result.data.status.state)) {
        //         throw new Error(`Query ${result.data.status.state}: ${result.data.status.error?.message}`);
        //     }

        //     // Wait and retry
        //     await new Promise((resolve) => setTimeout(resolve, 1000));
        //     return pollResult();
        // };

        // const finalResult = await pollResult();

        // // console.log("Final Result:", finalResult);

        // const rows = finalResult.result.data_array;
        // const columns = finalResult.manifest.schema.columns.map((col: any) => col.name);

        // console.log("Columns:", columns);
        // console.log("Rows:", rows);

        return res.status(200).json({ columns, rows });
    } catch (err: any) {
        return res.status(500).json({ error: err.message || "Databricks SQL failed" });
    }
}