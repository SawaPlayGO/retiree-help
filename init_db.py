"""
Database initialization script using SQLAlchemy ORM.
Creates all tables based on models instead of using Alembic.
"""
import sys
from src.backend.database import db_manager


def init_db():
    """Initialize database by creating all tables."""
    try:
        print("Initializing database...")
        
        # Create all tables using the db_manager
        db_manager.init_db()
        
        print("✓ Database initialized successfully")
        return True
    except Exception as e:
        print(f"✗ Error initializing database: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = init_db()
    sys.exit(0 if success else 1)
