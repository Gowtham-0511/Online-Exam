# PySpark Security Testing Guide - Postman

This guide provides step-by-step instructions for testing the PySpark security features using Postman.

## Setup

**Base URL:** `http://localhost:5005`

Make sure the PySpark service is running:

```bash
docker-compose up -d pyspark
```

---

## Test Cases for Postman

### 1. Health Check ✅

**Test:** Verify service is running with security features

**Method:** `GET`  
**URL:** `http://localhost:5005/health`  
**Headers:** None required

**Expected Response (200 OK):**

```json
{
  "status": "healthy",
  "service": "PySpark/Databricks Executor (Secured)",
  "spark_version": "3.5.1",
  "security_features": [
    "AST-based code validation",
    "Rate limiting",
    "Resource limits",
    "Sandboxed execution"
  ],
  "message": "PySpark Executor is running 🚀🔒"
}
```

---

### 2. Security Information ℹ️

**Test:** Get detailed security configuration

**Method:** `GET`  
**URL:** `http://localhost:5005/security-info`  
**Headers:** None required

**Expected Response (200 OK):**

```json
{
  "security_features": {
    "code_validation": {
      "enabled": true,
      "type": "AST-based analysis",
      "checks": [...]
    },
    "rate_limiting": {
      "enabled": true,
      "limits": {
        "per_minute": 10,
        "per_hour": 100
      }
    },
    "allowed_modules": [...],
    "dangerous_operations": {...}
  }
}
```

---

### 3. Valid PySpark Code ✅

**Test:** Execute safe PySpark code successfully

**Method:** `POST`  
**URL:** `http://localhost:5005/run-pyspark`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "code": "from pyspark.sql import Row\ndata = [Row(name='Alice', age=25), Row(name='Bob', age=30)]\ndf = spark.createDataFrame(data)\ndf.show()",
  "timeout": 15
}
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "output": "+-----+---+\n| name|age|\n+-----+---+\n|Alice| 25|\n|  Bob| 30|\n+-----+---+\n",
  "error": null
}
```

**Check Response Headers:**

- `X-RateLimit-Remaining-Minute` (should be 9 after first request)
- `X-Request-ID` (unique identifier)

---

### 4. Dangerous Import - Blocked 🚫

**Test:** Verify dangerous module imports are blocked

**Method:** `POST`  
**URL:** `http://localhost:5005/run-pyspark`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "code": "import os\nos.system('ls')",
  "timeout": 15
}
```

**Expected Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Security validation failed",
  "violations": ["Dangerous module import detected: os"],
  "message": "Your code contains security violations. Please review and fix them."
}
```

---

### 5. File Operations - Blocked 🚫

**Test:** Verify file operations are blocked

**Method:** `POST`  
**URL:** `http://localhost:5005/run-pyspark`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "code": "with open('/etc/passwd', 'r') as f:\n    data = f.read()\n    print(data)",
  "timeout": 15
}
```

**Expected Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Security validation failed",
  "violations": ["File operation detected: open()"],
  "message": "Your code contains security violations. Please review and fix them."
}
```

---

### 6. eval() Function - Blocked 🚫

**Test:** Verify eval() is blocked

**Method:** `POST`  
**URL:** `http://localhost:5005/run-pyspark`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "code": "result = eval('1 + 1')\nprint(result)",
  "timeout": 15
}
```

**Expected Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Security validation failed",
  "violations": ["Dangerous function call detected: eval()"],
  "message": "Your code contains security violations. Please review and fix them."
}
```

---

### 7. Subprocess Execution - Blocked 🚫

**Test:** Verify subprocess execution is blocked

**Method:** `POST`  
**URL:** `http://localhost:5005/run-pyspark`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "code": "import subprocess\nsubprocess.call(['ls', '-la'])",
  "timeout": 15
}
```

**Expected Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Security validation failed",
  "violations": ["Dangerous module import detected: subprocess"],
  "message": "Your code contains security violations. Please review and fix them."
}
```

