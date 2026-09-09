import sys
import os

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base, SessionLocal
from seed import seed_database

def init_db():
    print("=== DEFENDX Database Initialization ===")
    print("Creating all database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables successfully verified/created.")

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
