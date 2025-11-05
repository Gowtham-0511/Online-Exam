import psycopg2
import pymssql
from typing import Dict, List, Any, Tuple
import time
import re

class SQLExecutor:
    MAX_ROWS = 10000
    DEFAULT_TIMEOUT = 25000  # ms

    def __init__(self):
        self.dangerous_keywords = [
            'drop', 'truncate', 'delete', 'insert', 'update',
            'create', 'alter', 'grant', 'revoke', 'exec', 'execute'
        ]

    # ------------------ Utility helpers ------------------
    def _sanitize_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Convert unsupported types (like memoryview/bytes) for JSON serialization"""
        clean_row = {}
        for k, v in row.items() if isinstance(row, dict) else enumerate(row):
            if isinstance(v, memoryview):
                try:
                    clean_row[k] = v.tobytes().decode('utf-8', errors='ignore')
                except Exception:
                    clean_row[k] = str(v.tobytes())
            elif isinstance(v, bytes):
                try:
                    clean_row[k] = v.decode('utf-8', errors='ignore')
                except Exception:
                    clean_row[k] = str(v)
            else:
                clean_row[k] = v
        return clean_row

    def validate_query(self, query: str) -> Tuple[bool, str]:
        """Validate SQL query for safety"""
        normalized = query.strip().lower()
        for keyword in self.dangerous_keywords:
            if keyword in normalized:
                return False, f"Forbidden operation: {keyword.upper()} is not allowed"
        if not normalized.startswith('select'):
            return False, "Only SELECT queries are allowed"
        return True, ""

    def add_row_limit(self, query: str, limit: int) -> str:
        """Add row limit to query"""
        normalized = query.strip().lower()
        if 'limit' in normalized or 'top' in normalized:
            return query
        if normalized.startswith('select'):
            if 'pg_' in query or 'top' not in normalized:
                return f"{query.strip()} LIMIT {limit}"
            return re.sub(r'^select\s+', f'SELECT TOP {limit} ', query, flags=re.IGNORECASE)
        return query

    # ------------------ PostgreSQL Executor ------------------
    def execute_postgres(self, credentials: Dict, query: str) -> Dict[str, Any]:
        """Execute PostgreSQL query"""
        conn = None
        cursor = None
        start_time = time.time()

        try:
            conn = psycopg2.connect(
                host=credentials['host'],
                port=credentials['port'],
                user=credentials['username'],
                password=credentials['password'],
                database=credentials['database'],
                connect_timeout=5,
                options=f'-c statement_timeout={self.DEFAULT_TIMEOUT}'
            )

            cursor = conn.cursor()
            limited_query = self.add_row_limit(query, self.MAX_ROWS)

            cursor.execute(limited_query)
            rows = cursor.fetchall()

            columns = [desc[0] for desc in cursor.description] if cursor.description else []

            # 🧩 Convert any memoryview or bytes values
            sanitized_rows = [self._sanitize_row(dict(zip(columns, r))) for r in rows]

            execution_time = int((time.time() - start_time) * 1000)

            return {
                'success': True,
                'columns': columns,
                'rows': sanitized_rows,
                'rowCount': len(rows),
                'executionTime': execution_time
            }

        except psycopg2.Error as e:
            execution_time = int((time.time() - start_time) * 1000)
            error_msg = str(e)
            if 'timeout' in error_msg.lower():
                error_msg = '⏱️ Query timeout: Your query is taking too long'
            elif 'syntax' in error_msg.lower():
                error_msg = f'❌ SQL Syntax Error: {error_msg}'
            elif 'permission' in error_msg.lower():
                error_msg = '🚫 Permission denied: Cannot perform this operation'

            return {
                'success': False,
                'error': error_msg,
                'executionTime': execution_time,
                'columns': [],
                'rows': [],
                'rowCount': 0
            }

        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()

    # ------------------ SQL Server Executor ------------------
    def execute_sqlserver(self, credentials: Dict, query: str) -> Dict[str, Any]:
        """Execute SQL Server query"""
        conn = None
        cursor = None
        start_time = time.time()

        try:
            conn = pymssql.connect(
                server=credentials['host'],
                port=credentials['port'],
                user=credentials['username'],
                password=credentials['password'],
                database=credentials['database'],
                timeout=5,
                login_timeout=5
            )

            cursor = conn.cursor(as_dict=True)
            limited_query = self.add_row_limit(query, self.MAX_ROWS)

            cursor.execute(limited_query)
            rows = cursor.fetchall()

            # 🧩 Sanitize all rows
            sanitized_rows = [self._sanitize_row(r) for r in rows]

            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            execution_time = int((time.time() - start_time) * 1000)

            return {
                'success': True,
                'columns': columns,
                'rows': sanitized_rows,
                'rowCount': len(sanitized_rows),
                'executionTime': execution_time
            }

        except pymssql.Error as e:
            execution_time = int((time.time() - start_time) * 1000)
            error_msg = str(e)
            if 'timeout' in error_msg.lower():
                error_msg = '⏱️ Query timeout: Your query is taking too long'
            elif 'syntax' in error_msg.lower():
                error_msg = f'❌ SQL Syntax Error: {error_msg}'

            return {
                'success': False,
                'error': error_msg,
                'executionTime': execution_time,
                'columns': [],
                'rows': [],
                'rowCount': 0
            }

        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()
                
    def execute(self, server_type: str, credentials: Dict, query: str) -> Dict[str, Any]:
        """Execute SQL query based on server type with unified error handling and logging"""
        start_time = time.time()

        try:
            # Validate query first
            valid, error = self.validate_query(query)
            if not valid:
                return {
                    'success': False,
                    'error': error,
                    'executionTime': 0,
                    'columns': [],
                    'rows': [],
                    'rowCount': 0
                }

            # Log the incoming request
            print(f"🟢 Executing query on {server_type.upper()} | Query snippet: {query[:60]}...")

            # Dispatch based on server type
            if server_type == 'postgres':
                result = self.execute_postgres(credentials, query)
            elif server_type in ('ssms', 'sqlserver', 'mssql'):
                result = self.execute_sqlserver(credentials, query)
            else:
                return {
                    'success': False,
                    'error': f"❌ Unknown server type: {server_type}",
                    'executionTime': 0,
                    'columns': [],
                    'rows': [],
                    'rowCount': 0
                }

            # Ensure all returned rows are JSON-safe
            if result.get('rows'):
                safe_rows = []
                for row in result['rows']:
                    safe_rows.append(self._sanitize_row(row))
                result['rows'] = safe_rows

            # Add total execution time if not already included
            result['executionTime'] = result.get('executionTime', int((time.time() - start_time) * 1000))

            # Log final status
            if result.get('success'):
                print(f"✅ Query executed successfully in {result['executionTime']} ms | {result['rowCount']} rows")
            else:
                print(f"⚠️ Query failed: {result.get('error')}")

            return result

        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            print(f"❌ Unexpected error while executing SQL: {str(e)}")

            return {
                'success': False,
                'error': f"Unexpected error: {str(e)}",
                'executionTime': execution_time,
                'columns': [],
                'rows': [],
                'rowCount': 0
            }