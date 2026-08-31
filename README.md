<div align="center">

<img src="./public/app-icon.png" width="80" height="80" alt="Claude Logo">

# Multi-Claude

A clean, native-feeling desktop wrapper for [Claude.ai](https://claude.ai) that lets you run multiple isolated profiles at once.

[![License](https://img.shields.io/github/license/Maxumi-IX/multi-claude?color=f0f0f0&labelColor=555555)](LICENSE)
[![Stars](https://img.shields.io/github/stars/Maxumi-IX/multi-claude?style=flat&color=f0f0f0&labelColor=555555)](https://github.com/Maxumi-IX/multi-claude)

</div>

---

## Why Multi-Claude?

While the official Claude app is great, it doesn't support multiple profiles. If you juggle different accounts (like one for work and one for personal projects), you usually have to constantly log in and out or use entirely different browsers.

**Multi-Claude** wraps the web app in a custom interface — keeping your workspaces separate without the browser clutter.

- **Zero login headaches** — switch between your work and personal accounts in two clicks
- **Fully sandboxed** — uses isolated session partitions so your cookies and data never mix
- **Native feel** — custom title bar and borderless window design

## Features

### Core

- **Isolated Sessions:** Every profile operates independently. Logging out of one doesn't affect the others.
- **Quick Switcher:** A custom title bar dropdown lets you instantly bounce between profiles.
- **Auto-Resume:** The app remembers your last active workspace and loads it automatically on boot.
- **Profile Management:** Easily create, edit, or wipe all data for specific profiles from the settings menu.

## Screenshots

|           Profile Switcher           |            Settings Menu             |
| :----------------------------------: | :----------------------------------: |
| ![Switcher](screenshot/Profiles.png) | ![Settings](screenshot/Settings.png) |

## Getting Started

### Download

Grab the latest release for your platform from [**Releases**](https://github.com/Maxumi-IX/multi-claude/releases):

| Platform | File                        |
| -------- | --------------------------- |
| Windows  | `.exe` installer            |
| Debian   | `.deb` package              |
| Arch     | `.pacman` package           |
| AppImage | `.AppImage`                 |

### First Launch

1. Open the app (it will load a "Default" profile).
2. Log into your primary Claude account.
3. Click the gear icon `⚙️` in the title bar to open **Settings**.
4. Create a new profile (e.g., "Work").
5. Click the profile name in the title bar to switch to it, and log into your secondary account!

## Tech Stack

| Layer     | Technology                                                                    |
| --------- | ----------------------------------------------------------------------------- |
| Backend   | [Electron](https://www.electronjs.org/) (Node.js, TypeScript)                 |
| Frontend  | HTML, CSS, TypeScript                                                         |
| Packaging | [electron-builder](https://www.electron.build/) (NSIS, deb, pacman, AppImage) |

## Development

You can build the latest release directly from the source code. The app is packaged as a silent, one-click Windows installer, or as a `.deb`, `.pacman`, or `.AppImage` on Linux.

1. Clone or download this repository.
2. Follow the **Development** steps below to build.
3. Run the installer (or, on Linux, the package/AppImage) generated in the `release/` folder.

### Prerequisites

- [Node.js](https://nodejs.org/) (includes npm)

### Setup

```bash
# Clone the repository
git clone [https://github.com/Maxumi-IX/multi-claude.git](https://github.com/Maxumi-IX/multi-claude.git)
cd multi-claude

# Install dependencies
npm install

# Run in development mode
npm start

# Build the Windows .exe installer
npm run build

# Build the Linux .AppImage
npm run build:linux

# Build the Linux .deb package (Debian/Ubuntu)
npm run build:deb

# Build the Linux .pacman package (Arch)
npm run build:arch
```

> [!NOTE]
> Multi-Claude is an unofficial, open-source project. It is not affiliated with, endorsed by, or associated with Anthropic. It is simply a community-built web wrapper designed to make account management easier.

## License

[MIT](LICENSE) &copy; [Maxumi-IX](https://github.com/Maxumi-IX)