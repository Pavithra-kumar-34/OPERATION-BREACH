import os
import logging
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Load environment variables
load_dotenv()

logger = logging.getLogger("defendx.database")
logging.basicConfig(level=logging.INFO)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://defendx:defendx@localhost:5432/defendx")

# Handle standard postgresql prefix aliases if needed
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)

def get_engine():
    """Create SQLAlchemy engine with automatic fallback for seamless local execution."""
    try:
        if "postgresql" in DATABASE_URL:
            # Test PostgreSQL connection with a short timeout
            eng = create_engine(
                DATABASE_URL,
                pool_pre_ping=True,
                connect_args={"connect_timeout": 3}
            )
            # Check connection
            with eng.connect() as conn:
                logger.info("Successfully connected to PostgreSQL database.")
                return eng
        else:
            eng = create_engine(
                DATABASE_URL,
                connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
            )
            return eng
    except Exception as e:
        logger.warning(f"Could not connect to configured database ({DATABASE_URL}): {e}")
        logger.info("Falling back to local SQLite database for uninterrupted operation.")
        sqlite_url = "sqlite:///./defendx.db"
        eng = create_engine(sqlite_url, connect_args={"check_same_thread": False})
        return eng

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """FastAPI dependency yielding a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
