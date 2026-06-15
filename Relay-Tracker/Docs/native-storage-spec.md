# Native Cloud Storage Specification (R2)

## 1. Context & Constraints

- **Objective:** Implement drag-and-drop file uploads for Issues using Cloudflare R2.
- **Tech Stack:** React (Vite), Python (Flask), Boto3.
- **Architecture:** "Presigned URL" pattern. Browser uploads directly to R2 to bypass Vercel's 4.5MB body limit.
- **Constraints:**
  - MUST use `boto3` for S3 interaction.
  - MUST NOT stream files through the Flask backend.
  - MUST use relative imports in Python (e.g., from ..utils import ...).
  - **Environment:** Detect `S3_ENDPOINT_URL` to support R2.

## 2. Architecture & Data Model

### Database Schema (Migration)

**Table:** `issue_attachments`

| Column        | Type      | Notes                                  |
| :------------ | :-------- | :------------------------------------- |
| `id`          | TEXT      | Primary Key (UUID)                     |
| `issue_key`   | TEXT      | Foreign Key to Issue (e.g., 'BUG-123') |
| `uploader_id` | TEXT      | User ID (who uploaded it)              |
| `filename`    | TEXT      | Original name (e.g., 'error.png')      |
| `url`         | TEXT      | Public URL to view the file            |
| `size`        | INTEGER   | File size in Bytes                     |
| `mime_type`   | TEXT      | e.g., 'image/png'                      |
| `created_at`  | TIMESTAMP | Default NOW                            |

### Data Flow

1.  **User** drops file on UI.
2.  **UI** -> `POST /api/upload/sign` (sends filename and file type).
3.  **API** generates Presigned PUT URL using `boto3` -> returns to UI.
4.  **UI** `PUT` file directly to the R2 signed URL.
5.  **UI** -> `POST /api/issues/{key}/attachments` (saves metadata to DB).

## 3. Implementation Plan (Atomic & Phased)

### Phase 1: Backend Infrastructure

- **Goal:** Enable Python to talk to Cloudflare R2.
- **Files to Modify:**
  - `backend/api/requirements.txt`: Add `boto3`.
  - `backend/api/utils/storage.py` (NEW): Logic to generate presigned URLs.
  - `backend/api/routes/upload.py` (NEW): Endpoint for signing.
  - `backend/api/index.py`: Register new blueprint.
- **Logic:**
  - Initialize `boto3.client('s3', ...)` using env vars.
  - **Crucial:** When initializing boto3 for R2, you MUST pass `config=Config(signature_version='s3v4')` or uploads will fail.
  - Function `generate_presigned_url(filename, file_type)` should return a URL valid for 300 seconds.

### Phase 2: Database Migration Script

- **Goal:** Create the SQL file for the user to run manually.
- **Files to Create:**
  - `backend/migrations/001_create_attachments.sql` (NEW)
- **Content:**
  ```sql
  CREATE TABLE IF NOT EXISTS issue_attachments (
      id TEXT PRIMARY KEY,
      issue_key TEXT NOT NULL,
      uploader_id TEXT,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      size INTEGER,
      mime_type TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (issue_key) REFERENCES issues(key)
  );
  ```

### Phase 3: Frontend Upload Service

- **Goal:** Utility functions to handle the "Ask -> Upload -> Confirm" dance.
- **Files to Modify:**
  - `frontend/src/lib/upload.ts` (NEW).
- **Logic:**
  - `uploadFile(file)` function:
    - Request signed URL from backend.
    - `PUT` binary file data to signed URL.
    - Return the clean public URL.

### Phase 4: UI Integration

- **Goal:** Add Drag & Drop zone to `CreateIssueModal`.
- **Files to Modify:**
  - `frontend/src/components/issues/CreateIssueModal.tsx`.
  - `frontend/src/components/ui/FileDropzone.tsx` (NEW).
- **Logic:**
  - Use HTML5 drag-and-drop API.
  - Show simple progress indicator (loading state).
  - Add uploaded file URL to the form payload so it gets saved with the issue.

## 4. Verification & Testing

### Manual Verification Steps:

1.  Ensure `backend/api/.env` has R2 keys.
2.  Run `turso db shell relay-tracker-staging < backend/migrations/001_create_attachments.sql` (User Action).
3.  Open App -> Create Issue -> Drop an image.
4.  Verify network tab shows 200 OK on the `PUT` request.
5.  Verify image appears in the issue list.
