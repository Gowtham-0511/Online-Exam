import { Pool, types } from "pg";
import sql from "mssql";
import logger from "@/lib/logger";

// Configure pg to return bigint and numeric as numbers
// This is safe for most practice scenarios and prevents type mismatch in test cases
types.setTypeParser(20, (val) => parseInt(val, 10));
types.setTypeParser(1700, (val) => parseFloat(val));

export interface SqlExecutionOptions {
  query: string;
  serverType: "postgres" | "ssms";
  credentials: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
  timeout?: number;
}

export interface SqlExecutionResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  executionTime: number;
  success: boolean;
  error?: string;
}

export class DockerSqlExecutor {
  private readonly DEFAULT_TIMEOUT = 25000; // 25 seconds
  private readonly MAX_ROWS = 10000; // Limit result size

  // Execute SQL query in isolated connection
  async execute(options: SqlExecutionOptions): Promise<SqlExecutionResult> {
    const startTime = Date.now();

    try {
      if (options.serverType === "postgres") {
        return await this.executePostgres(options, startTime);
      } else if (options.serverType === "ssms") {
        return await this.executeSqlServer(options, startTime);
      } else {
        throw new Error("Unknown server type");
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      let errorMessage = error.message;
      if (error.message.includes("timeout")) {
        errorMessage =
          "⏱️ Query timeout: Your query is taking too long to execute";
      } else if (error.message.includes("syntax")) {
        errorMessage = "❌ SQL Syntax Error: " + error.message;
      } else if (error.message.includes("permission")) {
        errorMessage =
          "🚫 Permission denied: You cannot perform this operation";
      }

      logger.error(`❌ SQL execution failed:`, errorMessage);

      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime,
        success: false,
        error: errorMessage,
      };
    }
  }

  // Execute PostgreSQL query
  private async executePostgres(
    options: SqlExecutionOptions,
    startTime: number
  ): Promise<SqlExecutionResult> {
    let pool: Pool | null = null;

    try {
      // Create isolated connection pool
      pool = new Pool({
        host: options.credentials.host,
        port: options.credentials.port,
        user: options.credentials.username,
        password: options.credentials.password,
        database: options.credentials.database,
        max: 5,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 10000,
        statement_timeout: options.timeout || this.DEFAULT_TIMEOUT,
      });

      logger.info(`🟢 Executing PostgreSQL query...`);
      logger.debug(`Query: ${options.query.substring(0, 200)}...`); // Log first 200 chars

      // Split queries by semicolon
      const queries = options.query
        .split(";")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);

      let result: any = null;
      let columns: string[] = [];
      let rows: any[] = [];

      // Execute each query
      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        const isLast = i === queries.length - 1;

        logger.debug(
          `  Executing statement ${i + 1}/${queries.length}: ${query.substring(
            0,
            50
          )}...`
        );

        // Add row limit only to last SELECT/WITH query
        const finalQuery =
          isLast && (query.toLowerCase().startsWith("select") || query.toLowerCase().startsWith("with"))
            ? this.addRowLimit(query, this.MAX_ROWS)
            : query;

        result = await pool.query(finalQuery);

        // Only get results from the last SELECT/WITH query
        if (isLast && (query.toLowerCase().startsWith("select") || query.toLowerCase().startsWith("with"))) {
          columns = result.fields.map((field: { name: any }) => field.name);
          rows = result.rows;
        }
      }

      await pool.end();

