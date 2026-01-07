import logger from "@/lib/logger";

async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 2
): Promise<Response> {
    let lastError;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error: any) {
            lastError = error;
            logger.warn(`Fetch attempt ${i + 1} failed: ${error.message}`);

            if (error.name === "AbortError") {
                throw error;
            }

            if (i < maxRetries) {
                await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * Math.pow(2, i))
                );
            }
        }
    }

    throw lastError;
}


export async function executeQuery(query: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
        const snowflakeServiceUrl = process.env.SNOWFLAKE_SERVICE_URL || "http://localhost:5007";
        logger.info(`[${new Date().toISOString()}] Executing Snowflake query (${query.length} bytes)`);

        const parms = JSON.stringify({
            "credentials": {
                "account": "mcb71975.us-west-2",
                "username": "GOWTHAMR",
                "password": "R.gowtham3@prabha",
                "warehouse": "COMPUTE_WH",
                "database": "SYSRANK",
                "schema": "SYRSCHEMA",
                "role": "SYSADMIN"
            },
            "query": query,
        });

        const response = await fetchWithRetry(`${snowflakeServiceUrl}/execute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Connection: "keep-alive",
            },
            body: parms,
            signal: controller.signal,
        }, 2);

        clearTimeout(timeoutId);
        const responseText = await response.text();

        logger.debug("Response from Snowflake service: %s", responseText);

        if (!response.ok) {
            let errorData;
            try {
                errorData = JSON.parse(responseText);
            } catch {
                errorData = { error: responseText };
            }

            return {
                success: false,
                output: "",
                error: errorData.error || `Snowflake service error: ${response.statusText}`,
            };
        }

        const data = JSON.parse(responseText);

        // Transform the response to match expected format
        // The Snowflake service returns { success, rows, rowCount, columns, executionTime }
        // We need to convert rows to a JSON string for output
        let output = "";

        if (data.success && data.rows) {
            // Snowflake returns column names in UPPERCASE, but test cases expect lowercase
            // Transform all keys to lowercase
            const transformedRows = data.rows.map((row: any) => {
                const lowercaseRow: any = {};
                for (const key in row) {
                    lowercaseRow[key.toLowerCase()] = row[key];
                }
                return lowercaseRow;
            });

            // Convert rows array to JSON string
            output = JSON.stringify(transformedRows);
        } else if (data.output) {
            // Fallback to output field if it exists
            output = data.output;
        }

        return {
            success: data.success ?? true,
            output: output,
            error: data.error ?? null,
        };
    } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === "AbortError") {
            return {
                success: false,
                output: "",
                error: "Execution timeout: Code took too long (30s limit)",
            };
        }

        return {
            success: false,
            output: "",
            error: error.message || "Failed to execute Snowflake query",
        };
    }
}
