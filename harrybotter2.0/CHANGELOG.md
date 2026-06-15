# Changelog

All notable changes to this project are documented here.

## [2.0] - 2025-04-15
### Added
- Rebranded the bot from `techtoolsbot` to `harrybotter2.0`.
- Added `version.py` with `__version__` variable.
- Introduced `TICKET_CHANNEL_ID` environment variable support.
- Integrated timezone support with `pytz`.
- Applied Python type hints across various parts of the code.

### Changed
- Refactored imports and removed unused libraries (`uuid`, `random`).
- Improved exception handling with more specific error classes.
- Modularized code for better readability and maintainability.
- Used `discord.ui` and `tasks` for new scheduling and UI features.

### Fixed
- Fixed async issues causing delayed or missed operations.
- Corrected environment variable parsing for channel IDs.

## [1.0] - (Initial Release)
- Initial version of the bot (`techtoolsbot.py`).
- Implemented basic Discord commands and Google Sheets integration.
- Basic error handling and event listening.
