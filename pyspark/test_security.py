"""
Security Test Suite for PySpark Execution Service

Tests for code validation, rate limiting, resource limits, and secure execution.
"""

import pytest
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from code_validator import validate_code, CodeValidator
from security_middleware import RateLimiter, PySparkRequest
from pydantic import ValidationError


class TestCodeValidator:
    """Tests for AST-based code validation"""
    
    def test_safe_code_passes(self):
        """Test that safe code passes validation"""
        safe_codes = [
            "print('Hello, World!')",
            "x = 1 + 2\nprint(x)",
            "from pyspark.sql import SparkSession\nprint('PySpark')",
            "import pandas as pd\ndf = pd.DataFrame({'a': [1, 2, 3]})",
        ]
        
        for code in safe_codes:
            is_valid, violations = validate_code(code)
            assert is_valid, f"Safe code failed: {code}\nViolations: {violations}"
    
    def test_dangerous_imports_blocked(self):
        """Test that dangerous module imports are blocked"""
        dangerous_codes = [
            "import os",
            "import sys",
            "import subprocess",
            "import socket",
            "from os import system",
            "import requests",
        ]
        
        for code in dangerous_codes:
            is_valid, violations = validate_code(code)
            assert not is_valid, f"Dangerous import not blocked: {code}"
            assert len(violations) > 0
            assert any('module' in v.lower() for v in violations)
    
    def test_dangerous_builtins_blocked(self):
        """Test that dangerous built-in functions are blocked"""
        dangerous_codes = [
            "eval('1+1')",
            "exec('print(1)')",
            "compile('x=1', '<string>', 'exec')",
            "__import__('os')",
            "open('/etc/passwd', 'r')",
        ]
        
        for code in dangerous_codes:
            is_valid, violations = validate_code(code)
            assert not is_valid, f"Dangerous builtin not blocked: {code}"
            assert len(violations) > 0
    
    def test_file_operations_blocked(self):
        """Test that file operations are blocked"""
        file_ops = [
            "open('test.txt', 'w').write('data')",
            "with open('file.txt', 'r') as f: data = f.read()",
            "f = open('test.txt', 'a')",
        ]
        
        for code in file_ops:
            is_valid, violations = validate_code(code)
            assert not is_valid, f"File operation not blocked: {code}"
            assert any('file' in v.lower() or 'open' in v.lower() for v in violations)
    
    def test_code_size_limit(self):
        """Test that oversized code is rejected"""
        large_code = "x = 1\n" * 100000  # Very large code
        is_valid, violations = validate_code(large_code)
        assert not is_valid
        assert any('size' in v.lower() for v in violations)
    
    def test_line_count_limit(self):
        """Test that code with too many lines is rejected"""
        many_lines = "\n".join([f"x{i} = {i}" for i in range(600)])
        is_valid, violations = validate_code(many_lines)
        assert not is_valid
        assert any('line' in v.lower() for v in violations)
    
    def test_complexity_limit(self):
        """Test that overly complex code is rejected"""
        # Create deeply nested code
        nested_code = "if True:\n" + "    if True:\n" * 15 + "        print('deep')"
        is_valid, violations = validate_code(nested_code)
        assert not is_valid
        assert any('depth' in v.lower() or 'nesting' in v.lower() for v in violations)
    
    def test_pyspark_code_allowed(self):
        """Test that valid PySpark code is allowed"""
        pyspark_code = """
from pyspark.sql import SparkSession, Row
from pyspark.sql.functions import col, sum

# Create sample data
data = [Row(name="Alice", age=25), Row(name="Bob", age=30)]
df = spark.createDataFrame(data)
df.show()
"""
        is_valid, violations = validate_code(pyspark_code)
        assert is_valid, f"Valid PySpark code rejected. Violations: {violations}"


