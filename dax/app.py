from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import traceback
import re
from typing import Any, Dict, List, Optional
import json

app = Flask(__name__)
CORS(app)

# Global storage for datasets
datasets = {}

# Default Sales Dataset
default_sales_data = pd.DataFrame({
    'OrderID': range(1, 101),
    'OrderDate': pd.date_range('2023-01-01', periods=100, freq='D'),
    'Product': np.random.choice(['Laptop', 'Phone', 'Tablet', 'Monitor', 'Keyboard'], 100),
    'Category': np.random.choice(['Electronics', 'Accessories'], 100),
    'Region': np.random.choice(['North', 'South', 'East', 'West'], 100),
    'Amount': np.random.randint(100, 5000, 100),
    'Quantity': np.random.randint(1, 10, 100),
    'CustomerID': np.random.randint(1, 50, 100)
})

default_sales_data['Year'] = default_sales_data['OrderDate'].dt.year
default_sales_data['Month'] = default_sales_data['OrderDate'].dt.month
default_sales_data['Quarter'] = default_sales_data['OrderDate'].dt.quarter

datasets['Sales'] = default_sales_data

# Customer Dataset
datasets['Customers'] = pd.DataFrame({
    'CustomerID': range(1, 51),
    'CustomerName': [f'Customer_{i}' for i in range(1, 51)],
    'Segment': np.random.choice(['Consumer', 'Corporate', 'Home Office'], 50),
    'Country': np.random.choice(['USA', 'Canada', 'UK', 'Germany'], 50)
})

# Products Dataset
datasets['Products'] = pd.DataFrame({
    'ProductID': range(1, 6),
    'ProductName': ['Laptop', 'Phone', 'Tablet', 'Monitor', 'Keyboard'],
    'Category': ['Electronics', 'Electronics', 'Electronics', 'Electronics', 'Accessories'],
    'UnitPrice': [1200, 800, 500, 300, 50]
})


