from pathlib import Path

from streamlit.testing.v1 import AppTest

APP = str(Path(__file__).parent.parent / "src" / "app.py")
FIXTURES = str(Path(__file__).parent / "fixtures")


def test_app_retrieves_passages_without_api_key(monkeypatch):
    monkeypatch.setenv("DOCS_DIR", FIXTURES)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)

    at = AppTest.from_file(APP).run()
    assert not at.exception
    assert at.sidebar.metric[0].value == "2"
    assert int(at.sidebar.metric[1].value) >= 6  # at least one chunk per section

    at.text_input[0].input("How many books can I borrow?").run()
    assert not at.exception
    assert "Borrowing" in at.expander[0].label


def test_app_warns_when_no_documents(monkeypatch, tmp_path):
    monkeypatch.setenv("DOCS_DIR", str(tmp_path))
    at = AppTest.from_file(APP).run()
    assert "fetch_docs.py" in at.warning[0].value
