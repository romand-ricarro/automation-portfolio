FROM python:3.12-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DATABASE_PATH=/data/notify.db

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
RUN useradd --create-home appuser && mkdir /data && chown appuser /data
USER appuser

EXPOSE 8000
# ADMIN_API_KEY must be passed at runtime, e.g. `docker run --env-file .env ...`
CMD ["uvicorn", "notify_api.asgi:app", "--app-dir", "src", "--host", "0.0.0.0", "--port", "8000"]
