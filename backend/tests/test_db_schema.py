import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlalchemy import create_engine, inspect, text

from app import ensure_column_exists


def test_ensure_column_exists_adds_missing_column_to_sqlite_table(tmp_path):
    db_path = tmp_path / 'schema_test.db'
    engine = create_engine(f'sqlite:///{db_path}')

    with engine.begin() as conn:
        conn.execute(text('CREATE TABLE study_plan_entry (id INTEGER PRIMARY KEY, topic TEXT, review_date TEXT, user_id INTEGER)'))

    ensure_column_exists('study_plan_entry', 'plan_data', 'TEXT', engine=engine)

    inspector = inspect(engine)
    columns = {column['name'] for column in inspector.get_columns('study_plan_entry')}

    assert 'plan_data' in columns
