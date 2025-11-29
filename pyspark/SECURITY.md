# PySpark Service Security Documentation

## Overview

This PySpark execution service implements comprehensive security measures to prevent malicious code execution and service abuse. The security architecture includes multiple layers of protection:

1. **AST-based Code Validation** - Analyzes code before execution
2. **Rate Limiting** - Prevents service abuse
3. **Resource Limits** - Controls memory and CPU usage
4. **Sandboxed Execution** - Restricts available operations
5. **Input Validation** - Validates all requests

## Security Features

### 1. Code Validation (AST Analysis)

The service uses Python's Abstract Syntax Tree (AST) to analyze code before execution. This catches dangerous operations at parse time.

#### Blocked Operations

**Dangerous Built-in Functions:**

- `eval()`, `exec()`, `compile()` - Code evaluation
- `open()` - File operations
- `__import__()` - Dynamic imports
- `getattr()`, `setattr()`, `delattr()` - Attribute manipulation
- `vars()`, `locals()`, `globals()` - Namespace access

**Dangerous Modules:**

- `os`, `sys` - System operations
- `subprocess` - Process execution
- `socket`, `urllib`, `requests` - Network operations
- `pickle`, `marshal` - Serialization (can execute code)
- `multiprocessing`, `threading` - Concurrency
- `importlib` - Dynamic imports

**File Operations:**

- `open()`, `read()`, `write()`
- `with open()` statements
- Any file I/O operations

#### Allowed Modules

**PySpark Modules:**

- `pyspark`, `pyspark.sql`, `pyspark.sql.functions`
- `pyspark.sql.types`, `pyspark.sql.window`
- `pyspark.ml`, `pyspark.mllib`

**Data Science Libraries:**

- `pandas`, `numpy`
- `datetime`, `time`, `calendar`
- `math`, `random`, `statistics`

**Utilities:**

- `json`, `csv`, `re`, `string`
- `collections`, `itertools`, `functools`
- `decimal`, `fractions`

### 2. Rate Limiting

Redis-based rate limiting prevents service abuse.

**Default Limits:**

- 10 requests per minute per IP
- 100 requests per hour per IP

**Configuration:**
Set via environment variables:

```bash
RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_PER_HOUR=100
```

**Rate Limit Headers:**
Responses include rate limit information:

```
X-RateLimit-Limit-Minute: 10
X-RateLimit-Remaining-Minute: 7
X-RateLimit-Reset-Minute: 45
X-RateLimit-Limit-Hour: 100
X-RateLimit-Remaining-Hour: 85
X-RateLimit-Reset-Hour: 2400
```

**Rate Limit Exceeded:**
When limits are exceeded, the service returns HTTP 429:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 45 seconds.",
  "rate_limit": {
    "retry_after": 45
  }
}
```

### 3. Resource Limits

**Memory Limits:**

- Default: 512 MB per execution
- Configurable via `MAX_MEMORY_MB` environment variable
- Monitored using `psutil`

**Timeout Limits:**

- Default: 15 seconds
- Maximum: 60 seconds
- Configurable per request
- Enforced using signal handlers (Unix) or threading

**Code Complexity Limits:**

- Maximum nesting depth: 10 levels
- Maximum line count: 500 lines
- Maximum functions: 20
- Maximum classes: 5

### 4. Sandboxed Execution

Code runs in a restricted environment with limited built-in functions.

**Allowed Built-ins:**

- Basic types: `int`, `float`, `str`, `bool`, `list`, `dict`, `set`, `tuple`
- Functions: `print`, `len`, `range`, `sum`, `min`, `max`, `sorted`
- Exceptions: `Exception`, `ValueError`, `TypeError`, etc.

**Restricted Access:**

- No access to `__builtins__`
- No access to `__import__`
- No file system access
- No network access
- No subprocess execution

### 5. Input Validation

All requests are validated using Pydantic schemas.

**Request Schema:**

```python
{
  "code": str,        # Required, 1-100000 characters
  "inputs": any,      # Optional test inputs
  "timeout": int      # Optional, 1-60 seconds, default 15
}
```

## API Endpoints

### Execute Code

```
POST /run-pyspark
```

**Request:**

```json
{
  "code": "from pyspark.sql import Row\ndata = [Row(name='Alice', age=25)]\ndf = spark.createDataFrame(data)\ndf.show()",
  "inputs": null,
  "timeout": 15
}
```

**Success Response:**

```json
{
  "success": true,
  "output": "+-----+---+\n| name|age|\n+-----+---+\n|Alice| 25|\n+-----+---+",
  "error": null
}
```

**Security Violation Response:**

```json
{
  "success": false,
  "error": "Security validation failed",
  "violations": ["Dangerous module import detected: os"],
  "message": "Your code contains security violations. Please review and fix them."
}
```

### Health Check

```
GET /health
```

Returns service status and security features.

### Security Information

```
GET /security-info
```

Returns detailed information about security features, allowed modules, and blocked operations.

### Rate Limit Status

```
GET /rate-limit-status
```

Returns current rate limit status for the client.

## Best Practices

### Writing Safe PySpark Code

✅ **DO:**

- Use PySpark DataFrame operations
- Import allowed modules (pandas, numpy, math, etc.)
- Use built-in functions (print, len, sum, etc.)
- Create DataFrames and perform transformations
- Use PySpark SQL functions

❌ **DON'T:**

- Import os, sys, subprocess, socket
- Use eval(), exec(), compile()
- Open files or perform file I/O
- Make network requests
- Execute system commands
- Access private attributes (**import**, **builtins**)

### Example: Valid PySpark Code

```python
from pyspark.sql import Row
from pyspark.sql.functions import col, avg, count
import pandas as pd

