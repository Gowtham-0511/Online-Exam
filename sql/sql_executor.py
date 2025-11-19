import psycopg2
import pymssql
from typing import Dict, List, Any, Tuple
import time
import re

class SQLExecutor:
    MAX_ROWS = 10000
    DEFAULT_TIMEOUT = 25000  # ms

    def __init__(self):
        # Only block truly dangerous operations
        self.dangerous_keywords = [
            'drop', 'truncate', 'delete', 'grant', 'revoke', 'exec', 'execute'
        ]

    def _sanitize_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """Convert unsupported types for JSON serialization"""
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
        """Validate SQL query - allow CREATE/INSERT for setup, block dangerous ops"""
        normalized = query.strip().lower()
        
        # Block dangerous operations
        for keyword in self.dangerous_keywords:
            if keyword in normalized:
                return False, f"Forbidden operation: {keyword.upper()} is not allowed"
        
        # Main query (last statement) must be SELECT
        queries = [q.strip() for q in normalized.split(';') if q.strip()]
        if queries:
            main_query = queries[-1]
            if main_query and not main_query.startswith('select'):
                return False, "Main query must be a SELECT statement"
        
        return True, ""

    def add_row_limit(self, query: str, limit: int) -> str:
        """Add row limit to SELECT queries"""
        normalized = query.strip().lower()
        if 'limit' in normalized or 'top' in normalized:
            return query
        if normalized.startswith('select'):
            return f"{query.strip()} LIMIT {limit}"
        return query

    def execute_postgres(self, credentials: Dict, query: str) -> Dict[str, Any]:
        """Execute PostgreSQL query with multi-statement support"""
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
            conn.autocommit = True  # Important for CREATE/INSERT
            cursor = conn.cursor()

            # Split queries by semicolon
            queries = [q.strip() for q in query.split(';') if q.strip()]
            
            result_rows = []
            result_columns = []
            
            for i, q in enumerate(queries):
                is_last = (i == len(queries) - 1)
                
                print(f"  Executing statement {i+1}/{len(queries)}: {q[:50]}...")
                
                # Add limit only to the last SELECT query
                if is_last and q.lower().startswith('select'):
                    q = self.add_row_limit(q, self.MAX_ROWS)
                
                cursor.execute(q)
                
                # Only fetch results from the last SELECT query
                if is_last and q.lower().startswith('select'):
                    result_rows = cursor.fetchall()
                    result_columns = [desc[0] for desc in cursor.description] if cursor.description else []

            # Sanitize rows
            sanitized_rows = [self._sanitize_row(dict(zip(result_columns, r))) for r in result_rows]
            execution_time = int((time.time() - start_time) * 1000)

            return {
                'success': True,
                'columns': result_columns,
                'rows': sanitized_rows,
                'rowCount': len(result_rows),
                'executionTime': execution_time
            }

        except psycopg2.Error as e:
            execution_time = int((time.time() - start_time) * 1000)
            error_msg = str(e).strip()
            
            # User-friendly error messages
            if 'timeout' in error_msg.lower():
                error_msg = 'Query timeout: Your query is taking too long'
            elif 'syntax' in error_msg.lower():
                error_msg = f'SQL Syntax Error: {error_msg}'
            elif 'permission' in error_msg.lower():
                error_msg = 'Permission denied: Cannot perform this operation'

            print(f"  ❌ PostgreSQL error: {error_msg}")

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

    def execute_sqlserver(self, credentials: Dict, query: str) -> Dict[str, Any]:
        """Execute SQL Server query with multi-statement support"""
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
                login_timeout=5,
                autocommit=True
            )

            cursor = conn.cursor(as_dict=True)
            
            # Split queries by semicolon
            queries = [q.strip() for q in query.split(';') if q.strip()]
            
            result_rows = []
            result_columns = []
            
            for i, q in enumerate(queries):
                is_last = (i == len(queries) - 1)
                
                print(f"  Executing statement {i+1}/{len(queries)}: {q[:50]}...")
                
                # Add limit only to the last SELECT query
                if is_last and q.lower().startswith('select'):
                    q = self.add_row_limit(q, self.MAX_ROWS)
                
                cursor.execute(q)
                
                # Only fetch results from the last SELECT query
                if is_last and q.lower().startswith('select'):
                    result_rows = cursor.fetchall()
                    result_columns = [desc[0] for desc in cursor.description] if cursor.description else []

            # Sanitize rows
            sanitized_rows = [self._sanitize_row(r) for r in result_rows]
            execution_time = int((time.time() - start_time) * 1000)

            return {
                'success': True,
                'columns': result_columns,
                'rows': sanitized_rows,
                'rowCount': len(sanitized_rows),
                'executionTime': execution_time
            }

        except pymssql.Error as e:
            execution_time = int((time.time() - start_time) * 1000)
            error_msg = str(e).strip()
            
            if 'timeout' in error_msg.lower():
                error_msg = 'Query timeout: Your query is taking too long'
            elif 'syntax' in error_msg.lower():
                error_msg = f'SQL Syntax Error: {error_msg}'

            print(f"  ❌ SQL Server error: {error_msg}")

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
        """Main execution method with unified error handling"""
        start_time = time.time()

        try:
            # Validate query
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

            print(f"🟢 Executing on {server_type.upper()}")
            print(f"  Query preview: {query[:100]}...")

            # Dispatch to appropriate executor
            if server_type == 'postgres':
                result = self.execute_postgres(credentials, query)
            elif server_type in ('ssms', 'sqlserver', 'mssql'):
                result = self.execute_sqlserver(credentials, query)
            else:
                return {
                    'success': False,
                    'error': f"Unknown server type: {server_type}",
                    'executionTime': 0,
                    'columns': [],
                    'rows': [],
                    'rowCount': 0
                }

            # Final sanitization
            if result.get('rows'):
                result['rows'] = [self._sanitize_row(r) for r in result['rows']]

            # Ensure execution time is set
            result['executionTime'] = result.get('executionTime', int((time.time() - start_time) * 1000))

            # Log result
            if result.get('success'):
                print(f"✅ Success in {result['executionTime']}ms | {result['rowCount']} rows")
            else:
                print(f"⚠️ Failed: {result.get('error')}")

            return result

        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            print(f"❌ Unexpected error: {str(e)}")

            return {
                'success': False,
                'error': f"Unexpected error: {str(e)}",
                'executionTime': execution_time,
                'columns': [],
                'rows': [],
                'rowCount': 0
            }