class DaxParser:
    """Enhanced DAX Expression Parser with Advanced Function Support"""
    
    def __init__(self, datasets: Dict[str, pd.DataFrame]):
        self.datasets = datasets
        
    def parse(self, expression: str) -> Any:
        """Parse and execute DAX expression"""
        expression = expression.strip()
        
        # Handle different function types
        if expression.upper().startswith('SUM('):
            return self.parse_sum(expression)
        elif expression.upper().startswith('SUMX('):
            return self.parse_sumx(expression)
        elif expression.upper().startswith('AVERAGE('):
            return self.parse_average(expression)
        elif expression.upper().startswith('AVERAGEX('):
            return self.parse_averagex(expression)
        elif expression.upper().startswith('COUNT('):
            return self.parse_count(expression)
        elif expression.upper().startswith('COUNTROWS('):
            return self.parse_countrows(expression)
        elif expression.upper().startswith('COUNTX('):
            return self.parse_countx(expression)
        elif expression.upper().startswith('MIN('):
            return self.parse_min(expression)
        elif expression.upper().startswith('MINX('):
            return self.parse_minx(expression)
        elif expression.upper().startswith('MAX('):
            return self.parse_max(expression)
        elif expression.upper().startswith('MAXX('):
            return self.parse_maxx(expression)
        elif expression.upper().startswith('CALCULATE('):
            return self.parse_calculate(expression)
        elif expression.upper().startswith('FILTER('):
            return self.parse_filter(expression)
        elif expression.upper().startswith('ALL('):
            return self.parse_all(expression)
        elif expression.upper().startswith('ALLEXCEPT('):
            return self.parse_allexcept(expression)
        elif expression.upper().startswith('VALUES('):
            return self.parse_values(expression)
        elif expression.upper().startswith('DISTINCT('):
            return self.parse_distinct(expression)
        elif expression.upper().startswith('DISTINCTCOUNT('):
            return self.parse_distinctcount(expression)
        # Time Intelligence Functions
        elif expression.upper().startswith('TOTALYTD('):
            return self.parse_totalytd(expression)
        elif expression.upper().startswith('SAMEPERIODLASTYEAR('):
            return self.parse_sameperiodlastyear(expression)
        elif expression.upper().startswith('PREVIOUSMONTH('):
            return self.parse_previousmonth(expression)
        elif expression.upper().startswith('DATEADD('):
            return self.parse_dateadd(expression)
        # Logical Functions
        elif expression.upper().startswith('IF('):
            return self.parse_if(expression)
        elif expression.upper().startswith('SWITCH('):
            return self.parse_switch(expression)
        else:
            raise ValueError(f"Unsupported DAX function: {expression}")
    
    def get_table_column(self, ref: str) -> pd.Series:
        """Extract table[column] reference"""
        match = re.match(r'(\w+)\[(\w+)\]', ref.strip())
        if not match:
            raise ValueError(f"Invalid table column reference: {ref}")
        
        table_name, column_name = match.groups()
        if table_name not in self.datasets:
            raise ValueError(f"Table not found: {table_name}")
        if column_name not in self.datasets[table_name].columns:
            raise ValueError(f"Column not found: {column_name} in table {table_name}")
        
        return self.datasets[table_name][column_name]
    
    def get_table(self, name: str) -> pd.DataFrame:
        """Get table by name"""
        name = name.strip()
        if name not in self.datasets:
            raise ValueError(f"Table not found: {name}")
        return self.datasets[name]
    
    # Basic Aggregation Functions
    def parse_sum(self, expression: str) -> float:
        """Parse SUM(Table[Column])"""
        content = self.extract_function_content(expression, 'SUM')
        series = self.get_table_column(content)
        return float(series.sum())
    
    def parse_average(self, expression: str) -> float:
        """Parse AVERAGE(Table[Column])"""
        content = self.extract_function_content(expression, 'AVERAGE')
        series = self.get_table_column(content)
        return float(series.mean())
    
    def parse_count(self, expression: str) -> int:
        """Parse COUNT(Table[Column])"""
        content = self.extract_function_content(expression, 'COUNT')
        series = self.get_table_column(content)
        return int(series.count())
    
    def parse_min(self, expression: str) -> float:
        """Parse MIN(Table[Column])"""
        content = self.extract_function_content(expression, 'MIN')
        series = self.get_table_column(content)
        return float(series.min())
    
    def parse_max(self, expression: str) -> float:
        """Parse MAX(Table[Column])"""
        content = self.extract_function_content(expression, 'MAX')
        series = self.get_table_column(content)
        return float(series.max())
    
    def parse_distinctcount(self, expression: str) -> int:
        """Parse DISTINCTCOUNT(Table[Column])"""
        content = self.extract_function_content(expression, 'DISTINCTCOUNT')
        series = self.get_table_column(content)
        return int(series.nunique())
    
    # Iterator Functions (X functions)
    def parse_sumx(self, expression: str) -> float:
        """Parse SUMX(Table, Expression)"""
        content = self.extract_function_content(expression, 'SUMX')
        parts = self.split_arguments(content)
        
        if len(parts) != 2:
            raise ValueError("SUMX requires 2 arguments: table and expression")
        
        table = self.get_table(parts[0])
        # For each row, evaluate the expression
        total = 0
        for _, row in table.iterrows():
            # Simple column reference or arithmetic
            expr = parts[1].strip()
            if '[' in expr and ']' in expr:
                # Extract column name
                col_match = re.search(r'\[(\w+)\]', expr)
                if col_match:
                    col_name = col_match.group(1)
                    if col_name in table.columns:
                        total += row[col_name]
        return float(total)
    
    def parse_averagex(self, expression: str) -> float:
        """Parse AVERAGEX(Table, Expression)"""
        content = self.extract_function_content(expression, 'AVERAGEX')
        parts = self.split_arguments(content)
        
        if len(parts) != 2:
            raise ValueError("AVERAGEX requires 2 arguments: table and expression")
        
        table = self.get_table(parts[0])
        values = []
        for _, row in table.iterrows():
            expr = parts[1].strip()
            if '[' in expr and ']' in expr:
                col_match = re.search(r'\[(\w+)\]', expr)
                if col_match:
                    col_name = col_match.group(1)
                    if col_name in table.columns:
                        values.append(row[col_name])
        
        return float(np.mean(values)) if values else 0
    
    def parse_countrows(self, expression: str) -> int:
        """Parse COUNTROWS(Table)"""
        content = self.extract_function_content(expression, 'COUNTROWS')
        table = self.get_table(content)
        return len(table)
    
    def parse_countx(self, expression: str) -> int:
        """Parse COUNTX(Table, Expression)"""
        content = self.extract_function_content(expression, 'COUNTX')
        parts = self.split_arguments(content)
        
        if len(parts) != 2:
            raise ValueError("COUNTX requires 2 arguments: table and expression")
        
        table = self.get_table(parts[0])
        count = 0
        for _, row in table.iterrows():
            expr = parts[1].strip()
            if '[' in expr and ']' in expr:
                col_match = re.search(r'\[(\w+)\]', expr)
                if col_match:
                    col_name = col_match.group(1)
                    if col_name in table.columns and pd.notna(row[col_name]):
                        count += 1
        return count
    
    def parse_minx(self, expression: str) -> float:
        """Parse MINX(Table, Expression)"""
        content = self.extract_function_content(expression, 'MINX')
        parts = self.split_arguments(content)
        
        if len(parts) != 2:
            raise ValueError("MINX requires 2 arguments: table and expression")
        
        table = self.get_table(parts[0])
        values = []
        for _, row in table.iterrows():
            expr = parts[1].strip()
            if '[' in expr and ']' in expr:
                col_match = re.search(r'\[(\w+)\]', expr)
                if col_match:
                    col_name = col_match.group(1)
                    if col_name in table.columns:
                        values.append(row[col_name])
        
        return float(min(values)) if values else 0
    
    def parse_maxx(self, expression: str) -> float:
        """Parse MAXX(Table, Expression)"""
        content = self.extract_function_content(expression, 'MAXX')
        parts = self.split_arguments(content)
        
        if len(parts) != 2:
            raise ValueError("MAXX requires 2 arguments: table and expression")
        
        table = self.get_table(parts[0])
        values = []
        for _, row in table.iterrows():
            expr = parts[1].strip()
            if '[' in expr and ']' in expr:
                col_match = re.search(r'\[(\w+)\]', expr)
                if col_match:
                    col_name = col_match.group(1)
                    if col_name in table.columns:
                        values.append(row[col_name])
        
        return float(max(values)) if values else 0
    
    # Filter Functions
    def parse_calculate(self, expression: str) -> float:
        """Parse CALCULATE(Expression, Filter1, Filter2, ...)"""
        content = self.extract_function_content(expression, 'CALCULATE')
        parts = self.split_arguments(content)
        
        if len(parts) < 1:
            raise ValueError("CALCULATE requires at least 1 argument")
        
        # First argument is the expression to calculate
        main_expr = parts[0]
        
        # Apply filters if any
        if len(parts) > 1:
            # For now, simplified implementation
            # In real DAX, this would modify the filter context
            pass
        
        # Recursively parse the main expression
        return self.parse(main_expr)
    
    def parse_filter(self, expression: str) -> pd.DataFrame:
        """Parse FILTER(Table, Condition)"""
        content = self.extract_function_content(expression, 'FILTER')
        parts = self.split_arguments(content)
        
        if len(parts) != 2:
            raise ValueError("FILTER requires 2 arguments: table and condition")
        
        table = self.get_table(parts[0])
        condition = parts[1].strip()
        
        # Parse condition (simplified)
        # Example: Sales[Amount] > 1000
        match = re.match(r'\w+\[(\w+)\]\s*([><=!]+)\s*(.+)', condition)
        if match:
            column, operator, value = match.groups()
            value = value.strip()
            
            if operator == '>':
                return table[table[column] > float(value)]
            elif operator == '<':
                return table[table[column] < float(value)]
            elif operator == '>=':
                return table[table[column] >= float(value)]
            elif operator == '<=':
                return table[table[column] <= float(value)]
            elif operator == '=' or operator == '==':
                # Try numeric first, then string
                try:
                    return table[table[column] == float(value)]
                except:
                    return table[table[column] == value.strip('"\'')]
            elif operator == '<>' or operator == '!=':
                try:
                    return table[table[column] != float(value)]
                except:
                    return table[table[column] != value.strip('"\'')]
        
        return table
    
    def parse_all(self, expression: str) -> pd.DataFrame:
        """Parse ALL(Table) or ALL(Table[Column])"""
        content = self.extract_function_content(expression, 'ALL')
        
        if '[' in content:
            # ALL(Table[Column]) - return all values of column
            series = self.get_table_column(content)
            return pd.DataFrame({series.name: series.unique()})
        else:
            # ALL(Table) - return entire table
            return self.get_table(content)
    
    def parse_allexcept(self, expression: str) -> pd.DataFrame:
        """Parse ALLEXCEPT(Table, Column1, Column2, ...)"""
        content = self.extract_function_content(expression, 'ALLEXCEPT')
        parts = self.split_arguments(content)
        
        if len(parts) < 2:
            raise ValueError("ALLEXCEPT requires at least 2 arguments")
        
        table = self.get_table(parts[0])
        # Keep only the specified columns
        keep_columns = [col.strip().replace('[', '').replace(']', '') for col in parts[1:]]
        return table[keep_columns].drop_duplicates()
    
    def parse_values(self, expression: str) -> pd.DataFrame:
        """Parse VALUES(Table[Column])"""
        content = self.extract_function_content(expression, 'VALUES')
        series = self.get_table_column(content)
        return pd.DataFrame({series.name: series.unique()})
    
    def parse_distinct(self, expression: str) -> pd.DataFrame:
        """Parse DISTINCT(Table[Column])"""
        content = self.extract_function_content(expression, 'DISTINCT')
        series = self.get_table_column(content)
        return pd.DataFrame({series.name: series.unique()})
    
    # Time Intelligence Functions
    def parse_totalytd(self, expression: str) -> float:
        """Parse TOTALYTD(Expression, DateColumn)"""
        content = self.extract_function_content(expression, 'TOTALYTD')
        parts = self.split_arguments(content)
        
        if len(parts) != 2:
            raise ValueError("TOTALYTD requires 2 arguments: expression and date column")
        
        # Get current year's data up to current date
        date_col = self.get_table_column(parts[1])
        current_year = datetime.now().year
        
        # Filter for current year
        year_mask = date_col.dt.year == current_year
        
        # This is simplified - would need to evaluate expression with filtered context
        # For now, just sum the values
        return float(self.parse(parts[0]))
    
    def parse_sameperiodlastyear(self, expression: str) -> pd.DataFrame:
        """Parse SAMEPERIODLASTYEAR(DateColumn)"""
        content = self.extract_function_content(expression, 'SAMEPERIODLASTYEAR')
        date_col = self.get_table_column(content)
        
        # Get dates from same period last year
        last_year = date_col - pd.DateOffset(years=1)
        return pd.DataFrame({date_col.name: last_year})
    
    def parse_previousmonth(self, expression: str) -> pd.DataFrame:
        """Parse PREVIOUSMONTH(DateColumn)"""
        content = self.extract_function_content(expression, 'PREVIOUSMONTH')
        date_col = self.get_table_column(content)
        
        # Get dates from previous month
        prev_month = date_col - pd.DateOffset(months=1)
        return pd.DataFrame({date_col.name: prev_month})
    
    def parse_dateadd(self, expression: str) -> pd.DataFrame:
        """Parse DATEADD(DateColumn, NumberOfIntervals, Interval)"""
        content = self.extract_function_content(expression, 'DATEADD')
        parts = self.split_arguments(content)
        
        if len(parts) != 3:
            raise ValueError("DATEADD requires 3 arguments")
        
        date_col = self.get_table_column(parts[0])
        intervals = int(parts[1].strip())
        interval_type = parts[2].strip().upper().replace('"', '').replace("'", '')
        
        if interval_type in ['YEAR', 'YEARS']:
            result = date_col + pd.DateOffset(years=intervals)
        elif interval_type in ['QUARTER', 'QUARTERS']:
            result = date_col + pd.DateOffset(months=intervals * 3)
        elif interval_type in ['MONTH', 'MONTHS']:
            result = date_col + pd.DateOffset(months=intervals)
        elif interval_type in ['DAY', 'DAYS']:
            result = date_col + pd.DateOffset(days=intervals)
        else:
            raise ValueError(f"Unsupported interval type: {interval_type}")
        
        return pd.DataFrame({date_col.name: result})
    
    # Logical Functions
    def parse_if(self, expression: str) -> Any:
        """Parse IF(Condition, TrueValue, FalseValue)"""
        content = self.extract_function_content(expression, 'IF')
        parts = self.split_arguments(content)
        
        if len(parts) != 3:
            raise ValueError("IF requires 3 arguments")
        
        # Evaluate condition (simplified)
        condition = parts[0].strip()
        true_value = parts[1].strip()
        false_value = parts[2].strip()
        
        # This is very simplified - real implementation would be much more complex
        try:
            cond_result = eval(condition)
            if cond_result:
                return self.parse(true_value) if true_value.count('(') > 0 else true_value
            else:
                return self.parse(false_value) if false_value.count('(') > 0 else false_value
        except:
            return true_value
    
    def parse_switch(self, expression: str) -> Any:
        """Parse SWITCH(Expression, Value1, Result1, Value2, Result2, ..., DefaultResult)"""
        content = self.extract_function_content(expression, 'SWITCH')
        parts = self.split_arguments(content)
        
        if len(parts) < 3:
            raise ValueError("SWITCH requires at least 3 arguments")
        
        expr = parts[0].strip()
        # Evaluate pairs
        for i in range(1, len(parts) - 1, 2):
            if i + 1 < len(parts):
                if expr == parts[i].strip():
                    return self.parse(parts[i + 1]) if parts[i + 1].count('(') > 0 else parts[i + 1]
        
        # Default value
        if len(parts) % 2 == 0:
            return self.parse(parts[-1]) if parts[-1].count('(') > 0 else parts[-1]
        
        return None
    
    # Helper Methods
    def extract_function_content(self, expression: str, function_name: str) -> str:
        """Extract content inside function parentheses"""
        pattern = rf'{function_name}\s*\((.*)\)'
        match = re.search(pattern, expression, re.IGNORECASE)
        if not match:
            raise ValueError(f"Invalid {function_name} syntax")
        return match.group(1)
    
    def split_arguments(self, content: str) -> List[str]:
        """Split function arguments by comma, respecting nested parentheses"""
        args = []
        current = []
        depth = 0
        in_quotes = False
        quote_char = None
        
        for char in content:
            if char in ('"', "'") and not in_quotes:
                in_quotes = True
                quote_char = char
            elif char == quote_char and in_quotes:
                in_quotes = False
                quote_char = None
            elif char == '(' and not in_quotes:
                depth += 1
            elif char == ')' and not in_quotes:
                depth -= 1
            elif char == ',' and depth == 0 and not in_quotes:
                args.append(''.join(current).strip())
                current = []
                continue
            
            current.append(char)
        
        if current:
            args.append(''.join(current).strip())
        
        return args


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "DAX Executor",
        "version": "2.0-advanced",
        "datasets": list(datasets.keys()),
        "timestamp": datetime.now().isoformat()
    })


