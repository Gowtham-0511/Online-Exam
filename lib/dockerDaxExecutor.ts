async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
    let lastError;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error: any) {
            lastError = error;
            console.log(`Fetch attempt ${i + 1} failed:`, error.message);

            if (error.name === 'AbortError') {
                throw error;
            }

            if (i < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
            }
        }
    }

    throw lastError;
}

export async function runDaxExpression(expression: string, dataset?: any) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const daxServiceUrl = process.env.DAX_SERVICE_URL || "http://dax:5006";

        console.log(`[${new Date().toISOString()}] Executing DAX expression: ${expression}`);

        const response = await fetchWithRetry(
            `${daxServiceUrl}/run-dax`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Connection": "keep-alive"
                },
                body: JSON.stringify({
                    expression,
                    dataset // Support for custom datasets
                }),
                signal: controller.signal,
            },
            2
        );

        clearTimeout(timeoutId);
        const responseText = await response.text();

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
                error: errorData.error || `DAX service error: ${response.statusText}`,
            };
        }

        const data = JSON.parse(responseText);
        return {
            success: data.success ?? true,
            output: data.output ?? "",
            result: data.result,
            error: data.error ?? null,
            executionTime: data.executionTime,
            rowsAffected: data.rowsAffected
        };

    } catch (error: any) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            return {
                success: false,
                output: "",
                error: "Execution timeout: Expression took too long (15s limit)",
            };
        }

        return {
            success: false,
            output: "",
            error: error.message || "Failed to execute DAX expression",
        };
    }
}

export async function getDaxTables() {
    try {
        const daxServiceUrl = process.env.DAX_SERVICE_URL || "http://dax:5006";
        const response = await fetch(`${daxServiceUrl}/tables`, {
            method: "GET",
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch {
        return null;
    }
}

export async function getDaxSampleData() {
    try {
        const daxServiceUrl = process.env.DAX_SERVICE_URL || "http://dax:5006";
        const response = await fetch(`${daxServiceUrl}/sample-data`, {
            method: "GET",
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch {
        return null;
    }
}

export async function getDaxFunctions() {
    try {
        const daxServiceUrl = process.env.DAX_SERVICE_URL || "http://dax:5006";
        const response = await fetch(`${daxServiceUrl}/functions`, {
            method: "GET",
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            return null;
        }

        return await response.json();
    } catch {
        return null;
    }
}

export async function uploadCustomDataset(dataset: any) {
    try {
        const daxServiceUrl = process.env.DAX_SERVICE_URL || "http://dax:5006";
        const response = await fetch(`${daxServiceUrl}/upload-dataset`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(dataset),
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                error: error.message || "Failed to upload dataset"
            };
        }

        return await response.json();
    } catch (error: any) {
        return {
            success: false,
            error: error.message || "Failed to upload dataset"
        };
    }
}

export async function checkDaxServiceHealth(): Promise<boolean> {
    try {
        const daxServiceUrl = process.env.DAX_SERVICE_URL || "http://dax:5006";
        const response = await fetch(`${daxServiceUrl}/health`, {
            method: "GET",
            signal: AbortSignal.timeout(5000)
        });
        return response.ok;
    } catch {
        return false;
    }
}

// Advanced DAX Function Helpers
export const DAX_FUNCTIONS = {
    // Basic Aggregation
    basic: [
        'SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX',
        'COUNTA', 'COUNTBLANK', 'DISTINCTCOUNT'
    ],

    // Iterator Functions (X functions)
    iterators: [
        'SUMX', 'AVERAGEX', 'COUNTX', 'MINX', 'MAXX',
        'RANKX', 'CONCATENATEX'
    ],

    // Filter Functions
    filters: [
        'FILTER', 'CALCULATE', 'CALCULATETABLE',
        'ALL', 'ALLEXCEPT', 'ALLSELECTED',
        'VALUES', 'DISTINCT', 'KEEPFILTERS'
    ],

    // Time Intelligence
    timeIntelligence: [
        'TOTALYTD', 'TOTALQTD', 'TOTALMTD',
        'DATESYTD', 'DATESQTD', 'DATESMTD',
        'SAMEPERIODLASTYEAR', 'PREVIOUSMONTH', 'PREVIOUSQUARTER', 'PREVIOUSYEAR',
        'DATEADD', 'DATESBETWEEN', 'DATESINPERIOD',
        'STARTOFYEAR', 'ENDOFYEAR', 'STARTOFQUARTER', 'ENDOFQUARTER',
        'STARTOFMONTH', 'ENDOFMONTH'
    ],

    // Logical Functions
    logical: [
        'IF', 'IFERROR', 'SWITCH', 'AND', 'OR', 'NOT',
        'TRUE', 'FALSE', 'BLANK'
    ],

    // Information Functions
    information: [
        'ISBLANK', 'ISERROR', 'ISNUMBER', 'ISTEXT',
        'HASONEVALUE', 'HASONEFILTER', 'ISFILTERED',
        'SELECTEDVALUE', 'COUNTROWS'
    ],

    // Relationship Functions
    relationships: [
        'RELATED', 'RELATEDTABLE', 'USERELATIONSHIP',
        'CROSSFILTER'
    ],

    // Text Functions
    text: [
        'CONCATENATE', 'FORMAT', 'LEFT', 'RIGHT', 'MID',
        'LEN', 'TRIM', 'UPPER', 'LOWER', 'SUBSTITUTE'
    ],

    // Date Functions
    date: [
        'DATE', 'YEAR', 'MONTH', 'DAY',
        'TODAY', 'NOW', 'WEEKDAY', 'WEEKNUM',
        'EOMONTH', 'EDATE'
    ],

    // Math Functions
    math: [
        'ABS', 'ROUND', 'ROUNDUP', 'ROUNDDOWN',
        'CEILING', 'FLOOR', 'MOD', 'DIVIDE',
        'POWER', 'SQRT', 'EXP', 'LN', 'LOG', 'LOG10'
    ]
};

export default {
    runDaxExpression,
    getDaxTables,
    getDaxSampleData,
    getDaxFunctions,
    uploadCustomDataset,
    checkDaxServiceHealth,
    DAX_FUNCTIONS
};