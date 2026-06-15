# Automated Versioning & Release Notes Implementation Plan

## Goal

Automate the versioning (v1.0.0, v1.0.1, etc.) and generation of release notes for InsightPulse based on commit messages.

## Technical Stack

- **Tools**: `semantic-release` (Core engine)
- **CI/CD**: GitHub Actions
- **Standard**: Conventional Commits

---

## Proposed Changes

### 1. Configuration Files [NEW]

#### [.releaserc](file:///Users/romand/Documents/GitHub/SurveyApp/.releaserc)

Configure the release workflow:

- `commit-analyzer`: Decides version bump based on messages.
- `release-notes-generator`: Creates the changelog text.
- `changelog`: Updates the physical `CHANGELOG.md` file.
- `git`: Commits the version bump back to the repo.
- `github`: Creates the GitHub Release.

#### [.github/workflows/release.yml](file:///Users/romand/Documents/GitHub/SurveyApp/.github/workflows/release.yml)

The automated workflow that runs on every merge to `main`.

### 2. Dependency Updates

#### [package.json](file:///Users/romand/Documents/GitHub/SurveyApp/package.json)

Add `semantic-release` and its plugins as `devDependencies`.

---

## How to use (The "Thinking" Part)

Once implemented, you only need to follow these commit prefixes:

- `feat: ...` -> Bumps **Minor** (v1.1.0)
- `fix: ...` -> Bumps **Patch** (v1.0.1)
- `perf: ...` -> Bumps **Patch**
- `feat!: ...` or `BREAKING CHANGE: ...` -> Bumps **Major** (v2.0.0)

---

## Verification Plan

### Test Run

1. Create a branch `test-release`.
2. Push a few commits with standard prefixes.
3. Run `npx semantic-release --dry-run` to see what it _would_ have done without actually publishing.

---

## Required Prep Work

1. **GitHub Secret**: You will need to create a Personal Access Token (PAT) or use the default `GITHUB_TOKEN` and ensure it has write permissions to push the `CHANGELOG.md` back to the repo.

---

## Estimated Time

- Dependency & Workflow Setup: 45 minutes
- Testing & Secret Config: 30 minutes
- **Total: ~1.25 hours**