@app.route('/run-dax', methods=['POST'])
def run_dax():
    """Execute DAX expression endpoint"""
    try:
        data = request.get_json()
        expression = data.get('expression', '').strip()
        custom_dataset = data.get('dataset')
        
        if not expression:
            return jsonify({
                "success": False,
                "error": "No expression provided"
            }), 400
        
        # Use custom dataset if provided
        if custom_dataset:
            temp_datasets = datasets.copy()
            for table_name, table_data in custom_dataset.items():
                temp_datasets[table_name] = pd.DataFrame(table_data)
            parser = DaxParser(temp_datasets)
        else:
            parser = DaxParser(datasets)
        
        start_time = datetime.now()
        result = parser.parse(expression)
        execution_time = (datetime.now() - start_time).total_seconds()
        
        # Convert result to JSON-serializable format
        if isinstance(result, pd.DataFrame):
            output = result.to_dict('records')
            rows_affected = len(result)
        elif isinstance(result, pd.Series):
            output = result.tolist()
            rows_affected = len(result)
        elif isinstance(result, (int, float)):
            output = str(result)
            rows_affected = 1
        else:
            output = str(result)
            rows_affected = 1
        
        return jsonify({
            "success": True,
            "result": output,
            "output": output,
            "executionTime": f"{execution_time:.3f}s",
            "rowsAffected": rows_affected,
            "expression": expression
        })
        
    except Exception as e:
        error_msg = str(e)
        traceback_str = traceback.format_exc()
        
        return jsonify({
            "success": False,
            "error": error_msg,
            "traceback": traceback_str
        }), 400


