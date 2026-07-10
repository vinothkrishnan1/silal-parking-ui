import sqlite3
import os

# Path to your database
db_path = os.path.join(os.getcwd(), 'instance', 'parking.db')
if not os.path.exists(db_path):
    db_path = 'parking.db' # Fallback if instance folder isn't used

print(f"Connecting to database at: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # List of columns to add to the 'tenants' table
    # Format: (column_name, data_type, default_value)
    new_columns = [
        ('start_date', 'DATE', 'NULL'),
        ('end_date', 'DATE', 'NULL'),
        ('is_tenant', 'BOOLEAN', '1'),
        ('is_master', 'BOOLEAN', '0'),
        ('tenant_type', 'VARCHAR(50)', "'Tenant'"),
        ('vehicle_type', 'VARCHAR(50)', 'NULL'),
        ('subscription_plan_id', 'INTEGER', 'NULL'),
        ('amount_paid', 'FLOAT', '0.0'),
        ('payment_method', 'VARCHAR(50)', 'NULL'),
        ('payment_status', 'VARCHAR(50)', "'Pending'"),
        ('transaction_id', 'VARCHAR(100)', 'NULL'),
        ('payment_date', 'DATE', 'NULL'),
        ('created_at', 'DATETIME', 'CURRENT_TIMESTAMP')
    ]

    for col_name, col_type, default in new_columns:
        try:
            print(f"Adding column {col_name}...")
            cursor.execute(f"ALTER TABLE tenants ADD COLUMN {col_name} {col_type} DEFAULT {default}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col_name} already exists. Skipping.")
            else:
                print(f"Error adding {col_name}: {e}")

    conn.commit()
    conn.close()
    print("Database schema updated successfully!")

except Exception as e:
    print(f"An error occurred: {e}")
