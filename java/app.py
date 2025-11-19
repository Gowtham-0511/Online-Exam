from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import tempfile
import os
import json
import traceback
import sys
import re
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

def execute_java_code(code, inputs=None, function_name=None, timeout=15):
    """Execute Java code with compilation and execution"""
    
    # Extract class name from code
    class_match = re.search(r'public\s+class\s+(\w+)', code)
    class_name = class_match.group(1) if class_match else 'Main'
    
    # Create temp directory for compilation
    temp_dir = tempfile.mkdtemp()
    
    try:
        # If there's a function to call, create a wrapper
        if function_name and inputs is not None:
            # If code doesn't have main method, wrap it
            if 'public static void main' not in code:
                # Remove 'public' from the class definition to avoid filename conflict
                code_without_public = re.sub(r'public\s+class\s+(\w+)', r'class \1', code)
                
                wrapper = f"""
{code_without_public}

public class MainWrapper {{
    public static void main(String[] args) {{
        try {{
            String inputData = {json.dumps(inputs)};
            {class_name} solution = new {class_name}();
            
            // Try to find and call the function
            java.lang.reflect.Method[] methods = {class_name}.class.getDeclaredMethods();
            for (java.lang.reflect.Method method : methods) {{
                if (method.getName().equals("{function_name}")) {{
                    Object result = method.invoke(solution, inputData);
                    System.out.println(result);
                    return;
                }}
            }}
            System.err.println("Function {function_name} not found");
            System.exit(1);
        }} catch (Exception e) {{
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }}
    }}
}}
"""
                java_file = os.path.join(temp_dir, 'MainWrapper.java')
                class_name = "MainWrapper"
            else:
                wrapper = code
                java_file = os.path.join(temp_dir, f'{class_name}.java')
        else:
            # No function call needed
            if 'public static void main' not in code:
                # Remove 'public' from class and add main method
                code_without_public = re.sub(r'public\s+class\s+(\w+)', r'class \1', code)
                
                wrapper = f"""
{code_without_public}

public class MainWrapper {{
    public static void main(String[] args) {{
        System.out.println("No main method defined");
    }}
}}
"""
                java_file = os.path.join(temp_dir, 'MainWrapper.java')
                class_name = "MainWrapper"
            else:
                wrapper = code
                java_file = os.path.join(temp_dir, f'{class_name}.java')
        
        # Write Java file
        with open(java_file, 'w') as f:
            f.write(wrapper)
        
        # Compile
        compile_result = subprocess.run(
            ['javac', java_file],
            capture_output=True,
            text=True,
            timeout=10,
            cwd=temp_dir
        )
        
        if compile_result.returncode != 0:
            return {
                "success": False,
                "output": "",
                "error": f"Compilation error:\n{compile_result.stderr}",
                "stderr": compile_result.stderr
            }
        
        # Execute
        run_result = subprocess.run(
            ['java', '-cp', temp_dir, class_name],
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        stdout = run_result.stdout
        stderr = run_result.stderr
        success = run_result.returncode == 0
        
        return {
            "success": success,
            "output": stdout,
            "error": stderr if stderr and not success else None,
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
        # Clean up temp directory
        try:
            import shutil
            shutil.rmtree(temp_dir)
        except:
            pass
        
@app.route("/run-java", methods=["POST"])
def run_java():
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
        timeout = data.get("timeout", 15)

        if len(code) > 100000:
            return jsonify({
                "success": False,
                "error": "Code size exceeds limit (100KB)"
            }), 400

        result = execute_java_code(code, inputs, function_name, timeout)
        
        # Update stats
        try:
            if result['success']:
                redis_conn.hincrby('exam:stats:java', 'completed', 1)
            else:
                redis_conn.hincrby('exam:stats:java', 'failed', 1)
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
        "service": "Java Executor",
        "message": "Java Executor is running 🚀"
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
        port=5003,
        threaded=True,
        debug=True
    )