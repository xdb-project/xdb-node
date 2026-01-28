# Changelog

All notable changes to the **XDB-Node** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-01-29

### Added
- **Database Snapshotting** Added support for triggering manual point-in-time state snapshots on the server via the `snapshot()` method.
- **Graceful Termination** Enhanced the `close()` method to support session-aware exit signals before socket closure.
- **Protocol Expansion** Updated `XDBAction` types to include `snapshot` and `exit` actions for better server synchronization.
- **Enhanced Test Suite** Added comprehensive unit tests for snapshotting and graceful disconnection logic.
- **Improved Documentation** Updated README and example scripts to demonstrate the new snapshot functionality.

## [1.0.0] - 2026-01-28

### Added
- **Initial Release**: Official Node.js driver for the XDB-Project ecosystem.
- **Core Networking**: Implementation of a high-performance TCP client using Node.js `net.Socket`.
- **Enforced Protocol**: Hardcoded communication on port `8080` for strict server alignment.
- **CRUD Implementation**: Complete API for `insert`, `find`, `delete`, and `count` operations.
- **Type Safety**: Full TypeScript integration with generic support for custom Document types.
- **Stream Reconstruction**: Advanced buffering logic to handle fragmented TCP packets and multi-response payloads.
- **Professional Logging**: Standardized output format with ISO timestamps and semantic ANSI coloring.
- **Developer Experience**: Comprehensive error reporting with proactive hints for connection issues.
- **Project Scaffold**: Pre-configured `.gitignore`, `.prettierignore`, and Jest unit testing suite.

---

### Meta Documentation
- **Project Identity**: XDB-Node Driver.
- **Compatibility**: Designed for XDB-Server (C Implementation).
