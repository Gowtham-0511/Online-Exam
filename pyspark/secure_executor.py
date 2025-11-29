"""
Secure Executor Module for PySpark Code Execution

Provides a secure execution environment with resource limits,
timeout enforcement, and restricted builtins.
"""

import sys
import io
import traceback
import psutil
import os
import threading
import base64
from contextlib import redirect_stdout, redirect_stderr
from typing import Dict, Any, Optional
from pyspark.sql import SparkSession

# Try to import visualization libraries
try:
    import matplotlib
    # Set backend to Agg (non-interactive) before importing pyplot
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    import seaborn as sns
    VISUALIZATION_ENABLED = True
except ImportError:
    VISUALIZATION_ENABLED = False


class ExecutionTimeout(Exception):
    """Raised when code execution exceeds timeout"""
    pass


class MemoryLimitExceeded(Exception):
    """Raised when code execution exceeds memory limit"""
    pass


class SecureExecutor:
    """
    Executes PySpark code in a secure, restricted environment.
    """
    
    # Safe built-in functions allowed in execution
    SAFE_BUILTINS = {
        'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes',
        'callable', 'chr', 'complex', 'dict', 'divmod', 'enumerate',
        'filter', 'float', 'format', 'frozenset', 'hash', 'hex', 'int',
        'isinstance', 'issubclass', 'iter', 'len', 'list', 'map', 'max',
        'min', 'next', 'oct', 'ord', 'pow', 'print', 'range', 'repr',
        'reversed', 'round', 'set', 'slice', 'sorted', 'str', 'sum',
        'tuple', 'type', 'zip',
        # Additional safe functions
        'Exception', 'ValueError', 'TypeError', 'KeyError', 'IndexError',
        'RuntimeError', 'StopIteration', 'NotImplementedError',
        # Allow None, True, False
        'None', 'True', 'False',
        # Required for imports (but imports are validated by AST validator first)
        '__import__',
    }
    
    def __init__(self, spark_session: SparkSession, 
                 max_memory_mb: int = 512,
                 enable_timeout: bool = True):
        """
        Initialize secure executor.
        
        Args:
            spark_session: PySpark SparkSession instance
            max_memory_mb: Maximum memory usage in MB
            enable_timeout: Whether to enable timeout enforcement
        """
        self.spark = spark_session
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.enable_timeout = enable_timeout
        self.process = psutil.Process(os.getpid())
    
    def _check_memory_usage(self):
        """Check if memory usage exceeds limit"""
        try:
            memory_info = self.process.memory_info()
            current_memory = memory_info.rss  # Resident Set Size
            
            if current_memory > self.max_memory_bytes:
                raise MemoryLimitExceeded(
                    f"Memory usage ({current_memory / 1024 / 1024:.2f}MB) "
                    f"exceeded limit ({self.max_memory_bytes / 1024 / 1024:.2f}MB)"
                )
        except MemoryLimitExceeded:
            raise
        except Exception as e:
            # If memory check fails, log but don't stop execution
            print(f"Memory check failed: {e}", file=sys.stderr)
    
    def _create_safe_namespace(self, inputs: Optional[Any] = None) -> Dict[str, Any]:
        """
        Create a restricted namespace for code execution.
        
        Args:
            inputs: Optional test inputs to include in namespace
            
        Returns:
            Dictionary containing safe namespace
        """
        # Create restricted builtins
        safe_builtins = {}
        for name in self.SAFE_BUILTINS:
            if hasattr(__builtins__, name):
                safe_builtins[name] = getattr(__builtins__, name)
            elif isinstance(__builtins__, dict) and name in __builtins__:
                safe_builtins[name] = __builtins__[name]
        
        # Create execution namespace
        namespace = {
            '__builtins__': safe_builtins,
            'spark': self.spark,
            'SparkSession': SparkSession,
        }
        
        # Add test inputs if provided
        if inputs is not None:
            namespace['test_input'] = inputs
            
        return namespace
    
    def _capture_plot(self) -> Optional[str]:
        """
        Capture the current matplotlib figure as a base64 string.
        
        Returns:
            Base64 encoded image string or None if no plot exists
        """
        if not VISUALIZATION_ENABLED:
            return None
            
        try:
            # Check if there are any open figures
            if plt.get_fignums():
                # Get the current figure
                fig = plt.gcf()
                
                # Save to buffer
                buf = io.BytesIO()
                fig.savefig(buf, format='png', bbox_inches='tight')
                buf.seek(0)
                
                # Encode to base64
                img_str = base64.b64encode(buf.read()).decode('utf-8')
                
                # Create data URI
                img_data = f"data:image/png;base64,{img_str}"
                
                # Close figure to free memory
                plt.close(fig)
                buf.close()
                
                return img_data
            return None
        except Exception as e:
            print(f"Error capturing plot: {e}", file=sys.stderr)
            return None
    
    def _execute_with_timeout(self, code: str, namespace: Dict[str, Any], 
                              stdout_capture: io.StringIO, 
                              stderr_capture: io.StringIO,
                              timeout: int) -> Dict[str, Any]:
        """
        Execute code with timeout using threading.
        
        Args:
            code: Code to execute
            namespace: Execution namespace
            stdout_capture: StringIO for stdout
            stderr_capture: StringIO for stderr
            timeout: Timeout in seconds
            
        Returns:
            Execution result dictionary
        """
        result = {'completed': False, 'exception': None}
        
        def target():
            try:
                with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                    # Check initial memory
                    self._check_memory_usage()
                    
                    # Execute the code
                    exec(code, namespace)
                    
                    # Check final memory
                    self._check_memory_usage()
                    
                result['completed'] = True
            except Exception as e:
                result['exception'] = e
                print(f"Execution error: {str(e)}", file=sys.stderr)
                traceback.print_exc(file=sys.stderr)
        
        # Create and start thread
        thread = threading.Thread(target=target)
        thread.daemon = True
        thread.start()
        
        # Wait for thread to complete or timeout
        thread.join(timeout)
        
        if thread.is_alive():
            # Thread is still running - timeout occurred
            raise ExecutionTimeout(f"Code execution exceeded {timeout} seconds")
        
        if result['exception']:
            raise result['exception']
        
        return result
    
    def execute(self, code: str, inputs: Optional[Any] = None, 
                timeout: int = 15) -> Dict[str, Any]:
        """
        Execute code in a secure environment.
        
        Args:
            code: Python/PySpark code to execute
            inputs: Optional test inputs
            timeout: Execution timeout in seconds
            
        Returns:
            Dictionary with execution results
        """
        # Capture stdout and stderr
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()
        
        # Clear any existing plots before execution
        if VISUALIZATION_ENABLED:
            plt.close('all')
        
        try:
            # Create safe namespace
            namespace = self._create_safe_namespace(inputs)
            
            # Execute code with timeout
            if self.enable_timeout:
                self._execute_with_timeout(code, namespace, stdout_capture, 
                                          stderr_capture, timeout)
            else:
                # Execute without timeout
                with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                    self._check_memory_usage()
                    exec(code, namespace)
                    self._check_memory_usage()
            
            # Capture plot if generated
            plot_image = self._capture_plot()
            
            # Get captured output
            stdout_result = stdout_capture.getvalue()
            stderr_result = stderr_capture.getvalue()
            
            # Check if there was an error in stderr
            if stderr_result and any(keyword in stderr_result.lower() 
                                    for keyword in ['error', 'exception', 'traceback']):
                return {
                    'success': False,
                    'output': stdout_result,
                    'image': plot_image,
                    'error': 'Execution error occurred',
                    'stderr': stderr_result
                }
            
            return {
                'success': True,
                'output': stdout_result,
                'image': plot_image,
                'error': None,
                'stderr': stderr_result if stderr_result else None
            }
            
        except ExecutionTimeout as e:
            return {
                'success': False,
                'output': stdout_capture.getvalue(),
                'image': None,
                'error': f'Execution timeout: Code took longer than {timeout} seconds',
                'stderr': str(e)
            }
        
        except MemoryLimitExceeded as e:
            return {
                'success': False,
                'output': stdout_capture.getvalue(),
                'image': None,
                'error': 'Memory limit exceeded',
                'stderr': str(e)
            }
        
        except Exception as e:
            error_trace = traceback.format_exc()
            return {
                'success': False,
                'output': stdout_capture.getvalue(),
                'image': None,
                'error': f'Execution error: {str(e)}',
                'stderr': error_trace
            }
        finally:
            # Ensure plots are cleared
            if VISUALIZATION_ENABLED:
                plt.close('all')
    
    def execute_safe(self, code: str, inputs: Optional[Any] = None,
                    timeout: int = 15) -> Dict[str, Any]:
        """
        Execute code with sanitized error messages (for production).
        
        Args:
            code: Python/PySpark code to execute
            inputs: Optional test inputs
            timeout: Execution timeout in seconds
            
        Returns:
            Dictionary with execution results (sanitized)
        """
        result = self.execute(code, inputs, timeout)
        
        # Sanitize error messages in production
        if not result['success'] and os.environ.get('FLASK_ENV') == 'production':
            # Don't expose full stack traces in production
            result['stderr'] = None
            
            # Provide user-friendly error messages
            if 'timeout' in result['error'].lower():
                result['error'] = 'Code execution took too long. Please optimize your code.'
            elif 'memory' in result['error'].lower():
                result['error'] = 'Code used too much memory. Please reduce data size or complexity.'
            else:
                result['error'] = 'An error occurred during code execution. Please check your code.'
        
        return result


