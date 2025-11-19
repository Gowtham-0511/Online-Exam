from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import tempfile
import os
import json
import traceback
import sys
from datetime import datetime
from redis import Redis
from pyspark.sql import SparkSession
from pyspark.sql.types import StructType, StructField, StringType, IntegerType, DoubleType
import io
from contextlib import redirect_stdout, redirect_stderr

app = Flask(__name__)
CORS(app)

redis_conn = Redis(
    host=os.environ.get('REDIS_HOST', 'redis'),
    port=int(os.environ.get('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)

# Initialize Spark Session (reuse across requests)
spark = None

def get_spark_session():
    global spark
    if spark is None:
        spark = SparkSession.builder \
            .appName("DatabricksExecutor") \
            .master("local[*]") \
            .config("spark.driver.memory", "1g") \
            .config("spark.executor.memory", "1g") \
            .config("spark.sql.shuffle.partitions", "2") \
            .config("spark.driver.bindAddress", "127.0.0.1") \
            .getOrCreate()
        
        # Set log level to ERROR to reduce noise
        spark.sparkContext.setLogLevel("ERROR")
    
    return spark

def execute_pyspark_code(code, inputs=None, timeout=15):
    """Execute PySpark/Databricks code"""
    
    try:
        # Get or create Spark session
        spark_session = get_spark_session()
        
        # Capture stdout and stderr
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()
        
        # Prepare execution namespace
        exec_globals = {
            'spark': spark_session,
            'SparkSession': SparkSession,
            '__builtins__': __builtins__
        }
        
        # Add test data if provided
        if inputs:
            exec_globals['test_input'] = inputs
        
        # Execute code with output capture
        with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
            try:
                exec(code, exec_globals)
            except Exception as e:
                print(f"Execution error: {str(e)}", file=sys.stderr)
                traceback.print_exc()
                raise
        
        stdout_result = stdout_capture.getvalue()
        stderr_result = stderr_capture.getvalue()
        
        # Check if there was an error
        if stderr_result and "error" in stderr_result.lower():
            return {
                "success": False,
                "output": stdout_result,
                "error": stderr_result,
                "stderr": stderr_result
            }
        
        return {
            "success": True,
            "output": stdout_result,
            "error": None,
            "stderr": stderr_result if stderr_result else None
        }
        
    except Exception as e:
        error_trace = traceback.format_exc()
        return {
            "success": False,
            "output": "",
            "error": f"Execution error: {str(e)}",
            "stderr": error_trace
        }

@app.route("/run-pyspark", methods=["POST"])
def run_pyspark():
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No JSON data provided"
            }), 400

        code = data.get("code", "")
        if not code:
            return jsonify({
                "success": False,
                "error": "No code provided"
            }), 400

        inputs = data.get("inputs", None)
        timeout = data.get("timeout", 15)

        if len(code) > 100000:
            return jsonify({
                "success": False,
                "error": "Code size exceeds limit (100KB)"
            }), 400

        result = execute_pyspark_code(code, inputs, timeout)
        
        # Update stats
        try:
            if result['success']:
                redis_conn.hincrby('exam:stats:pyspark', 'completed', 1)
            else:
                redis_conn.hincrby('exam:stats:pyspark', 'failed', 1)
        except:
            pass
        
        return jsonify(result), 200

    except Exception as e:
        error_trace = traceback.format_exc()
        print(f"Flask error: {error_trace}", file=sys.stderr)
        return jsonify({
            "success": False,
            "error": f"Server error: {str(e)}",
            "output": "",
            "stderr": error_trace
        }), 200

@app.route("/health", methods=["GET"])
@app.route("/", methods=["GET"])
def health():
    try:
        # Test Spark session
        spark_session = get_spark_session()
        version = spark_session.version
        
        return jsonify({
            "status": "healthy",
            "service": "PySpark/Databricks Executor",
            "spark_version": version,
            "message": "PySpark Executor is running 🚀"
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "service": "PySpark/Databricks Executor",
            "error": str(e),
            "message": "PySpark Executor failed to start"
        }), 500

@app.route("/spark-info", methods=["GET"])
def spark_info():
    """Get Spark session information"""
    try:
        spark_session = get_spark_session()
        
        return jsonify({
            "spark_version": spark_session.version,
            "master": spark_session.sparkContext.master,
            "app_name": spark_session.sparkContext.appName,
            "default_parallelism": spark_session.sparkContext.defaultParallelism
        }), 200
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({
        "success": False,
        "error": f"Unexpected error: {str(e)}",
        "traceback": traceback.format_exc()
    }), 200

if __name__ == "__main__":
    # Initialize Spark on startup
    try:
        get_spark_session()
        print("Spark session initialized successfully")
    except Exception as e:
        print(f"Failed to initialize Spark: {e}")
    
    app.run(
        host="0.0.0.0",
        port=5005,
        threaded=True,
        debug=False
    )