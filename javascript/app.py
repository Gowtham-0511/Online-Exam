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

app = Flask(__name__)
CORS(app)

redis_conn = Redis(
    host=os.environ.get('REDIS_HOST', 'redis'),
    port=int(os.environ.get('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)

def execute_javascript_code(code, inputs=None, function_name=None, timeout=10):
    """Execute JavaScript code using Node.js"""
    
    # Create wrapper code
    if function_name and inputs is not None:
        wrapper = f"""
{code}

// Test execution
try {{
    const inputData = {json.dumps(inputs)};
    
    if (typeof {function_name} === 'function') {{
        let result;
        if (Array.isArray(inputData)) {{
            result = {function_name}(...inputData);
        }} else if (typeof inputData === 'object' && inputData !== null) {{
            result = {function_name}(inputData);
        }} else {{
            result = {function_name}(inputData);
        }}
        console.log(JSON.stringify(result));
    }} else {{
        throw new Error('Function {function_name} not found');
    }}
}} catch (error) {{
    console.error('Execution error:', error.message);
    process.exit(1);
}}
"""
    else:
        wrapper = code
    
    # Write to temp file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
        f.write(wrapper)
        temp_file = f.name
    
    try:
        # Execute with Node.js
        result = subprocess.run(
            ['node', temp_file],
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        stdout = result.stdout
        stderr = result.stderr
        success = result.returncode == 0
        
        return {
            "success": success,
            "output": stdout,
            "error": stderr if stderr else None,
            "stderr": stderr
        }
        
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "output": "",
            "error": f"Code execution timed out ({timeout} seconds)",
            "stderr": ""
        }
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "error": f"Execution error: {str(e)}",
            "stderr": traceback.format_exc()
        }
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_file)
        except:
            pass

@app.route("/run-javascript", methods=["POST"])
def run_javascript():
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
        function_name = data.get("function_name", None)
        timeout = data.get("timeout", 10)

        if len(code) > 50000:
            return jsonify({
                "success": False,
                "error": "Code size exceeds limit (50KB)"
            }), 400

        result = execute_javascript_code(code, inputs, function_name, timeout)
        
        # Update stats
        try:
            if result['success']:
                redis_conn.hincrby('exam:stats:javascript', 'completed', 1)
            else:
                redis_conn.hincrby('exam:stats:javascript', 'failed', 1)
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
    return jsonify({
        "status": "healthy",
        "service": "JavaScript Executor",
        "message": "JavaScript Executor is running 🚀"
    }), 200

@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({
        "success": False,
        "error": f"Unexpected error: {str(e)}",
        "traceback": traceback.format_exc()
    }), 200

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5002,
        threaded=True,
        debug=False
    )