def create_secure_executor(spark_session: SparkSession,
                          max_memory_mb: int = 512,
                          enable_timeout: bool = True) -> SecureExecutor:
    """
    Factory function to create a SecureExecutor instance.
    
    Args:
        spark_session: PySpark SparkSession instance
        max_memory_mb: Maximum memory usage in MB
        enable_timeout: Whether to enable timeout enforcement
        
    Returns:
        SecureExecutor instance
    """
    return SecureExecutor(
        spark_session=spark_session,
        max_memory_mb=max_memory_mb,
        enable_timeout=enable_timeout
    )


if __name__ == "__main__":
    # Test the secure executor
    from pyspark.sql import SparkSession
    
    # Create Spark session
    spark = SparkSession.builder \
        .appName("SecureExecutorTest") \
        .master("local[*]") \
        .getOrCreate()
    
    # Create executor
    executor = create_secure_executor(spark, max_memory_mb=512)
    
    # Test safe code
    print("Testing safe code...")
    result = executor.execute("print('Hello from secure executor!')")
    print(f"Result: {result}\n")
    
    # Test plotting (if enabled)
    if VISUALIZATION_ENABLED:
        print("Testing plotting...")
        plot_code = """
import matplotlib.pyplot as plt
plt.plot([1, 2, 3], [4, 5, 6])
plt.title('Test Plot')
"""
        result = executor.execute(plot_code)
        print(f"Plot Result: {'Image Captured' if result.get('image') else 'No Image'}\n")
    
    spark.stop()