# Create sample data
data = [
    Row(name="Alice", age=25, salary=50000),
    Row(name="Bob", age=30, salary=60000),
    Row(name="Charlie", age=35, salary=70000)
]

# Create DataFrame
df = spark.createDataFrame(data)

# Perform operations
result = df.groupBy().agg(
    avg(col("age")).alias("avg_age"),
    avg(col("salary")).alias("avg_salary"),
    count("*").alias("count")
)

result.show()

# Convert to Pandas
pandas_df = result.toPandas()
print(pandas_df)
```

## Troubleshooting

### Common Security Errors

**Error: "Dangerous module import detected: os"**

- **Cause:** Attempting to import a blocked module
- **Solution:** Remove the import and use allowed modules

**Error: "Dangerous function call detected: open()"**

- **Cause:** Attempting file operations
- **Solution:** Use in-memory data structures or test_input parameter

**Error: "Code nesting depth exceeds maximum"**

- **Cause:** Too many nested loops/conditions
- **Solution:** Simplify code structure

**Error: "Rate limit exceeded"**

- **Cause:** Too many requests in short time
- **Solution:** Wait for the retry_after period

**Error: "Execution timeout"**

- **Cause:** Code took too long to execute
- **Solution:** Optimize code or reduce data size

**Error: "Memory limit exceeded"**

- **Cause:** Code used too much memory
- **Solution:** Reduce data size or simplify operations

## Environment Variables

```bash
# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379

# Rate Limiting
RATE_LIMIT_PER_MINUTE=10
RATE_LIMIT_PER_HOUR=100

# Resource Limits
MAX_MEMORY_MB=512

# Flask Configuration
FLASK_ENV=production  # Set to 'development' for detailed errors
```

## Security Headers

All responses include security headers:

- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: default-src 'self'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Request-ID: <unique-id>` - For request tracking

## Monitoring and Logging

All requests are logged with:

- Request ID (for tracking)
- Timestamp
- Client IP
- Request method and path
- Response status code
- Execution duration

**Log Format:**

```
[REQUEST] {'request_id': 'a1b2c3d4e5f6', 'timestamp': '2025-11-28T14:30:00', 'method': 'POST', 'path': '/run-pyspark', 'ip': '192.168.1.1'}
[RESPONSE] {'request_id': 'a1b2c3d4e5f6', 'status_code': 200, 'duration_ms': 125.5}
```

## Testing Security

Run the security test suite:

```bash
cd pyspark
python -m pytest test_security.py -v
```

This will test:

- Code validation (dangerous operations blocked)
- Request validation (invalid requests rejected)
- Allowed operations (safe code passes)
- Security features (comprehensive checks)
