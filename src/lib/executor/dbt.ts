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

export async function runDbtCommand(
  command: string,
  models?: Record<string, string>,
  seeds?: Record<string, string>,
  useCache: boolean = false
) {
  const controller = new AbortController();
  // DBT runs can be slow, so we give it more time (60s)
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const dbtServiceUrl = process.env.DBT_SERVICE_URL || "http://dbt:5004";

    logger.info(
      `[${new Date().toISOString()}] Executing DBT command: ${command}`
    );

    const response = await fetchWithRetry(
      `${dbtServiceUrl}/run-dbt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Connection: "keep-alive",
        },
        body: JSON.stringify({
          command,
          models,
          seeds,
          use_cache: useCache,
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
        error: errorData.error || `DBT service error: ${response.statusText}`,
      };
    }

    const data = JSON.parse(responseText);
    return {
      success: data.success ?? true,
      output: data.output ?? "",
      logs: data.logs ?? [],
      artifacts: data.artifacts ?? {},
      error: data.error ?? null,
      cached: data.cached ?? false,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      return {
        success: false,
        output: "",
        error: "Execution timeout: DBT command took too long (60s limit)",
      };
    }

    return {
      success: false,
      output: "",
      error: error.message || "Failed to execute DBT command",
    };
  }
}

export async function validateDbtModel(models: Record<string, string>) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const dbtServiceUrl = process.env.DBT_SERVICE_URL || "http://dbt:5004";

    const response = await fetchWithRetry(
      `${dbtServiceUrl}/validate-model`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          models,
        }),
        signal: controller.signal,
      },
      2
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        valid: false,
        error: `Validation failed: ${response.statusText}`,
      };
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    return {
      valid: false,
      error: error.message || "Failed to validate DBT model",
    };
  }
}

export async function getDbtHealth(): Promise<boolean> {
  try {
    const dbtServiceUrl = process.env.DBT_SERVICE_URL || "http://dbt:5004";
    const response = await fetch(`${dbtServiceUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getDbtInfo() {
  try {
    const dbtServiceUrl = process.env.DBT_SERVICE_URL || "http://dbt:5004";
    const response = await fetch(`${dbtServiceUrl}/dbt-info`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export default {
  runDbtCommand,
  validateDbtModel,
  getDbtHealth,
  getDbtInfo,
};
