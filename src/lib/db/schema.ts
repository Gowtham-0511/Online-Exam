import pool from "./db";

export const NORTHWIND_SCHEMA = `DATABASE SCHEMA (Northwind):

Table: Categories
Columns:
  - CategoryID (int, not null)
  - CategoryName (varchar(15), not null)
  - Description (text, nullable)

Table: Customers
Columns:
  - CustomerID (char(5), not null)
  - CompanyName (varchar(40), not null)
  - ContactName (varchar(30), nullable)
  - ContactTitle (varchar(30), nullable)
  - Address (varchar(60), nullable)
  - City (varchar(15), nullable)
  - Region (varchar(15), nullable)
  - PostalCode (varchar(10), nullable)
  - Country (varchar(15), nullable)
  - Phone (varchar(24), nullable)

Table: Employees
Columns:
  - EmployeeID (int, not null)
  - LastName (varchar(20), not null)
  - FirstName (varchar(10), not null)
  - Title (varchar(30), nullable)
  - BirthDate (datetime, nullable)
  - HireDate (datetime, nullable)
  - City (varchar(15), nullable)
  - Country (varchar(15), nullable)
  - ReportsTo (int, nullable) -> Employees(EmployeeID)

Table: OrderDetails
Columns:
  - OrderID (int, not null) -> Orders(OrderID)
  - ProductID (int, not null) -> Products(ProductID)
  - UnitPrice (decimal, not null)
  - Quantity (smallint, not null)
  - Discount (real, not null)

Table: Orders
Columns:
  - OrderID (int, not null)
  - CustomerID (char(5), nullable) -> Customers(CustomerID)
  - EmployeeID (int, nullable) -> Employees(EmployeeID)
  - OrderDate (datetime, nullable)
  - RequiredDate (datetime, nullable)
  - ShippedDate (datetime, nullable)
  - ShipVia (int, nullable) -> Shippers(ShipperID)
  - Freight (decimal, nullable)
  - ShipName (varchar(40), nullable)
  - ShipCity (varchar(15), nullable)

Table: Products
Columns:
  - ProductID (int, not null)
  - ProductName (varchar(40), not null)
  - SupplierID (int, nullable) -> Suppliers(SupplierID)
  - CategoryID (int, nullable) -> Categories(CategoryID)
  - QuantityPerUnit (varchar(20), nullable)
  - UnitPrice (decimal, nullable)
  - UnitsInStock (smallint, nullable)
  - UnitsOnOrder (smallint, nullable)
  - Discontinued (bit, not null)

Table: Shippers
Columns:
  - ShipperID (int, not null)
  - CompanyName (varchar(40), not null)
  - Phone (varchar(24), nullable)

Table: Suppliers
Columns:
  - SupplierID (int, not null)
  - CompanyName (varchar(40), not null)
  - ContactName (varchar(30), nullable)
  - City (varchar(15), nullable)
  - Country (varchar(15), nullable)
  - Phone (varchar(24), nullable)`;

// Fetch database schema
export async function fetchDatabaseSchema(): Promise<string> {
  // Forcing Northwind schema as requested by user
  return NORTHWIND_SCHEMA;
}
