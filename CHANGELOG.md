# Changelog

All notable changes to EasyADB will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-23

### Added
- Initial release of EasyADB
- Quest Video Manager (`quest-video.js`)
  - Scan videos and screenshots on Meta Quest devices
  - Export files with multiple filtering options (date, app, manual selection)
  - Delete files with safety confirmations
  - Quick cleanup feature (keep recent N days)
  - Display detailed video information in tables
- Universal ADB File Manager (`adb-manager.js`)
  - Manage files on any Android device
  - Support for multiple preset configurations
  - Flexible file type filtering
  - Recursive directory scanning
  - Export files organized by date
- Interactive CLI with colorful output
- Configuration management system
- Multi-platform support (Windows, macOS, Linux)
- Comprehensive documentation
  - English README
  - Chinese documentation (README_CN.md)
  - Project structure guide
  - Build instructions
- MIT License
- Contributing guidelines
- Git ignore configuration

### Fixed
- **Critical**: Fixed "delete all" functionality bug
  - Issue: When selecting "delete all", only one file was being deleted
  - Root cause: `selectFilters()` function was forcing manual selection even for "all" option
  - Solution: Refactored filter logic to directly return all files when "all" is selected
  - Affected files: `quest-video.js:388-513`, `adb-manager.js:602-708`

### Changed
- Reorganized project structure into standard layout
  - `/src` for source code
  - `/doc` for documentation
  - `/exe` for build outputs
- Updated package.json with complete metadata
  - Added repository information
  - Added keywords for discoverability
  - Added build scripts for all platforms
  - Specified MIT license

### Security
- All delete operations require user confirmation
- File operations are validated before execution
- Safe error handling for ADB commands

## [Unreleased]

### Planned Features
- Progress bars for file transfers
- Concurrent file operations
- Incremental backup support
- Automatic compression on export
- Operation history logging
- GUI version
- Web interface option

### Known Issues
- None currently reported

---

## Version History

### Version Numbering

EasyADB follows [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new functionality in a backwards compatible manner
- **PATCH** version for backwards compatible bug fixes

### Release Notes

#### v1.0.0 (2026-01-23) - Initial Release

This is the first stable release of EasyADB. The project has been completely restructured and is now ready for open source distribution.

**Highlights:**
- Two powerful tools for Android file management
- Beautiful terminal interface with tables and colors
- Safe deletion with multiple confirmation steps
- Flexible filtering and export options
- Complete documentation in English and Chinese
- Ready for packaging into standalone executables

**Migration Notes:**
- If upgrading from the old `AdbVideoManager` project, note that the directory structure has changed
- Configuration files remain compatible
- All functionality has been preserved and improved

---

## How to Update

### For Users

Download the latest release from the [Releases](https://github.com/pengjugame/EasyADB/releases) page.

### For Developers

```bash
git pull origin main
cd src
npm install
```

---

## Feedback

Found a bug or have a feature request? Please [open an issue](https://github.com/pengjugame/EasyADB/issues).

## Links

- [GitHub Repository](https://github.com/pengjugame/EasyADB)
- [Documentation](doc/README_CN.md)
- [Contributing Guide](CONTRIBUTING.md)
- [License](LICENSE)