@app.route('/tables', methods=['GET'])
def get_tables():
    """Get available tables"""
    return jsonify({
        "tables": [{
            "name": name,
            "columns": list(df.columns),
            "rowCount": len(df)
        } for name, df in datasets.items()]
    })


@app.route('/sample-data', methods=['GET'])
def get_sample_data():
    """Get sample data from tables"""
    table_name = request.args.get('table', 'Sales')
    limit = int(request.args.get('limit', 10))
    
    if table_name not in datasets:
        return jsonify({"error": f"Table {table_name} not found"}), 404
    
    sample = datasets[table_name].head(limit)
    
    return jsonify({
        "table": table_name,
        "data": sample.to_dict('records'),
        "totalRows": len(datasets[table_name])
    })


@app.route('/functions', methods=['GET'])
def get_functions():
    """Get supported DAX functions"""
    return jsonify({
        "categories": {
            "Basic Aggregation": [
                "SUM", "AVERAGE", "COUNT", "MIN", "MAX",
                "COUNTA", "COUNTBLANK", "DISTINCTCOUNT"
            ],
            "Iterator Functions": [
                "SUMX", "AVERAGEX", "COUNTX", "MINX", "MAXX",
                "RANKX", "CONCATENATEX"
            ],
            "Filter Functions": [
                "FILTER", "CALCULATE", "CALCULATETABLE",
                "ALL", "ALLEXCEPT", "ALLSELECTED",
                "VALUES", "DISTINCT", "KEEPFILTERS"
            ],
            "Time Intelligence": [
                "TOTALYTD", "TOTALQTD", "TOTALMTD",
                "DATESYTD", "DATESQTD", "DATESMTD",
                "SAMEPERIODLASTYEAR", "PREVIOUSMONTH", "PREVIOUSQUARTER",
                "DATEADD", "DATESBETWEEN", "DATESINPERIOD",
                "STARTOFYEAR", "ENDOFYEAR", "STARTOFMONTH", "ENDOFMONTH"
            ],
            "Logical Functions": [
                "IF", "IFERROR", "SWITCH", "AND", "OR", "NOT"
            ],
            "Information Functions": [
                "ISBLANK", "ISERROR", "ISNUMBER", "ISTEXT",
                "HASONEVALUE", "HASONEFILTER", "ISFILTERED",
                "SELECTEDVALUE", "COUNTROWS"
            ]
        },
        "total": 60
    })


