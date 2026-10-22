"""End-to-end checks: seed the database, render both pages, submit the form."""

import importlib.util
from pathlib import Path

import pytest
from streamlit.testing.v1 import AppTest

from ops_dashboard import db

ROOT = Path(__file__).resolve().parents[1]
APP = str(ROOT / "src" / "app.py")

spec = importlib.util.spec_from_file_location("seed", ROOT / "scripts" / "seed.py")
seed_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seed_module)


@pytest.fixture
def db_file(tmp_path, monkeypatch):
    path = tmp_path / "ops.db"
    monkeypatch.setenv("OPS_DB_PATH", str(path))
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    return path


def test_seed_creates_requests_with_known_values(db_file):
    with db.connect(db_file) as conn:
        seed_module.seed(conn, count=150)
        rows = db.load_requests(conn)
    assert len(rows) == 150
    assert {r["status"] for r in rows} <= {"New", "In progress", "Waiting", "Done"}


def test_dashboard_renders_and_hides_summary_without_key(db_file):
    with db.connect(db_file) as conn:
        seed_module.seed(conn, count=150)
    at = AppTest.from_file(APP, default_timeout=15).run()
    assert not at.exception
    assert at.title[0].value == "Open requests"
    assert not [b for b in at.button if b.label == "Summarize open requests"]


def test_summary_button_shows_when_key_is_set(db_file, monkeypatch):
    with db.connect(db_file) as conn:
        seed_module.seed(conn, count=20)
    monkeypatch.setenv("ANTHROPIC_API_KEY", "placeholder-for-test")
    at = AppTest.from_file(APP, default_timeout=15).run()
    assert [b for b in at.button if b.label == "Summarize open requests"]


def test_intake_form_rejects_bad_input_and_saves_good_input(db_file):
    at = AppTest.from_file(APP, default_timeout=15).run()
    at.sidebar.radio[0].set_value("New request").run()

    at.button[0].click().run()  # submit an empty form
    assert len(at.error) >= 3
    with db.connect(db_file) as conn:
        assert db.load_requests(conn) == []

    at.text_input[0].input("Restock safety gloves")
    at.text_input[1].input("Jamie K.")
    at.selectbox[0].set_value("Warehouse")
    at.selectbox[1].set_value("Supplies order")
    at.button[0].click().run()
    assert not at.error
    assert "saved" in at.success[0].value
    with db.connect(db_file) as conn:
        rows = db.load_requests(conn)
    assert [(r["title"], r["status"]) for r in rows] == [("Restock safety gloves", "New")]
