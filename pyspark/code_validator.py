"""
Code Validator Module for PySpark Execution Service

This module provides AST-based code validation to detect and prevent
execution of dangerous operations, ensuring secure code execution.
"""

import ast
from typing import List, Set, Dict, Any, Optional, Tuple


class SecurityViolation(Exception):
    """Raised when code contains security violations"""
    pass


class CodeValidator:
    """
    Validates Python code using AST analysis to detect dangerous operations.
    """
    
    # Dangerous built-in functions that should be blocked
    DANGEROUS_BUILTINS = {
        'eval', 'exec', 'compile', '__import__',
        'open', 'input', 'raw_input',
        'execfile', 'reload', 'vars', 'locals', 'globals',
        'dir', 'getattr', 'setattr', 'delattr', 'hasattr',
    }
    
    # Dangerous modules that should not be imported
    DANGEROUS_MODULES = {
        'os', 'sys', 'subprocess', 'socket', 'urllib', 'urllib2', 'urllib3',
        'requests', 'http', 'ftplib', 'telnetlib', 'smtplib',
        '__import__', '__builtins__', '__globals__', '__locals__',
        '__code__', '__class__', '__bases__', '__subclasses__',
        '__dict__', '__file__', '__name__', '__loader__',
    }
    
    # Maximum allowed complexity
    MAX_NESTING_DEPTH = 10
    MAX_LINE_COUNT = 500
    MAX_FUNCTION_COUNT = 20
    MAX_CLASS_COUNT = 5
    
    def __init__(self, strict_mode: bool = True):
        """
        Initialize the code validator.
        
        Args:
            strict_mode: If True, applies stricter validation rules
        """
        self.strict_mode = strict_mode
        self.violations: List[str] = []
    
    def validate(self, code: str) -> Tuple[bool, List[str]]:
        """
        Validate code for security violations.
        
        Args:
            code: Python code string to validate
            
        Returns:
            Tuple of (is_valid, list_of_violations)
        """
        self.violations = []
        
        # Check code size
        if len(code) > 100000:
            self.violations.append("Code size exceeds maximum limit (100KB)")
            return False, self.violations
        
        # Check line count
        line_count = len(code.split('\n'))
        if line_count > self.MAX_LINE_COUNT:
            self.violations.append(f"Code exceeds maximum line count ({self.MAX_LINE_COUNT})")
            return False, self.violations
        
        # Parse code into AST
        try:
            tree = ast.parse(code)
        except SyntaxError as e:
            self.violations.append(f"Syntax error: {str(e)}")
            return False, self.violations
        except Exception as e:
            self.violations.append(f"Failed to parse code: {str(e)}")
            return False, self.violations
        
        # Perform AST-based validation
        self._validate_ast(tree)
        
        is_valid = len(self.violations) == 0
        return is_valid, self.violations
    
    def _validate_ast(self, tree: ast.AST) -> None:
        """Validate AST tree for dangerous operations"""
        
        # Count complexity metrics
        function_count = 0
        class_count = 0
        max_depth = 0
        
        class ValidationVisitor(ast.NodeVisitor):
            def __init__(self, validator):
                self.validator = validator
                self.current_depth = 0
                self.function_count = 0
                self.class_count = 0
                self.max_depth = 0
            
            def visit(self, node):
                self.current_depth += 1
                self.max_depth = max(self.max_depth, self.current_depth)
                
                if self.current_depth > CodeValidator.MAX_NESTING_DEPTH:
                    self.validator.violations.append(
                        f"Code nesting depth exceeds maximum ({CodeValidator.MAX_NESTING_DEPTH})"
                    )
                
                result = super().visit(node)
                self.current_depth -= 1
                return result
            
            def visit_Import(self, node):
                """Check import statements"""
                for alias in node.names:
                    module_name = alias.name.split('.')[0]
                    if module_name in CodeValidator.DANGEROUS_MODULES:
                        self.validator.violations.append(
                            f"Dangerous module import detected: {alias.name}"
                        )
                    elif self.validator.strict_mode and module_name not in CodeValidator.ALLOWED_MODULES:
                        self.validator.violations.append(
                            f"Unauthorized module import: {alias.name}"
                        )
                self.generic_visit(node)
            
            def visit_ImportFrom(self, node):
                """Check from...import statements"""
                if node.module:
                    module_name = node.module.split('.')[0]
                    if module_name in CodeValidator.DANGEROUS_MODULES:
                        self.validator.violations.append(
                            f"Dangerous module import detected: {node.module}"
                        )
                    elif self.validator.strict_mode and module_name not in CodeValidator.ALLOWED_MODULES:
                        self.validator.violations.append(
                            f"Unauthorized module import: {node.module}"
                        )
                self.generic_visit(node)
            
            def visit_Call(self, node):
                """Check function calls"""
                # Check for dangerous built-in functions
                if isinstance(node.func, ast.Name):
                    if node.func.id in CodeValidator.DANGEROUS_BUILTINS:
                        self.validator.violations.append(
                            f"Dangerous function call detected: {node.func.id}()"
                        )
                
                # Check for attribute access to dangerous methods
                elif isinstance(node.func, ast.Attribute):
                    if node.func.attr in CodeValidator.DANGEROUS_ATTRIBUTES:
                        self.validator.violations.append(
                            f"Dangerous attribute access detected: {node.func.attr}"
                        )
                    
                    # Check for file operations
                    if node.func.attr in {'read', 'write', 'open', 'close', 'remove', 'unlink', 'rmdir'}:
                        self.validator.violations.append(
                            f"File operation detected: {node.func.attr}()"
                        )
                
                self.generic_visit(node)
            
            def visit_Attribute(self, node):
                """Check attribute access"""
                if node.attr in CodeValidator.DANGEROUS_ATTRIBUTES:
                    self.validator.violations.append(
                        f"Dangerous attribute access detected: {node.attr}"
                    )
                self.generic_visit(node)
            
            def visit_FunctionDef(self, node):
                """Count function definitions"""
                self.function_count += 1
                if self.function_count > CodeValidator.MAX_FUNCTION_COUNT:
                    self.validator.violations.append(
                        f"Too many function definitions ({CodeValidator.MAX_FUNCTION_COUNT} max)"
                    )
                self.generic_visit(node)
            
            def visit_AsyncFunctionDef(self, node):
                """Count async function definitions"""
                self.function_count += 1
                if self.function_count > CodeValidator.MAX_FUNCTION_COUNT:
                    self.validator.violations.append(
                        f"Too many function definitions ({CodeValidator.MAX_FUNCTION_COUNT} max)"
                    )
                self.generic_visit(node)
            
            def visit_ClassDef(self, node):
                """Count class definitions"""
                self.class_count += 1
                if self.class_count > CodeValidator.MAX_CLASS_COUNT:
                    self.validator.violations.append(
                        f"Too many class definitions ({CodeValidator.MAX_CLASS_COUNT} max)"
                    )
                self.generic_visit(node)
            
            def visit_With(self, node):
                """Check with statements (could be used for file operations)"""
                for item in node.items:
                    if isinstance(item.context_expr, ast.Call):
                        if isinstance(item.context_expr.func, ast.Name):
                            if item.context_expr.func.id == 'open':
                                self.validator.violations.append(
                                    "File operation detected: with open()"
                                )
                self.generic_visit(node)
        
        # Run the validation visitor
        visitor = ValidationVisitor(self)
        visitor.visit(tree)


def validate_code(code: str, strict_mode: bool = True) -> Tuple[bool, List[str]]:
    """
    Convenience function to validate code.
    
    Args:
        code: Python code string to validate
        strict_mode: If True, applies stricter validation rules
        
    Returns:
        Tuple of (is_valid, list_of_violations)
    """
    validator = CodeValidator(strict_mode=strict_mode)
    return validator.validate(code)


if __name__ == "__main__":
    # Test cases
    test_cases = [
        # Safe code
        ("print('Hello, World!')", True),
        ("x = 1 + 2\nprint(x)", True),
        
        # Dangerous code
        ("import os\nos.system('ls')", False),
        ("eval('1+1')", False),
        ("open('/etc/passwd', 'r')", False),
        ("__import__('os')", False),
    ]
    
    print("Running code validator tests...\n")
    for code, should_pass in test_cases:
        is_valid, violations = validate_code(code)
        status = "✓ PASS" if (is_valid == should_pass) else "✗ FAIL"
        print(f"{status}: {code[:50]}")
        if violations:
            for v in violations:
                print(f"  - {v}")
        print()
