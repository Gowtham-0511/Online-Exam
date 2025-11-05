from flask import Flask, request, jsonify
from flask_cors import CORS
import io
import contextlib
import json
import traceback
import threading
import sys
from functools import wraps

from redis import Redis
from rq import Queue
from rq.job import Job

import os

from datetime import datetime

app = Flask(__name__)
CORS(app)

redis_conn = Redis(
    host=os.environ.get('REDIS_HOST', 'redis'),
    port=int(os.environ.get('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)
task_queue = Queue('python_execution', connection=redis_conn)

# ADD THIS FUNCTION before @app.route("/run-python")
def execute_code_task(code, inputs=None, function_name=None):
    """Background task for code execution"""
    output = io.StringIO()
    error_output = io.StringIO()
    local_vars = {}
    
    with contextlib.redirect_stdout(output), contextlib.redirect_stderr(error_output):
        import_successful = [False]
        execution_error = [None]
        
        def execute_with_timeout():
            try:
                exec(code, {"__builtins__": __builtins__}, local_vars)
                import_successful[0] = True
            except Exception as e:
                execution_error[0] = e
        
        exec_thread = threading.Thread(target=execute_with_timeout)
        exec_thread.daemon = True
        exec_thread.start()
        exec_thread.join(timeout=10)
        
        if exec_thread.is_alive():
            return {
                "success": False,
                "output": output.getvalue(),
                "error": "Code execution timed out (10 seconds)",
                "stderr": error_output.getvalue()
            }
        
        if execution_error[0]:
            return {
                "success": False,
                "output": output.getvalue(),
                "error": str(execution_error[0]),
                "stderr": error_output.getvalue()
            }
        
        if function_name and function_name in local_vars:
            func = local_vars[function_name]
            try:
                if inputs is None:
                    result = func()
                elif isinstance(inputs, dict):
                    try:
                        result = func(**inputs)
                    except TypeError:
                        result = func(*inputs.values())
                elif isinstance(inputs, list):
                    result = func(*inputs)
                else:
                    result = func(inputs)
                
                if isinstance(result, (list, dict, tuple)):
                    print(json.dumps(result, default=str, separators=(',', ':')))
                else:
                    print(result)
            except Exception as e:
                traceback.print_exc()
                return {
                    "success": False,
                    "output": output.getvalue(),
                    "error": f"Function execution error: {str(e)}",
                    "stderr": error_output.getvalue()
                }
    
    stdout_result = output.getvalue()
    stderr_result = error_output.getvalue()
    
    return {
        "success": True,
        "output": stdout_result,
        "error": stderr_result if stderr_result else None,
        "stderr": stderr_result
    }

@app.route("/run-python", methods=["POST"])
def run_python():
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

        # Check if async mode is requested
        async_mode = data.get("async", False)
        
        inputs = data.get("inputs", None)
        function_name = data.get("function_name", None)

        if len(code) > 50000:
            return jsonify({
                "success": False,
                "error": "Code size exceeds limit (50KB)"
            }), 400

        if async_mode:
            # Enqueue task
            job = task_queue.enqueue(
                execute_code_task,
                code,
                inputs,
                function_name,
                job_timeout=30
            )
            
            return jsonify({
                "success": True,
                "job_id": job.id,
                "message": "Task queued successfully"
            }), 202
        else:
            # Synchronous execution (existing behavior)
            result = execute_code_task(code, inputs, function_name)
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
        
# ADD THIS NEW ROUTE
@app.route("/job-status/<job_id>", methods=["GET"])
def get_job_status(job_id):
    try:
        job = Job.fetch(job_id, connection=redis_conn)
        
        if job.is_finished:
            return jsonify({
                "status": "finished",
                "result": job.result
            }), 200
        elif job.is_failed:
            return jsonify({
                "status": "failed",
                "error": str(job.exc_info)
            }), 200
        else:
            return jsonify({
                "status": "pending" if job.is_queued else "running"
            }), 200
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 404

@app.route("/queue-stats", methods=["GET"])
def get_queue_stats():
    try:
        # Get queue lengths
        python_queue_length = redis_conn.zcard('exam:queue:python')
        sql_queue_length = redis_conn.zcard('exam:queue:sql')
        
        # Get stats from Redis hash
        python_stats_raw = redis_conn.hgetall('exam:stats:python')
        python_stats = {
            'waiting': int(python_stats_raw.get('waiting', 0)),
            'active': int(python_stats_raw.get('active', 0)),
            'completed': int(python_stats_raw.get('completed', 0)),
            'failed': int(python_stats_raw.get('failed', 0)),
        }
        
        sql_stats_raw = redis_conn.hgetall('exam:stats:sql')
        sql_stats = {
            'waiting': int(sql_stats_raw.get('waiting', 0)),
            'active': int(sql_stats_raw.get('active', 0)),
            'completed': int(sql_stats_raw.get('completed', 0)),
            'failed': int(sql_stats_raw.get('failed', 0)),
        }
        
        # Get actual waiting counts
        actual_python_waiting = redis_conn.zcard('exam:queue:python')
        actual_sql_waiting = redis_conn.zcard('exam:queue:sql')
        
        # Get active job counts
        python_active_keys = redis_conn.keys('exam:active:python_*')
        sql_active_keys = redis_conn.keys('exam:active:sql_*')
        
        # Redis health check
        redis_connected = False
        redis_memory = 'N/A'
        try:
            redis_conn.ping()
            redis_connected = True
            
            # Get memory info
            info = redis_conn.info('memory')
            redis_memory = info.get('used_memory_human', 'N/A')
        except Exception as e:
            print(f"Redis ping failed: {e}", file=sys.stderr)
        
        # RQ queue stats
        rq_stats = {
            'queued': task_queue.count,
            'started': len(task_queue.started_job_registry),
            'finished': len(task_queue.finished_job_registry),
            'failed': len(task_queue.failed_job_registry),
        }
        
        return jsonify({
            'python': {
                'waiting': actual_python_waiting,
                'active': len(python_active_keys),
                'completed': python_stats['completed'],
                'failed': python_stats['failed'],
                'queueLength': python_queue_length,
            },
            'sql': {
                'waiting': actual_sql_waiting,
                'active': len(sql_active_keys),
                'completed': sql_stats['completed'],
                'failed': sql_stats['failed'],
                'queueLength': sql_queue_length,
            },
            'rq': rq_stats,
            'redis': {
                'connected': redis_connected,
                'memoryUsed': redis_memory,
            },
            'timestamp': datetime.now().isoformat(),
        }), 200
        
    except Exception as e:
        print(f"Failed to get queue stats: {e}", file=sys.stderr)
        return jsonify({
            'error': 'Failed to fetch stats',
            'message': str(e)
        }), 500

@app.route("/recent-jobs", methods=["GET"])
def get_recent_jobs():
    try:
        limit = int(request.args.get('limit', 20))
        jobs = []

        python_jobs = redis_conn.zrevrange(
            'exam:recent:python',
            0,
            limit // 2 - 1,
            withscores=True
        )

        for job_str, timestamp in python_jobs:
            try:
                job_data = json.loads(job_str)
                jobs.append({
                    'id': job_data.get('id', f"python_{int(timestamp)}"),
                    'type': 'python',
                    'userEmail': job_data.get('userEmail', 'unknown'),
                    'timestamp': datetime.fromtimestamp(timestamp).isoformat(),
                    'status': 'success' if job_data.get('success') else 'failed',
                    'executionTime': job_data.get('executionTime'),
                    'error': job_data.get('error'),
                })
            except (json.JSONDecodeError, ValueError) as e:
                print(f"Failed to parse Python job: {e}", file=sys.stderr)
                continue

        sql_jobs = redis_conn.zrevrange(
            'exam:recent:sql',
            0,
            limit // 2 - 1,
            withscores=True
        )

        for job_str, timestamp in sql_jobs:
            try:
                job_data = json.loads(job_str)
                jobs.append({
                    'id': job_data.get('id', f"sql_{int(timestamp)}"),
                    'type': 'sql',
                    'userEmail': job_data.get('userEmail', 'unknown'),
                    'timestamp': datetime.fromtimestamp(timestamp).isoformat(),
                    'status': 'success' if job_data.get('success') else 'failed',
                    'executionTime': job_data.get('executionTime'),
                    'error': job_data.get('error'),
                })
            except (json.JSONDecodeError, ValueError) as e:
                print(f"Failed to parse SQL job: {e}", file=sys.stderr)
                continue

        jobs.sort(key=lambda x: x['timestamp'], reverse=True)

        limited_jobs = jobs[:limit]

        return jsonify({
            'jobs': limited_jobs,
            'count': len(limited_jobs),
            'timestamp': datetime.now().isoformat(),
        }), 200

    except Exception as e:
        print(f"Failed to get recent jobs: {e}", file=sys.stderr)
        # Return empty array on error so dashboard doesn't break
        return jsonify({
            'jobs': [],
            'count': 0,
            'error': str(e)
        }), 200

@app.route("/clear-queue", methods=["POST"])
def clear_queue():
    try:
        data = request.get_json()
        queue_type = data.get('queueType', 'all')
        
        if queue_type in ['python', 'all']:
            redis_conn.delete('exam:queue:python')
            task_queue.empty()
        
        if queue_type in ['sql', 'all']:
            redis_conn.delete('exam:queue:sql')
        
        return jsonify({
            'success': True,
            'message': f'{queue_type.capitalize()} queue cleared successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route("/clear-history", methods=["POST"])
def clear_history():
    try:
        data = request.get_json()
        history_type = data.get('historyType', 'all')
        
        # Clear recent jobs list
        redis_conn.delete('exam:recent_jobs')
        
        # Clear individual job records
        if history_type == 'all':
            keys = redis_conn.keys('exam:job:*')
            if keys:
                redis_conn.delete(*keys)
        
        return jsonify({
            'success': True,
            'message': 'History cleared successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route("/reset-stats", methods=["POST"])
def reset_stats():
    try:
        # Reset Python stats
        redis_conn.hset('exam:stats:python', mapping={
            'waiting': 0,
            'active': 0,
            'completed': 0,
            'failed': 0
        })
        
        # Reset SQL stats
        redis_conn.hset('exam:stats:sql', mapping={
            'waiting': 0,
            'active': 0,
            'completed': 0,
            'failed': 0
        })
        
        # Clear RQ finished/failed registries
        task_queue.finished_job_registry.clear()
        task_queue.failed_job_registry.clear()
        
        return jsonify({
            'success': True,
            'message': 'Statistics reset successfully'
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route("/health", methods=["GET"])
@app.route("/", methods=["GET"])
def health():
    return jsonify({"status": "healthy", "message": "Python Executor is running 🚀"}), 200

# Error handlers
@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": "Internal server error",
        "details": str(error)
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
        port=5000,
        threaded=True,
        debug=False
    )