---

### 8. Network Operations - Blocked 🚫

**Test:** Verify network operations are blocked

**Method:** `POST`  
**URL:** `http://localhost:5005/run-pyspark`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "code": "import requests\nresponse = requests.get('http://example.com')\nprint(response.text)",
  "timeout": 15
}
```

**Expected Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Security validation failed",
  "violations": ["Dangerous module import detected: requests"],
  "message": "Your code contains security violations. Please review and fix them."
}
```

---

### 9. Pandas Code - Allowed ✅

**Test:** Verify pandas operations are allowed

**Method:** `POST`  
**URL:** `http://localhost:5005/run-pyspark`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "code": "import pandas as pd\nimport numpy as np\ndf = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})\nprint(df.sum())",
  "timeout": 15
}
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "output": "a     6\nb    15\ndtype: int64\n",
  "error": null
}
```

---

### 10. Code Size Limit - Blocked 🚫

**Test:** Verify oversized code is rejected

**Method:** `POST`  
**URL:** `http://localhost:5005/run-pyspark`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "code": "x = 1\n# Repeat this line 100,000 times to exceed limit",
  "timeout": 15
}
```

**Note:** Generate a very large code string (>100KB) to test this

**Expected Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Security validation failed",
  "violations": ["Code size exceeds maximum limit (100KB)"],
  "message": "Your code contains security violations. Please review and fix them."
}
```

---

### 11. Invalid Request - Missing Code 🚫

**Test:** Verify request validation works

**Method:** `POST`  
**URL:** `http://localhost:5005/run-pyspark`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "timeout": 15
}
```

**Expected Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Validation error",
  "message": "Request data is invalid",
  "details": ["code: Field required"]
}
```

---

### 12. Invalid Timeout - Blocked 🚫

**Test:** Verify timeout validation

**Method:** `POST`  
**URL:** `http://localhost:5005/run-pyspark`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "code": "print('test')",
  "timeout": 100
}
```

**Expected Response (400 Bad Request):**

```json
{
  "success": false,
  "error": "Validation error",
  "message": "Request data is invalid",
  "details": ["timeout: Input should be less than or equal to 60"]
}
```

---

### 13. Rate Limit Test 🚫

**Test:** Verify rate limiting works

**Method:** `POST`  
**URL:** `http://localhost:5005/run-pyspark`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "code": "print('test')",
  "timeout": 15
}
```

**Instructions:**

1. Send this request **11 times rapidly** (within 1 minute)
2. First 10 requests should succeed (200 OK)
3. 11th request should fail with rate limit error

**Expected Response on 11th Request (429 Too Many Requests):**

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in 45 seconds.",
  "rate_limit": {
    "limit_minute": 10,
    "limit_hour": 100,
    "remaining_minute": 0,
    "remaining_hour": 90,
    "retry_after": 45
  }
}
```

**Check Response Headers:**

- `X-RateLimit-Remaining-Minute: 0`
- `X-RateLimit-Reset-Minute: <seconds>`

---

### 14. Rate Limit Status Check ℹ️

**Test:** Check current rate limit status

**Method:** `GET`  
**URL:** `http://localhost:5005/rate-limit-status`  
**Headers:** None required

**Expected Response (200 OK):**

```json
{
  "identifier": "127.0.0.1",
  "limit_minute": 10,
  "limit_hour": 100,
  "used_minute": 5,
  "used_hour": 5,
  "remaining_minute": 5,
  "remaining_hour": 95,
  "reset_minute": 45,
  "reset_hour": 2400
}
```

---

### 15. Complex PySpark Query ✅

**Test:** Execute a complex but safe PySpark query

**Method:** `POST`  
**URL:** `http://localhost:5005/run-pyspark`  
**Headers:**

```
Content-Type: application/json
```

**Body (raw JSON):**

