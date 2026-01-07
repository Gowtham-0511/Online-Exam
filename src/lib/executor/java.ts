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
      // console.log(response);
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

export async function runJavaCode(
  code: string,
  inputs?: any,
  functionName?: string
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 40000); // Java needs more time for compilation

  try {
    const javaServiceUrl = process.env.JAVA_SERVICE_URL || "http://java:5003";

    logger.info(
      `[${new Date().toISOString()}] Executing Java code (${code.length} bytes)`
    );

    logger.debug(
      JSON.stringify({
        code,
        inputs,
        function_name: functionName,
      })
    );

    const response = await fetchWithRetry(
      `${javaServiceUrl}/run-java`,
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
          function_name: functionName,
        }),
        signal: controller.signal,
      },
      2
    );

    clearTimeout(timeoutId);
    const responseText = await response.text();

    // console.log(responseText);

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
        error: errorData.error || `Java service error: ${response.statusText}`,
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
        error: "Execution timeout: Code took too long (40s limit)",
      };
    }

    return {
      success: false,
      output: "",
      error: error.message || "Failed to execute Java code",
    };
  }
}

export async function checkJavaServiceHealth(): Promise<boolean> {
  try {
    const javaServiceUrl = process.env.JAVA_SERVICE_URL || "http://java:5003";
    const response = await fetch(`${javaServiceUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export default { runJavaCode, checkJavaServiceHealth };
