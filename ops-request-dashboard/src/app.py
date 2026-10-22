"""Ops Request Dashboard. Run from the project folder: streamlit run src/app.py"""

import pandas as pd
import streamlit as st
from dotenv import load_dotenv

from ops_dashboard import db
from ops_dashboard.logic import (AGE_BUCKETS, OPEN_STATUSES, PRIORITIES, REQUEST_TYPES, STATUSES, TEAMS,
                                 age_bucket, age_hours, highlight_color, validate_request)
from ops_dashboard.summary import summarize, summary_enabled

load_dotenv()
st.set_page_config(page_title="Ops Requests", page_icon="📋", layout="wide")


def load_frame() -> pd.DataFrame:
    with db.connect() as conn:
        rows = db.load_requests(conn)
    df = pd.DataFrame(rows, columns=["id", *db.COLUMNS])
    df["age_hours"] = [age_hours(c) for c in df["created_at"]]
    df["age"] = [age_bucket(h) for h in df["age_hours"]]
    return df


def style_rows(df: pd.DataFrame):
    """Color whole rows by age: yellow over 24 hours, red over 48 hours (open requests only)."""
    def row_style(row):
        color = highlight_color(row["age_hours"], row["status"])
        css = f"background-color: {color}; color: #222" if color else ""
        return [css] * len(row)
    return df.style.apply(row_style, axis=1).format({"age_hours": "{:.1f}"})


def dashboard_page() -> None:
    st.title("Open requests")
    df = load_frame()
    if df.empty:
        st.info("No requests yet. Run `python scripts/seed.py` to load synthetic data, or add one on the New request page.")
        return

    with st.sidebar:
        st.subheader("Filters")
        statuses = st.multiselect("Status", STATUSES, default=OPEN_STATUSES)
        teams = st.multiselect("Team", TEAMS, default=TEAMS)
        types = st.multiselect("Request type", REQUEST_TYPES, default=REQUEST_TYPES)
        priorities = st.multiselect("Priority", PRIORITIES, default=PRIORITIES)
        overdue_only = st.checkbox("Only older than 24 hours")

    view = df[df["status"].isin(statuses) & df["team"].isin(teams)
              & df["request_type"].isin(types) & df["priority"].isin(priorities)]
    if overdue_only:
        view = view[view["age_hours"] > 24]

    open_view = view[view["status"].isin(OPEN_STATUSES)]
    c1, c2, c3 = st.columns(3)
    c1.metric("Open (filtered)", len(open_view))
    c2.metric("Open over 24h", int((open_view["age_hours"] > 24).sum()))
    c3.metric("Open over 48h", int((open_view["age_hours"] > 48).sum()))

    # Charts count open requests only, so finished work does not hide the backlog.
    # sort=False keeps the bars in our order instead of alphabetical.
    c1, c2, c3 = st.columns(3)
    c1.caption("By status")
    c1.bar_chart(open_view["status"].value_counts().reindex(OPEN_STATUSES, fill_value=0), sort=False)
    c2.caption("By team")
    c2.bar_chart(open_view["team"].value_counts().reindex(TEAMS, fill_value=0), sort=False)
    c3.caption("By age")
    c3.bar_chart(open_view["age"].value_counts().reindex(AGE_BUCKETS, fill_value=0), sort=False)

    st.subheader(f"Requests ({len(view)})")
    st.caption("Yellow: open for more than 24 hours. Red: open for more than 48 hours.")
    table = view.sort_values("age_hours", ascending=False)[
        ["id", "title", "team", "request_type", "priority", "status", "requester", "age_hours", "created_at"]]
    st.dataframe(style_rows(table), hide_index=True, width="stretch")
    st.download_button("Download CSV", table.to_csv(index=False), "ops_requests.csv", "text/csv")

    # Optional AI summary. Hidden unless ANTHROPIC_API_KEY is set.
    if summary_enabled():
        if st.button("Summarize open requests"):
            with st.spinner("Summarizing..."):
                try:
                    st.markdown(summarize(open_view.to_dict("records")))
                except Exception as exc:  # show the error without stopping the app
                    st.error(f"Summary failed: {type(exc).__name__}")


def intake_page() -> None:
    st.title("New request")
    with st.form("new_request", clear_on_submit=True):
        title = st.text_input("Title")
        requester = st.text_input("Your name")
        team = st.selectbox("Team", TEAMS, index=None, placeholder="Choose a team")
        request_type = st.selectbox("Request type", REQUEST_TYPES, index=None, placeholder="Choose a type")
        priority = st.selectbox("Priority", PRIORITIES, index=1)
        description = st.text_area("Description (optional)")
        submitted = st.form_submit_button("Submit request")

    if submitted:
        form = {"title": title, "requester": requester, "team": team, "request_type": request_type,
                "priority": priority, "description": description}
        errors = validate_request(form)
        if errors:
            for e in errors:
                st.error(e)
        else:
            with db.connect() as conn:
                new_id = db.insert_request(conn, form)
            st.success(f"Request #{new_id} saved.")


page = st.sidebar.radio("Page", ["Dashboard", "New request"])
if page == "Dashboard":
    dashboard_page()
else:
    intake_page()
