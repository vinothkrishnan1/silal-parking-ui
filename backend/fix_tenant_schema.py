import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

engine = create_engine(os.getenv('FLASK_SQLALCHEMY_DATABASE_URI'))

with engine.connect() as conn:
    print("Modifying 'tenants' table to make 'car_numberplate' nullable...")
    conn.execute(text("ALTER TABLE tenants MODIFY car_numberplate VARCHAR(20) NULL"))
    conn.commit()
    print("Success!")
