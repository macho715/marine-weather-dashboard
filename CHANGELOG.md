# Changelog

## [Unreleased]

### Added

- feat(marine_ops): add Stormglass, WorldTides, and Open-Meteo fallback connectors normalized to a shared schema with unit metadata
- feat(core): implement unit conversions, quality control, bias correction, and weighted ensemble utilities for marine datasets
- feat(eri): deliver ERI v0 rule loader, computation pipeline, sample CSV generators, and PowerShell health check
- feat(fusion): add ADNOC × Al Bahar fusion decision algorithm with Go/Conditional/No-Go gates and ETA calculation
- feat(settings): provide `MarineOpsSettings` for environment-driven connector bootstrapping
- feat(fallback): implement `fetch_forecast_with_fallback` for resilient Stormglass → Open-Meteo routing
- feat(tests): comprehensive test suite with fixtures for all connectors and core modules
- feat(scripts): sample CSV generation and PowerShell health check utilities

### Changed

- refactor(core): centralize domain models with Pydantic `LogiBaseModel` and bilingual docstrings
- refactor(connectors): adopt httpx-based async clients with proper error handling and timeouts
- refactor(schema): implement RFC 4180 CSV export with standardized marine data representation

### Fixed

- fix(connectors): ensure proper fallback behavior when Stormglass rate limits are exceeded
- fix(schema): correct enum value access in CSV row iteration
- fix(units): provide comprehensive unit conversion utilities for marine operations

## [0.1.0] - 2025-09-30

### Added

- Initial release of marine operations toolkit
- Core marine data schema and utilities
- Multi-provider connector architecture
- Environmental Readiness Index (ERI) computation
- ADNOC × Al Bahar fusion decision support
