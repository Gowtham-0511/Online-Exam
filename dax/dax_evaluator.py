import pandas as pd
import numpy as np
from datetime import datetime
import re

class DaxEvaluator:
    """Evaluate DAX expressions against pandas DataFrames"""
    
    def __init__(self, data):
        """
        Initialize with sample data
        data: dict of table_name -> DataFrame
        """
        self.data = data
        
    def evaluate(self, expression):
        """
        Evaluate a DAX expression
        Returns: result value
        """
        try:
            # Clean expression
            expression = expression.strip()
            
            # Handle basic aggregations
            result = self._evaluate_expression(expression)
            
            return {
                'success': True,
                'result': result,
                'type': type(result).__name__
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def _evaluate_expression(self, expr):
        """Main evaluation logic"""
        
        # Remove whitespace
        expr = expr.strip()
        
        # Basic Aggregations
        if expr.startswith('SUM('):
            return self._eval_sum(expr)
        elif expr.startswith('AVERAGE('):
            return self._eval_average(expr)
        elif expr.startswith('COUNT('):
            return self._eval_count(expr)
        elif expr.startswith('MIN('):
            return self._eval_min(expr)
        elif expr.startswith('MAX('):
            return self._eval_max(expr)
        
        # CALCULATE function (intermediate)
        elif expr.startswith('CALCULATE('):
            return self._eval_calculate(expr)
        
        # FILTER function (intermediate)
        elif expr.startswith('FILTER('):
            return self._eval_filter(expr)
        
        else:
            raise ValueError(f"Unsupported DAX function: {expr}")
    
    def _parse_column_reference(self, ref):
        """Parse Table[Column] reference"""
        match = re.match(r'(\w+)\[(\w+)\]', ref)
        if match:
            table_name = match.group(1)
            column_name = match.group(2)
            
            if table_name not in self.data:
                raise ValueError(f"Table '{table_name}' not found")
            
            df = self.data[table_name]
            
            if column_name not in df.columns:
                raise ValueError(f"Column '{column_name}' not found in table '{table_name}'")
            
            return df[column_name]
        else:
            raise ValueError(f"Invalid column reference: {ref}")
    
    def _eval_sum(self, expr):
        """Evaluate SUM(Table[Column])"""
        # Extract column reference
        match = re.search(r'SUM\((.*?)\)', expr)
        if not match:
            raise ValueError("Invalid SUM syntax")
        
        col_ref = match.group(1).strip()
        column = self._parse_column_reference(col_ref)
        
        return float(column.sum())
    
    def _eval_average(self, expr):
        """Evaluate AVERAGE(Table[Column])"""
        match = re.search(r'AVERAGE\((.*?)\)', expr)
        if not match:
            raise ValueError("Invalid AVERAGE syntax")
        
        col_ref = match.group(1).strip()
        column = self._parse_column_reference(col_ref)
        
        return float(column.mean())
    
    def _eval_count(self, expr):
        """Evaluate COUNT(Table[Column])"""
        match = re.search(r'COUNT\((.*?)\)', expr)
        if not match:
            raise ValueError("Invalid COUNT syntax")
        
        col_ref = match.group(1).strip()
        column = self._parse_column_reference(col_ref)
        
        return int(column.count())
    
    def _eval_min(self, expr):
        """Evaluate MIN(Table[Column])"""
        match = re.search(r'MIN\((.*?)\)', expr)
        if not match:
            raise ValueError("Invalid MIN syntax")
        
        col_ref = match.group(1).strip()
        column = self._parse_column_reference(col_ref)
        
        return float(column.min())
    
    def _eval_max(self, expr):
        """Evaluate MAX(Table[Column])"""
        match = re.search(r'MAX\((.*?)\)', expr)
        if not match:
            raise ValueError("Invalid MAX syntax")
        
        col_ref = match.group(1).strip()
        column = self._parse_column_reference(col_ref)
        
        return float(column.max())
    
    def _eval_calculate(self, expr):
        """
        Evaluate CALCULATE(expression, filter1, filter2, ...)
        Example: CALCULATE(SUM(Sales[Amount]), Products[Category]="Electronics")
        """
        # Extract content inside CALCULATE
        match = re.search(r'CALCULATE\((.*)\)', expr, re.DOTALL)
        if not match:
            raise ValueError("Invalid CALCULATE syntax")
        
        content = match.group(1)
        
        # Split by comma (simple parsing - doesn't handle nested functions yet)
        parts = self._smart_split(content)
        
        if len(parts) < 2:
            raise ValueError("CALCULATE requires at least 2 arguments: expression and filter")
        
        base_expr = parts[0].strip()
        filters = [p.strip() for p in parts[1:]]
        
        # Apply filters
        filtered_data = self._apply_filters(filters)
        
        # Create temporary evaluator with filtered data
        temp_evaluator = DaxEvaluator(filtered_data)
        
        # Evaluate the base expression
        result = temp_evaluator._evaluate_expression(base_expr)
        
        return result
    
    def _smart_split(self, text):
        """Split by comma but respect parentheses"""
        parts = []
        current = []
        depth = 0
        
        for char in text:
            if char == '(':
                depth += 1
            elif char == ')':
                depth -= 1
            elif char == ',' and depth == 0:
                parts.append(''.join(current))
                current = []
                continue
            
            current.append(char)
        
        if current:
            parts.append(''.join(current))
        
        return parts
    
    def _apply_filters(self, filters):
        """Apply filters to data tables"""
        filtered_data = {}
        
        for table_name, df in self.data.items():
            filtered_df = df.copy()
            
            for filter_expr in filters:
                filtered_df = self._apply_single_filter(filtered_df, table_name, filter_expr)
            
            filtered_data[table_name] = filtered_df
        
        return filtered_data
    
    def _apply_single_filter(self, df, table_name, filter_expr):
        """Apply a single filter expression"""
        # Parse filter: Table[Column]="Value" or Table[Column]=Value
        
        # Handle string comparison
        match = re.search(r'(\w+)\[(\w+)\]\s*=\s*"([^"]+)"', filter_expr)
        if match:
            filter_table = match.group(1)
            filter_column = match.group(2)
            filter_value = match.group(3)
            
            if filter_table != table_name:
                # Need to join tables (simplified - assumes ProductID relationship)
                if filter_table in self.data:
                    other_df = self.data[filter_table]
                    # Simple join on ProductID (hardcoded for now)
                    if 'ProductID' in df.columns and 'ProductID' in other_df.columns:
                        merged = df.merge(other_df, on='ProductID', how='left')
                        return merged[merged[filter_column] == filter_value][df.columns]
            else:
                return df[df[filter_column] == filter_value]
        
        # Handle numeric comparison
        match = re.search(r'(\w+)\[(\w+)\]\s*([><=]+)\s*(\d+\.?\d*)', filter_expr)
        if match:
            filter_table = match.group(1)
            filter_column = match.group(2)
            operator = match.group(3)
            filter_value = float(match.group(4))
            
            if filter_table == table_name and filter_column in df.columns:
                if operator == '=':
                    return df[df[filter_column] == filter_value]
                elif operator == '>':
                    return df[df[filter_column] > filter_value]
                elif operator == '<':
                    return df[df[filter_column] < filter_value]
                elif operator == '>=':
                    return df[df[filter_column] >= filter_value]
                elif operator == '<=':
                    return df[df[filter_column] <= filter_value]
        
        return df
    
    def _eval_filter(self, expr):
        """
        Evaluate FILTER(Table, condition)
        Returns filtered table
        """
        match = re.search(r'FILTER\((.*?),\s*(.*?)\)', expr)
        if not match:
            raise ValueError("Invalid FILTER syntax")
        
        table_name = match.group(1).strip()
        condition = match.group(2).strip()
        
        if table_name not in self.data:
            raise ValueError(f"Table '{table_name}' not found")
        
        df = self.data[table_name].copy()
        
        # Apply condition (simplified)
        filtered_df = self._apply_single_filter(df, table_name, condition)
        
        return len(filtered_df)  # Return count of filtered rows

# Test functions
if __name__ == "__main__":
    from sample_data import get_sample_data
    
    data = get_sample_data()
    evaluator = DaxEvaluator(data)
    
    # Test basic functions
    print("Testing DAX Evaluator:")
    print("\n1. SUM(Sales[Amount]):")
    result = evaluator.evaluate("SUM(Sales[Amount])")
    print(result)
    
    print("\n2. AVERAGE(Sales[Amount]):")
    result = evaluator.evaluate("AVERAGE(Sales[Amount])")
    print(result)
    
    print("\n3. COUNT(Sales[OrderID]):")
    result = evaluator.evaluate("COUNT(Sales[OrderID])")
    print(result)
    
    print("\n4. MAX(Products[Price]):")
    result = evaluator.evaluate("MAX(Products[Price])")
    print(result)
    
    print("\n5. CALCULATE(SUM(Sales[Amount]), Products[Category]=\"Electronics\"):")
    result = evaluator.evaluate("CALCULATE(SUM(Sales[Amount]), Products[Category]=\"Electronics\")")
    print(result)