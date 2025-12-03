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

      // Don't retry on abort
      if (error.name === "AbortError") {
        throw error;
      }

      // Wait before retry (exponential backoff)
      if (i < maxRetries) {
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
      }
    }
  }

  throw lastError;
}

export async function runPythonCode(code: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const pythonServiceUrl =
      process.env.PYTHON_SERVICE_URL || "http://localhost:5000";

    console.log(
      `[${new Date().toISOString()}] Executing Python code (${
        code.length
      } bytes)`
    );

    const response = await fetchWithRetry(
      `${pythonServiceUrl}/run-python`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Connection: "keep-alive",
        },
        body: JSON.stringify({ code }),
        signal: controller.signal,
      },
      2 // 2 retries
    );

    clearTimeout(timeoutId);

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        `[${new Date().toISOString()}] Python service error: ${response.status}`
      );

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
          errorData.error || `Python service error: ${response.statusText}`,
      };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        "Failed to parse response:",
        responseText.substring(0, 200)
      );
      return {
        success: false,
        output: responseText,
        error: "Invalid JSON response from Python service",
      };
    }

    console.log(`[${new Date().toISOString()}] Python execution successful`);

    return {
      success: data.success ?? true,
      output: data.output ?? "",
      error: data.error ?? data.stderr ?? null,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === "AbortError") {
      console.error(`[${new Date().toISOString()}] Execution timeout`);
      return {
        success: false,
        output: "",
        error: "Execution timeout: Code took too long (30s limit)",
      };
    }

    console.error(`[${new Date().toISOString()}] Python execution error:`, {
      message: error.message,
      code: error.cause?.code,
      socket: error.cause?.socket
        ? {
            localPort: error.cause.socket.localPort,
            remotePort: error.cause.socket.remotePort,
            bytesWritten: error.cause.socket.bytesWritten,
            bytesRead: error.cause.socket.bytesRead,
          }
        : undefined,
    });

    let errorMessage = "Failed to execute Python code";

    if (error.cause?.code === "UND_ERR_SOCKET") {
      errorMessage =
        "Python service connection closed. The code may have caused a crash or timeout.";
    } else if (error.cause?.code === "ECONNREFUSED") {
      errorMessage = "Python service is not available";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      output: "",
      error: errorMessage,
    };
  }
}

export async function checkPythonServiceHealth(): Promise<boolean> {
  try {
    const pythonServiceUrl =
      process.env.PYTHON_SERVICE_URL || "http://localhost:5000";
    const response = await fetch(`${pythonServiceUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
