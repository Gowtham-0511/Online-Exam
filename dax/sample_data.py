import pandas as pd
from datetime import datetime, timedelta
import random

def get_sample_data():
    """Generate sample sales data for DAX testing"""
    
    # Products Table
    products = pd.DataFrame({
        'ProductID': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        'ProductName': ['Laptop', 'Mouse', 'Keyboard', 'Monitor', 'Headphones', 
                       'Webcam', 'Speaker', 'USB Cable', 'HDMI Cable', 'Charger'],
        'Category': ['Electronics', 'Electronics', 'Electronics', 'Electronics', 'Electronics',
                    'Accessories', 'Accessories', 'Accessories', 'Accessories', 'Accessories'],
        'Price': [1200, 25, 75, 350, 150, 80, 120, 15, 20, 45]
    })
    
    # Sales Table
    sales_data = []
    order_id = 1
    start_date = datetime(2024, 1, 1)
    
    for i in range(100):  # Generate 100 sales records
        order_date = start_date + timedelta(days=random.randint(0, 365))
        product_id = random.randint(1, 10)
        quantity = random.randint(1, 5)
        customer_id = random.randint(1, 20)
        
        # Get product price
        price = products[products['ProductID'] == product_id]['Price'].values[0]
        amount = price * quantity
        
        sales_data.append({
            'OrderID': order_id,
            'OrderDate': order_date,
            'ProductID': product_id,
            'CustomerID': customer_id,
            'Quantity': quantity,
            'Amount': amount
        })
        order_id += 1
    
    sales = pd.DataFrame(sales_data)
    
    # Customers Table
    customers = pd.DataFrame({
        'CustomerID': range(1, 21),
        'CustomerName': [f'Customer {i}' for i in range(1, 21)],
        'Region': ['North', 'South', 'East', 'West'] * 5,
        'City': ['New York', 'Miami', 'Boston', 'Seattle', 'Denver',
                'Chicago', 'Atlanta', 'Portland', 'Austin', 'Phoenix'] * 2
    })
    
    return {
        'Sales': sales,
        'Products': products,
        'Customers': customers
    }

def get_table_info():
    """Get information about available tables and columns"""
    data = get_sample_data()
    
    info = {}
    for table_name, df in data.items():
        info[table_name] = {
            'columns': df.columns.tolist(),
            'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
            'row_count': len(df),
            'sample': df.head(3).to_dict('records')
        }
    
    return info

if __name__ == "__main__":
    # Test the sample data
    data = get_sample_data()
    print("Sample Data Generated:")
    print("\nProducts Table:")
    print(data['Products'].head())
    print("\nSales Table:")
    print(data['Sales'].head())
    print("\nCustomers Table:")
    print(data['Customers'].head())
    
    print("\n\nTable Info:")
    import json
    print(json.dumps(get_table_info(), indent=2, default=str))