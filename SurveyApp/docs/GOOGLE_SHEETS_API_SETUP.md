# Google Sheets API Setup

The application reads survey responses directly from a Google Sheet. Follow these steps to configure access.

## 1. Create a Google Cloud Project
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g., "InsightPulse").

## 2. Enable APIs
1. In the sidebar, go to **APIs & Services > Library**.
2. Search for **Google Sheets API**.
3. Click **Enable**.

## 3. Create Service Account
1. Go to **APIs & Services > Credentials**.
2. Click **Create Credentials** > **Service Account**.
3. Name it (e.g., "survey-reader") and click **Create**.
4. Grant it the role **Viewer** (optional, but good practice).
5. Click **Done**.

## 4. Generate Keys
1. Click on the newly created service account email.
2. Go to the **Keys** tab.
3. Click **Add Key** > **Create new key**.
4. Select **JSON** and create.
5. The file will download automatically. **Keep this file secure.**

## 5. Configure Application
1. Open the downloaded JSON file.
2. Copy the entire content.
3. In your `backend/.env` file, paste it into the `GOOGLE_SHEETS_CREDENTIALS` variable.
   - *Note: Ensure it is a single line or properly escaped if using a .env parser that supports valid JSON, or pass the path. Our implementation expects the JSON string content.*

## 6. Share the Spreadsheet
1. clearOpen your Google Sheet with the survey responses.
2. Click **Share**.
3. Paste the **Service Account Email** (from step 3).
4. Give it **Viewer** access.
5. Copy the **Spreadsheet ID** from the URL (between `/d/` and `/edit`).
6. Paste the ID into `backend/.env` as `GOOGLE_SHEETS_SPREADSHEET_ID`.