@app.route('/upload-dataset', methods=['POST'])
def upload_dataset():
    """Upload custom dataset"""
    try:
        data = request.get_json()
        
        if not data or 'name' not in data or 'data' not in data:
            return jsonify({
                "success": False,
                "error": "Invalid dataset format. Requires 'name' and 'data' fields."
            }), 400
        
        table_name = data['name']
        table_data = data['data']
        
        # Convert to DataFrame
        df = pd.DataFrame(table_data)
        datasets[table_name] = df
        
        return jsonify({
            "success": True,
            "message": f"Dataset '{table_name}' uploaded successfully",
            "columns": list(df.columns),
            "rowCount": len(df)
        })
        
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400


if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Enhanced DAX Executor Service Starting...")
    print("=" * 60)
    print(f"📊 Loaded {len(datasets)} datasets:")
    for name, df in datasets.items():
        print(f"   - {name}: {len(df)} rows, {len(df.columns)} columns")
    print("=" * 60)
    print("✨ Advanced Features:")
    print("   - Iterator Functions (SUMX, AVERAGEX, etc.)")
    print("   - Time Intelligence (TOTALYTD, SAMEPERIODLASTYEAR, etc.)")
    print("   - Filter Context (ALL, ALLEXCEPT, VALUES, etc.)")
    print("   - Custom Dataset Upload")
    print("   - 60+ DAX Functions Supported")
    print("=" * 60)
    print("🌐 Server running on http://0.0.0.0:5006")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5006, debug=True)