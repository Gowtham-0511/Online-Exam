"""
Simple validation script to test security features
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from code_validator import validate_code

def test_security_validation():
    """Run basic security validation tests"""
    
    print("="*60)
    print("PySpark Security Validation Tests")
    print("="*60)
    print()
    
    tests_passed = 0
    tests_failed = 0
    
    # Test 1: Safe code should pass
    print("[TEST 1] Safe code validation...")
    safe_code = "print('Hello, World!')"
    is_valid, violations = validate_code(safe_code)
    if is_valid:
        print("  PASS: Safe code accepted")
        tests_passed += 1
    else:
        print(f"  FAIL: Safe code rejected - {violations}")
        tests_failed += 1
    print()
    
    # Test 2: Dangerous import should be blocked
    print("[TEST 2] Dangerous import blocking...")
    dangerous_code = "import os\nos.system('ls')"
    is_valid, violations = validate_code(dangerous_code)
    if not is_valid and any('module' in v.lower() or 'os' in v.lower() for v in violations):
        print("  PASS: Dangerous import blocked")
        print(f"  Violations: {violations[0]}")
        tests_passed += 1
    else:
        print("  FAIL: Dangerous import not blocked")
        tests_failed += 1
    print()
    
    # Test 3: eval() should be blocked
    print("[TEST 3] eval() function blocking...")
    eval_code = "eval('1+1')"
    is_valid, violations = validate_code(eval_code)
    if not is_valid:
        print("  PASS: eval() blocked")
        print(f"  Violations: {violations[0]}")
        tests_passed += 1
    else:
        print("  FAIL: eval() not blocked")
        tests_failed += 1
    print()
    
    # Test 4: File operations should be blocked
    print("[TEST 4] File operation blocking...")
    file_code = "open('/etc/passwd', 'r').read()"
    is_valid, violations = validate_code(file_code)
    if not is_valid:
        print("  PASS: File operation blocked")
        print(f"  Violations: {violations[0]}")
        tests_passed += 1
    else:
        print("  FAIL: File operation not blocked")
        tests_failed += 1
    print()
    
    # Test 5: PySpark code should be allowed
    print("[TEST 5] PySpark code validation...")
    pyspark_code = """
from pyspark.sql import Row
data = [Row(name="Alice", age=25)]
df = spark.createDataFrame(data)
df.show()
"""
    is_valid, violations = validate_code(pyspark_code)
    if is_valid:
        print("  PASS: PySpark code accepted")
        tests_passed += 1
    else:
        print(f"  FAIL: PySpark code rejected - {violations}")
        tests_failed += 1
    print()
    
    # Test 6: Code size limit
    print("[TEST 6] Code size limit...")
    large_code = "x = 1\n" * 100000
    is_valid, violations = validate_code(large_code)
    if not is_valid and any('size' in v.lower() for v in violations):
        print("  PASS: Large code rejected")
        print(f"  Violations: {violations[0]}")
        tests_passed += 1
    else:
        print("  FAIL: Large code not rejected")
        tests_failed += 1
    print()
    
    # Test 7: Pandas code should be allowed
    print("[TEST 7] Pandas code validation...")
    pandas_code = """
import pandas as pd
import numpy as np
df = pd.DataFrame({'a': [1, 2, 3]})
print(df.sum())
"""
    is_valid, violations = validate_code(pandas_code)
    if is_valid:
        print("  PASS: Pandas code accepted")
        tests_passed += 1
    else:
        print(f"  FAIL: Pandas code rejected - {violations}")
        tests_failed += 1
    print()
    
    # Test 8: subprocess should be blocked
    print("[TEST 8] Subprocess blocking...")
    subprocess_code = "import subprocess\nsubprocess.call(['ls'])"
    is_valid, violations = validate_code(subprocess_code)
    if not is_valid:
        print("  PASS: Subprocess blocked")
        print(f"  Violations: {violations[0]}")
        tests_passed += 1
    else:
        print("  FAIL: Subprocess not blocked")
        tests_failed += 1
    print()
    
    # Summary
    print("="*60)
    print(f"Tests Passed: {tests_passed}/{tests_passed + tests_failed}")
    print(f"Tests Failed: {tests_failed}/{tests_passed + tests_failed}")
    print("="*60)
    
    if tests_failed == 0:
        print("\nAll security tests PASSED!")
        return 0
    else:
        print(f"\n{tests_failed} test(s) FAILED!")
        return 1

if __name__ == "__main__":
    exit_code = test_security_validation()
    sys.exit(exit_code)
