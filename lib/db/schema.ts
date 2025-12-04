import pool from "../db";

// Fetch database schema
export async function fetchDatabaseSchema(): Promise<string> {
  let client;
  try {
    console.log("Attempting to connect to database...");
    client = await pool.connect();
    console.log("Database connected successfully");

    const query = `
            SELECT 
                t.table_name,
                json_agg(
                    json_build_object(
                        'column_name', c.column_name,
                        'data_type', c.data_type,
                        'is_nullable', c.is_nullable
                    ) ORDER BY c.ordinal_position
                ) as columns,
                (
                    SELECT json_agg(
                        json_build_object(
                            'constraint_name', tc.constraint_name,
                            'constraint_type', tc.constraint_type,
                            'column_name', kcu.column_name,
                            'foreign_table', ccu.table_name,
                            'foreign_column', ccu.column_name
                        )
                    )
                    FROM information_schema.table_constraints tc
                    LEFT JOIN information_schema.key_column_usage kcu 
                        ON tc.constraint_name = kcu.constraint_name
                    LEFT JOIN information_schema.constraint_column_usage ccu
                        ON tc.constraint_name = ccu.constraint_name
                    WHERE tc.table_name = t.table_name
                        AND tc.table_schema = 'public'
                        AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
                ) as constraints
            FROM information_schema.tables t
            JOIN information_schema.columns c ON t.table_name = c.table_name
            WHERE t.table_schema = 'public'
                AND t.table_type = 'BASE TABLE'
            GROUP BY t.table_name
            ORDER BY t.table_name;
        `;

    const result = await client.query(query);
    console.log(`Fetched schema for ${result.rows.length} tables`);

    // Format schema as readable text
    let schemaText = "DATABASE SCHEMA:\n\n";
    result.rows.forEach((table) => {
      schemaText += `Table: ${table.table_name}\n`;
      schemaText += `Columns:\n`;
      table.columns.forEach((col: any) => {
        schemaText += `  - ${col.column_name} (${col.data_type}, ${
          col.is_nullable === "YES" ? "nullable" : "not null"
        })\n`;
      });
      if (table.constraints) {
        schemaText += `Constraints:\n`;
        table.constraints.forEach((constraint: any) => {
          if (constraint.constraint_type === "FOREIGN KEY") {
            schemaText += `  - ${constraint.column_name} -> ${constraint.foreign_table}(${constraint.foreign_column})\n`;
          } else {
            schemaText += `  - ${constraint.constraint_type}: ${constraint.column_name}\n`;
          }
        });
      }
      schemaText += `\n`;
    });

    return schemaText;
  } catch (error: any) {
    console.error("Error fetching database schema:", error.message);
    console.error("Error details:", {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
    });
    // Return empty string so question generation continues without schema
    return "";
  } finally {
    if (client) {
      client.release();
    }
  }
}
