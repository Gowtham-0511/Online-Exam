# Quick Postman Test Reference Card

## 🚀 Quick Start

**Base URL:** `http://localhost:5005`

**Start Service:**

```bash
docker-compose up -d pyspark
```

---

## ✅ Test 1: Health Check

```
GET http://localhost:5005/health
```

Expected: Status 200, "healthy" response

---

## ✅ Test 2: Valid PySpark Code

```
POST http://localhost:5005/run-pyspark
Content-Type: application/json

{
  "code": "from pyspark.sql import Row\ndata = [Row(name='Alice', age=25)]\ndf = spark.createDataFrame(data)\ndf.show()"
}
```

Expected: Status 200, DataFrame output

---

## 🚫 Test 3: Dangerous Import (Should Fail)

```
POST http://localhost:5005/run-pyspark
Content-Type: application/json

{
  "code": "import os\nos.system('ls')"
}
```

Expected: Status 400, "Dangerous module import detected: os"

---

## 🚫 Test 4: File Operations (Should Fail)

```
POST http://localhost:5005/run-pyspark
Content-Type: application/json

{
  "code": "open('/etc/passwd', 'r').read()"
}
```

Expected: Status 400, "File operation detected"

---

## 🚫 Test 5: eval() Function (Should Fail)

```
POST http://localhost:5005/run-pyspark
Content-Type: application/json

{
  "code": "eval('1+1')"
}
```

Expected: Status 400, "Dangerous function call detected: eval()"

---

## ✅ Test 6: Pandas Code (Should Work)

```
POST http://localhost:5005/run-pyspark
Content-Type: application/json

{
  "code": "import pandas as pd\ndf = pd.DataFrame({'a': [1, 2, 3]})\nprint(df.sum())"
}
```

Expected: Status 200, Pandas output

---

## ⏱️ Test 7: Rate Limiting

Send the same request **11 times rapidly**:

```
POST http://localhost:5005/run-pyspark
Content-Type: application/json

{
  "code": "print('test')"
}
```

- First 10: Status 200 ✅
- 11th request: Status 429 (Rate limit exceeded) 🚫

---

## 📊 Check Rate Limit Status

```
GET http://localhost:5005/rate-limit-status
```

Shows remaining requests

---

## 🔍 Response Headers to Check

Every response includes:

- `X-RateLimit-Remaining-Minute` - Requests left this minute
- `X-Request-ID` - Unique request identifier
- `X-Content-Type-Options: nosniff` - Security header

---

## 🎯 Expected Results Summary

| Test             | Status | Result             |
| ---------------- | ------ | ------------------ |
| Health Check     | 200    | ✅ Service healthy |
| Valid PySpark    | 200    | ✅ Code executes   |
| Dangerous Import | 400    | 🚫 Blocked         |
| File Operations  | 400    | 🚫 Blocked         |
| eval()           | 400    | 🚫 Blocked         |
| Pandas Code      | 200    | ✅ Allowed         |
| 11th Request     | 429    | 🚫 Rate limited    |

---

## 🛠️ Troubleshooting

**Service not responding?**

```bash
docker-compose logs pyspark
docker-compose restart pyspark
```

**Reset rate limits:**

```bash
docker-compose restart redis
```

---

For detailed test cases, see: `POSTMAN_TESTING.md`
