import sys
import os

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base, SessionLocal
from sqlalchemy import inspect, text
from seed import seed_database

def migrate_additive_columns():
    required_columns = {
        "scenarios": {
            "stage_prompts_json": "TEXT DEFAULT '{}'",
            "tactical_hints_json": "TEXT DEFAULT '[]'",
            "report_fields_json": "TEXT DEFAULT '[]'"
        },
        "scenario_progress": {
            "paused_at": "TIMESTAMP",
            "total_paused_seconds": "INTEGER DEFAULT 0"
        }
    }
    inspector = inspect(engine)
    with engine.begin() as connection:
        for table_name, columns in required_columns.items():
            if table_name not in inspector.get_table_names():
                continue
            existing = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, column_type in columns.items():
                if column_name not in existing:
                    connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}"))

def init_db():
    print("=== DEFENDX Database Initialization ===")
    print("Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables successfully verified/created.")
    migrate_additive_columns()
    print("Additive schema migration completed.")

    db = SessionLocal()
    try:
        print("Seeding initial administrator, academy modules, scenarios, and default teams...")
        seed_database(db)
        print("Initialization complete! DEFENDX is ready to run.")
    except Exception as e:
        print(f"Error during database seeding: {e}")
        db.rollback()
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