      const executionTime = Date.now() - startTime;
      logger.info(
        `✅ PostgreSQL query completed in ${executionTime}ms, ${rows.length} rows`
      );

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTime,
        success: true,
      };
    } catch (error: any) {
      logger.error("PostgreSQL Error Details:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
      });

      if (pool) await pool.end();
      throw error;
    }
  }

  // Execute SQL Server query
  private async executeSqlServer(
    options: SqlExecutionOptions,
    startTime: number
  ): Promise<SqlExecutionResult> {
    let sqlPool: sql.ConnectionPool | null = null;

    try {
      const config: sql.config = {
        user: options.credentials.username,
        password: options.credentials.password,
        server: options.credentials.host,
        port: options.credentials.port,
        database: options.credentials.database,
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
        },
        connectionTimeout: 5000,
        requestTimeout: options.timeout || this.DEFAULT_TIMEOUT,
        pool: {
          max: 5,
          min: 0,
          idleTimeoutMillis: 10000,
        },
      };

      logger.info(`🔷 Executing SQL Server query...`);

      sqlPool = await sql.connect(config);

      // Execute query with row limit
      const limitedQuery = this.addRowLimit(options.query, this.MAX_ROWS);
      const result = await sqlPool.request().query(limitedQuery);

      await sqlPool.close();

      const executionTime = Date.now() - startTime;
      const columns =
        result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [];
      const rows = result.recordset;

      logger.info(
        `✅ SQL Server query completed in ${executionTime}ms, ${rows.length} rows`
      );

      return {
        columns,
        rows,
        rowCount: rows.length,
        executionTime,
        success: true,
      };
    } catch (error: any) {
      if (sqlPool) await sqlPool.close();
      throw error;
    }
  }

  // Add row limit to query (security measure)
  private addRowLimit(query: string, limit: number): string {
    const normalizedQuery = query.trim().toLowerCase();

    // If query already has LIMIT/TOP, don't modify
    if (normalizedQuery.includes("limit") || normalizedQuery.includes("top")) {
      return query;
    }

    // Add appropriate limit based on query type
    if (normalizedQuery.startsWith("select") || normalizedQuery.startsWith("with")) {
      // PostgreSQL style (also used as default for WITH)
      if (query.includes("pg_") || !normalizedQuery.includes("top") || normalizedQuery.startsWith("with")) {
        return `${query.trim()} LIMIT ${limit}`;
      }
      // SQL Server style - inject TOP
      return query.trim().replace(/^select\s+/i, `SELECT TOP ${limit} `);
    }

    return query;
  }

  // Validate query (prevent dangerous operations)
  validateQuery(query: string): { valid: boolean; error?: string } {
    const normalizedQuery = query.trim().toLowerCase();

    const statements = normalizedQuery
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s);

    if (statements.length === 0) {
      return { valid: false, error: "Empty query" };
    }

    const dangerousKeywords = [
      "truncate",
      "delete",
      "alter",
      "grant",
      "revoke",
      "exec",
      "execute",
    ];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const isLastStatement = i === statements.length - 1;

      // Check for dangerous keywords
      for (const keyword of dangerousKeywords) {
        if (statement.includes(keyword)) {
          return {
            valid: false,
            error: `Forbidden operation: ${keyword.toUpperCase()} is not allowed`,
          };
        }
      }

      // Last statement must be SELECT or WITH
      if (isLastStatement && !(statement.startsWith("select") || statement.startsWith("with"))) {
        return {
          valid: false,
          error: "Main query must be a SELECT statement",
        };
      }

      // Non-last statements can be DROP, CREATE, INSERT, SELECT, WITH or SET
      if (!isLastStatement) {
        const allowedPrefixes = [
          "create",
          "insert",
          "drop",
          "select",
          "with",
          "set"
        ];

        const hasAllowedPrefix = allowedPrefixes.some(prefix => statement.startsWith(prefix));

        if (!hasAllowedPrefix) {
          return {
            valid: false,
            error:
              "Setup statements must be SELECT, INSERT, CREATE, DROP, WITH or SET only",
          };
        }
      }
    }

    return { valid: true };
  }

  // Get connection stats
  async getConnectionStats(serverType: "postgres" | "ssms", credentials: any) {
    try {
      if (serverType === "postgres") {
        const pool = new Pool({
          host: credentials.host,
          port: credentials.port,
          user: credentials.username,
          password: credentials.password,
          database: credentials.database,
          max: 1,
        });

        const result = await pool.query(
          `
                    SELECT count(*) as connection_count 
                    FROM pg_stat_activity 
                    WHERE datname = $1
                `,
          [credentials.database]
        );

        await pool.end();

        return {
          activeConnections: parseInt(result.rows[0].connection_count),
          serverType,
        };
      } else {
        const pool = await sql.connect({
          user: credentials.username,
          password: credentials.password,
          server: credentials.host,
          port: credentials.port,
          database: credentials.database,
          options: { encrypt: true, trustServerCertificate: true },
        });

        const result = await pool.request().query(`
                    SELECT COUNT(*) as connection_count 
                    FROM sys.dm_exec_sessions 
                    WHERE database_id = DB_ID()
                `);

        await pool.close();

        return {
          activeConnections: result.recordset[0].connection_count,
          serverType,
        };
      }
    } catch (error) {
      logger.error("Failed to get connection stats:", error);
      return { activeConnections: -1, serverType };
    }
  }
}

export default new DockerSqlExecutor();
