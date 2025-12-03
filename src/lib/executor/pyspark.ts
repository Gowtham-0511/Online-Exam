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
      console.log(`Fetch attempt ${i + 1} failed:`, error.message);

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

export async function runPySparkCode(code: string, inputs?: any) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const pysparkServiceUrl =
      process.env.PYSPARK_SERVICE_URL || "http://pyspark:5005";

    console.log(
      `[${new Date().toISOString()}] Executing PySpark code (${
        code.length
      } bytes)`
    );

    const response = await fetchWithRetry(
      `${pysparkServiceUrl}/run-pyspark`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Connection: "keep-alive",
        },
        body: JSON.stringify({
          code,
          inputs,
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
        error:
          errorData.error || `PySpark service error: ${response.statusText}`,
      };
    }

    const data = JSON.parse(responseText);
    return {
      success: data.success ?? true,
      output: data.output ?? "",
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
      error: error.message || "Failed to execute PySpark code",
    };
  }
}

export async function checkPySparkServiceHealth(): Promise<boolean> {
  try {
    const pysparkServiceUrl =
      process.env.PYSPARK_SERVICE_URL || "http://pyspark:5005";
    const response = await fetch(`${pysparkServiceUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default { runPySparkCode, checkPySparkServiceHealth };
