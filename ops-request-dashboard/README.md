# Ops Request Dashboard

A small internal tool for a made-up operations team. People submit requests (repairs, supplies, access, schedule changes and so on), and the team lead sees what is open and what is getting old.

## What it looks like

There are two pages, picked from the sidebar.

**Dashboard**
- Three counts at the top: open requests, open for more than 24 hours, and open for more than 48 hours.
- Bar charts of open requests by status, by team and by age.
- A table of requests, oldest first. Rows open for more than 24 hours are yellow, and rows open for more than 48 hours are red. Done requests are not highlighted.
- Filters in the sidebar for status, team, request type and priority, plus an "only older than 24 hours" switch.
- A **Download CSV** button that exports the filtered table.

**New request**
- A form with title, name, team, request type, priority and an optional description.
- It shows a clear message for each problem, such as a missing title or no team chosen, and only saves when everything is valid.

**Optional AI summary.** If `ANTHROPIC_API_KEY` is set, a **Summarize open requests** button appears under the table. It sends the open requests (title, team, type, priority, status, age) to the Claude API and shows a short summary. Without a key the button is hidden and the rest of the app works the same. It is off by default.

## Run it

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
python scripts/seed.py
streamlit run src/app.py
```

Run the tests with `pytest`.

To turn on the AI summary, copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. Never commit `.env`.

## The data

All data is synthetic. `scripts/seed.py` creates 150 requests with invented first names and last initials, invented team names and invented request titles. The ages are spread over the last 7 days, and older requests are more likely to be marked Done. Running the script again replaces the data. The database is a local SQLite file at `data/ops.db`, and it is not committed.

## Stack

Python, Streamlit, pandas, SQLite, pytest (including Streamlit's `AppTest` for the pages). The Anthropic Python SDK is used only for the optional summary.

## Files

| Path | What it is |
|---|---|
| `src/app.py` | The Streamlit pages |
| `src/ops_dashboard/logic.py` | Age buckets, highlight colors and form validation |
| `src/ops_dashboard/db.py` | SQLite table, insert and load |
| `src/ops_dashboard/summary.py` | The optional AI summary |
| `scripts/seed.py` | Creates the synthetic data |
| `tests/` | Tests for age logic, validation, the summary and both pages |

## How this was built

I built this with Claude Code. I decided what the tool should do: the two pages, the 24 and 48 hour thresholds, synthetic data only, and keeping the AI summary optional and off by default. Claude Code wrote the code and tests from those requirements.

I read through the code, ran the tests and clicked through both pages before publishing.
