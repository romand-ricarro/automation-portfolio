# Implementation Plan: Automated Versioning & Release Notes (semantic-release)

This plan outlines how to implement `semantic-release` for **Relay Tracker** to automate versioning and changelog generation.

> [!IMPORTANT]
> This approach requires adding a root `package.json` to manage release dependencies and a GitHub Action. It does not touch your `frontend` or `backend` application logic.

## Proposed Changes

### 1. Project Management [NEW]

#### [NEW] [package.json](file:///Users/romand/Documents/GitHub/Relay-Tracker/package.json)

Create a root `package.json` to track the overall project version and hold release-related dependencies.

```json
{
  "name": "relay-tracker",
  "private": true,
  "version": "1.0.0",
  "devDependencies": {
    "semantic-release": "^24.2.1",
    "@semantic-release/changelog": "^6.0.3",
    "@semantic-release/git": "^10.0.1",
    "@semantic-release/github": "^11.0.1"
  }
}
```

#### [NEW] [.releaserc.json](file:///Users/romand/Documents/GitHub/Relay-Tracker/.releaserc.json)

Configure the release plugins and behavior.

```json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    [
      "@semantic-release/git",
      {
        "assets": ["package.json", "CHANGELOG.md"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ],
    "@semantic-release/github"
  ]
}
```

### 2. CI/CD Workflow [NEW]

#### [NEW] [.github/workflows/release.yml](file:///Users/romand/Documents/GitHub/Relay-Tracker/.github/workflows/release.yml)

Create the automation workflow.

```yaml
name: Release
on:
  push:
    branches:
      - main
jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Setup Node.js
        uses: actions/checkout@v4
      - name: Install dependencies
        run: npm install
      - name: Release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npx semantic-release
```

---

## How to use (Conventional Commits)

You must use standard prefixes for your commits on `staging` or `main`:

- `fix: ...` -> Bumps **Patch** (e.g., 1.0.0 -> 1.0.1)
- `feat: ...` -> Bumps **Minor** (e.g., 1.0.0 -> 1.1.0)
- `feat!: ...` -> Bumps **Major** (e.g., 1.0.0 -> 2.0.0)

---

## Required Prep Work

1. **GitHub Repository Settings**:
   - Go to **Settings > Actions > General**.
   - Set "Workflow permissions" to **Read and write permissions**.
   - Check **"Allow GitHub Actions to create and approve pull requests"**.

---

## Verification Plan

### Manual Verification

1. Run `npx semantic-release --dry-run` locally (after installing dependencies) to see the calculated next version without actually pushing.
2. Push a test commit with a `feat:` prefix and verify the GitHub Action runs and creates a Release.
