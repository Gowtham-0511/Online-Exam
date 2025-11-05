from flask import Flask, request, jsonify
from redis import Redis
from rq import Queue
from sql_executor import SQLExecutor
import os
import time

app = Flask(__name__)

# Redis connection
redis_conn = Redis(
    host=os.getenv('REDIS_HOST', 'redis'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    decode_responses=False
)

# Create RQ queue
sql_queue = Queue('sql_execution', connection=redis_conn)

# SQL Executor
sql_executor = SQLExecutor()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    try:
        redis_conn.ping()
        return jsonify({
            'status': 'healthy',
            'service': 'sql-executor',
            'redis': 'connected'
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503

@app.route('/execute', methods=['POST'])
def execute_sql():
    """Execute SQL query"""
    try:
        data = request.get_json()

        query = data.get('query')
        server_type = data.get('serverType')
        credentials = data.get('credentials')
        exam_id = data.get('examId')
        user_email = data.get('userEmail', 'anonymous')

        if not all([query, server_type, credentials]):
            return jsonify({
                'success': False,
                'error': 'Missing required fields'
            }), 400

        # Validate query
        valid, error = sql_executor.validate_query(query)
        if not valid:
            return jsonify({
                'success': False,
                'error': error
            }), 400

        print(f"📊 SQL Request from {user_email} for exam {exam_id}")

        # Execute SQL synchronously (for now)
        result = sql_executor.execute(server_type, credentials, query)

        return jsonify(result), 200

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'executionTime': 0,
            'columns': [],
            'rows': [],
            'rowCount': 0
        }), 500

@app.route('/execute-async', methods=['POST'])
def execute_sql_async():
    """Execute SQL query asynchronously using RQ"""
    try:
        data = request.get_json()

        query = data.get('query')
        server_type = data.get('serverType')
        credentials = data.get('credentials')

        # Validate query
        valid, error = sql_executor.validate_query(query)
        if not valid:
            return jsonify({
                'success': False,
                'error': error
            }), 400

        # Enqueue job
        job = sql_queue.enqueue(
            sql_executor.execute,
            server_type,
            credentials,
            query,
            job_timeout=30
        )

        return jsonify({
            'jobId': job.id,
            'status': 'queued'
        }), 202

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/job/<job_id>', methods=['GET'])
def get_job_result(job_id):
    """Get async job result"""
    try:
        from rq.job import Job

        job = Job.fetch(job_id, connection=redis_conn)

        if job.is_finished:
            return jsonify({
                'status': 'completed',
                'result': job.result
            }), 200
        elif job.is_failed:
            return jsonify({
                'status': 'failed',
                'error': str(job.exc_info)
            }), 200
        else:
            return jsonify({
                'status': 'processing'
            }), 202

    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 404

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)