```json
{
  "code": "from pyspark.sql import Row\nfrom pyspark.sql.functions import col, avg, count\n\n# Create sample data\ndata = [\n    Row(name='Alice', age=25, salary=50000),\n    Row(name='Bob', age=30, salary=60000),\n    Row(name='Charlie', age=35, salary=70000)\n]\n\n# Create DataFrame\ndf = spark.createDataFrame(data)\n\n# Perform aggregation\nresult = df.groupBy().agg(\n    avg(col('age')).alias('avg_age'),\n    avg(col('salary')).alias('avg_salary'),\n    count('*').alias('count')\n)\n\nresult.show()",
  "timeout": 20
}
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "output": "+-------+----------+-----+\n|avg_age|avg_salary|count|\n+-------+----------+-----+\n|   30.0|   60000.0|    3|\n+-------+----------+-----+\n",
  "error": null
}
```

---

## Postman Collection Setup

### Create a Collection

1. Open Postman
2. Click "New" → "Collection"
3. Name it "PySpark Security Tests"
4. Add a variable:
   - Variable: `base_url`
   - Initial Value: `http://localhost:5005`

### Add Environment

1. Click "Environments" → "Create Environment"
2. Name: "PySpark Local"
3. Add variable:
   - `base_url` = `http://localhost:5005`

### Organize Tests

Create folders in your collection:

- ✅ **Valid Requests** (Tests 1, 2, 3, 9, 15)
- 🚫 **Security Blocks** (Tests 4, 5, 6, 7, 8)
- 🚫 **Validation Errors** (Tests 10, 11, 12)
- ⏱️ **Rate Limiting** (Tests 13, 14)

---

## Expected Test Results Summary

| Test                | Expected Status       | Expected Outcome                       |
| ------------------- | --------------------- | -------------------------------------- |
| 1. Health Check     | 200 OK                | Service healthy with security features |
| 2. Security Info    | 200 OK                | Security configuration displayed       |
| 3. Valid PySpark    | 200 OK                | Code executes successfully             |
| 4. Dangerous Import | 400 Bad Request       | Import blocked                         |
| 5. File Operations  | 400 Bad Request       | File I/O blocked                       |
| 6. eval() Function  | 400 Bad Request       | eval() blocked                         |
| 7. Subprocess       | 400 Bad Request       | Subprocess blocked                     |
| 8. Network Ops      | 400 Bad Request       | Network blocked                        |
| 9. Pandas Code      | 200 OK                | Pandas allowed                         |
| 10. Code Size Limit | 400 Bad Request       | Large code rejected                    |
| 11. Missing Code    | 400 Bad Request       | Validation error                       |
| 12. Invalid Timeout | 400 Bad Request       | Validation error                       |
| 13. Rate Limit      | 429 Too Many Requests | Rate limit enforced                    |
| 14. Rate Status     | 200 OK                | Current limits shown                   |
| 15. Complex Query   | 200 OK                | Complex PySpark works                  |

---

## Tips for Testing

1. **Check Response Headers** on every request:

   - `X-RateLimit-Remaining-Minute`
   - `X-Request-ID`
   - Security headers

2. **Test Rate Limiting** properly:

   - Wait 1 minute between rate limit tests
   - Or restart the Redis container: `docker-compose restart redis`

3. **Monitor Logs** while testing:

   ```bash
   docker-compose logs -f pyspark
   ```

4. **Save Responses** in Postman for documentation

5. **Use Tests Tab** in Postman to add assertions:

   ```javascript
   pm.test("Status code is 200", function () {
     pm.response.to.have.status(200);
   });

   pm.test("Response has success field", function () {
     var jsonData = pm.response.json();
     pm.expect(jsonData).to.have.property("success");
   });
   ```

---

## Troubleshooting

**Service not responding:**

```bash
docker-compose ps pyspark
docker-compose logs pyspark
docker-compose restart pyspark
```

**Rate limit not resetting:**

```bash
docker-compose restart redis
```

**Security features not working:**

```bash
# Rebuild container
docker-compose build pyspark
docker-compose up -d pyspark
```