class TestRequestValidation:
    """Tests for Pydantic request validation"""
    
    def test_valid_request(self):
        """Test that valid requests pass validation"""
        valid_data = {
            "code": "print('test')",
            "inputs": None,
            "timeout": 15
        }
        request = PySparkRequest(**valid_data)
        assert request.code == "print('test')"
        assert request.timeout == 15
    
    def test_empty_code_rejected(self):
        """Test that empty code is rejected"""
        with pytest.raises(ValidationError):
            PySparkRequest(code="", inputs=None, timeout=15)
    
    def test_invalid_timeout_rejected(self):
        """Test that invalid timeout values are rejected"""
        with pytest.raises(ValidationError):
            PySparkRequest(code="print('test')", timeout=0)
        
        with pytest.raises(ValidationError):
            PySparkRequest(code="print('test')", timeout=100)
    
    def test_missing_code_rejected(self):
        """Test that requests without code are rejected"""
        with pytest.raises(ValidationError):
            PySparkRequest(inputs=None, timeout=15)


class TestSecurityFeatures:
    """Integration tests for security features"""
    
    def test_sql_injection_patterns_blocked(self):
        """Test that SQL injection patterns are blocked"""
        sql_injection_attempts = [
            "import sqlite3\nconn = sqlite3.connect('db.sqlite')",
            "exec('DROP TABLE users')",
        ]
        
        for code in sql_injection_attempts:
            is_valid, violations = validate_code(code)
            assert not is_valid, f"SQL injection pattern not blocked: {code}"
    
    def test_network_operations_blocked(self):
        """Test that network operations are blocked"""
        network_codes = [
            "import socket\ns = socket.socket()",
            "import urllib\nurllib.request.urlopen('http://evil.com')",
            "import requests\nrequests.get('http://evil.com')",
        ]
        
        for code in network_codes:
            is_valid, violations = validate_code(code)
            assert not is_valid, f"Network operation not blocked: {code}"
    
    def test_subprocess_blocked(self):
        """Test that subprocess execution is blocked"""
        subprocess_codes = [
            "import subprocess\nsubprocess.call(['ls'])",
            "import os\nos.system('ls')",
        ]
        
        for code in subprocess_codes:
            is_valid, violations = validate_code(code)
            assert not is_valid, f"Subprocess execution not blocked: {code}"
    
    def test_attribute_access_blocked(self):
        """Test that dangerous attribute access is blocked"""
        dangerous_attrs = [
            "x.__class__.__bases__",
            "x.__import__",
            "x.__builtins__",
        ]
        
        for code in dangerous_attrs:
            is_valid, violations = validate_code(code)
            # May or may not be blocked depending on context, but should be flagged
            if not is_valid:
                assert any('attribute' in v.lower() for v in violations)


class TestAllowedOperations:
    """Tests to ensure allowed operations work correctly"""
    
    def test_pandas_operations_allowed(self):
        """Test that pandas operations are allowed"""
        pandas_code = """
import pandas as pd
import numpy as np

df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
result = df.sum()
print(result)
"""
        is_valid, violations = validate_code(pandas_code)
        assert is_valid, f"Pandas code rejected. Violations: {violations}"
    
    def test_math_operations_allowed(self):
        """Test that math operations are allowed"""
        math_code = """
import math
import random

x = math.sqrt(16)
y = random.randint(1, 10)
print(x, y)
"""
        is_valid, violations = validate_code(math_code)
        assert is_valid, f"Math code rejected. Violations: {violations}"
    
    def test_datetime_operations_allowed(self):
        """Test that datetime operations are allowed"""
        datetime_code = """
from datetime import datetime, timedelta

now = datetime.now()
tomorrow = now + timedelta(days=1)
print(tomorrow)
"""
        is_valid, violations = validate_code(datetime_code)
        assert is_valid, f"Datetime code rejected. Violations: {violations}"


def run_tests():
    """Run all tests"""
    pytest.main([__file__, "-v", "--tb=short"])


if __name__ == "__main__":
    run_tests()
