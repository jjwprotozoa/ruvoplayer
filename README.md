# Ruvo Player - IPTV Player Application

<p align="center">
  <img src="https://raw.githubusercontent.com/ruvoplay/ruvo-player/main/src/assets/icons/favicon.256x256.png" alt="Ruvo Player icon" title="Free IPTV player application for Ruvo Play" />
</p>
<p align="center">
  <a href="https://github.com/ruvoplay/ruvo-player/releases"><img src="https://img.shields.io/github/release/ruvoplay/ruvo-player.svg?style=for-the-badge&logo=github" alt="Release"></a>
  <a href="https://github.com/ruvoplay/ruvo-player/releases"><img src="https://img.shields.io/github/v/release/ruvoplay/ruvo-player?include_prereleases&label=pre-release&logo=github&style=for-the-badge" /></a>
 <img alt="GitHub Workflow Status" src="https://img.shields.io/github/actions/workflow/status/ruvoplay/ruvo-player/build-and-test.yaml?style=for-the-badge&logo=github"> <a href="https://github.com/ruvoplay/ruvo-player/releases"><img src="https://img.shields.io/github/downloads/ruvoplay/ruvo-player/total?style=for-the-badge&logo=github" alt="Releases"></a> <a href="https://codecov.io/gh/ruvoplay/ruvo-player"><img alt="Codecov" src="https://img.shields.io/codecov/c/github/ruvoplay/ruvo-player?style=for-the-badge"></a> <a href="https://t.me/ruvoplayer"><img src="https://img.shields.io/badge/telegram-ruvoplayer-blue?logo=telegram&style=for-the-badge" alt="Telegram"></a> <a href="https://bsky.app/profile/ruvoplay.bsky.social"><img src="https://img.shields.io/badge/bluesky-ruvoplay-darkblue?logo=bluesky&style=for-the-badge" alt="Bluesky"></a>
</p>

<a href="https://t.me/ruvoplayer">Telegram channel for discussions</a>

**Ruvo Player** is a video player application that provides support for IPTV playlist playback (m3u, m3u8). The application allows users to import playlists using remote URLs or by uploading files from the local file system. Additionally, it supports EPG information in XMLTV format which can be provided via URL.

The application is a cross-platform, open-source project built with Tauri and Angular, developed for Ruvo Play.

⚠️ Note: Ruvo Player does not provide any playlists or other digital content. The channels and pictures in the screenshots are for demonstration purposes only.

![Ruvo Player: Channels list, player and epg list](./iptv-dark-theme.png)

## Features

-   M3u and M3u8 playlist support 📺
-   Xtream Code (XC) and Stalker portal (STB) support
-   External player support - MPV, VLC
-   Add playlists from the file system or remote URLs 📂
-   Automatic playlist updates on application startup
-   Channel search functionality 🔍
-   EPG support (TV Guide) with detailed information
-   TV archive/catchup/timeshift functionality
-   Group-based channel list
-   Favorite channels management
-   Global favorites aggregated from all playlists
-   HTML video player with HLS.js support or Video.js-based player
-   Internationalization with support for 16 languages:
    -   Arabic
    -   Moroccan arabic
    -   English
    -   Russian
    -   German
    -   Korean
    -   Spanish
    -   Chinese
    -   Traditional chinese
    -   French
    -   Italian
    -   Turkish
    -   Japanese
    -   Dutch
    -   Belarusian
    -   Polish
-   Custom "User Agent" header configuration for playlists
-   Light and Dark themes
-   Docker version available for self-hosting

## Screenshots:

|                 Welcome screen: Playlists overview                 | Main player interface with channels sidebar and video player  |
| :----------------------------------------------------------------: | :-----------------------------------------------------------: |
|       ![Welcome screen: Playlists overview](./playlists.png)       |   ![Sidebar with channel and video player](./iptv-main.png)   |
|            Welcome screen: Add playlist via file upload            |             Welcome screen: Add playlist via URL              |
| ![Welcome screen: Add playlist via file upload](./iptv-upload.png) | ![Welcome screen: Add playlist via URL](./upload-via-url.png) |
|              EPG Sidebar: TV guide on the right side               |                 General application settings                  |
|         ![EPG: TV guide on the right side](./iptv-epg.png)         |         ![General app settings](./iptv-settings.png)          |
|                         Playlist settings                          |
|         ![Playlist settings](./iptv-playlist-settings.png)         |                                                               |

_Note: This application is based on IPTVnator and has been rebranded for Ruvo Play._

## Download

Download the latest version of the application for macOS, Windows, and Linux from the [release page](https://github.com/ruvoplay/ruvo-player/releases).

Alternatively, you can install the application using one of the following package managers:

### Homebrew

```shell
$ brew install ruvo-player
```

### Snap

```shell
$ sudo snap install ruvo-player
```

### Arch

Also available as an Arch PKG, [ruvo-player-bin](https://aur.archlinux.org/packages/ruvo-player-bin/), in the AUR (using your favourite AUR-helper, .e.g. `yay`)

```shell
$ yay -S ruvo-player-bin
```

### Gentoo

You can install Ruvo Player from the [gentoo-zh overlay](https://github.com/microcai/gentoo-zh)

## Development

### Prerequisites

- Node.js 18+ and npm
- Angular CLI 19+
- Git

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ruvoplay/ruvo-player.git
   cd ruvo-player
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development environment:**

   **Option A: Start both services (Recommended)**
   ```bash
   npm run serve:full
   ```
   This starts both the Angular app and the local API server concurrently.

   **Option B: Start services separately**
   ```bash
   # Terminal 1: Start API server
   npm run api:start
   
   # Terminal 2: Start Angular app
   npm run serve
   ```

   **Option C: Use provided scripts (Windows)**
   ```bash
   # PowerShell (recommended)
   .\start-dev.ps1
   
   # Or batch file
   .\start-dev.bat
   ```

### Development URLs

- **Angular App**: http://localhost:4200
- **Local API Server**: http://localhost:3333
  - Health check: http://localhost:3333/health
  - Parse endpoint: http://localhost:3333/api/parse
  - Xtream endpoint: http://localhost:3333/api/xtream
  - Stalker endpoint: http://localhost:3333/api/stalker

### Available Scripts

- `npm run serve` - Start Angular development server only
- `npm run serve:full` - Start both Angular app and API server
- `npm run api:start` - Start local API server only
- `npm run build` - Build for production (web)
- `npm run build:web` - Build for web deployment
- `npm run test` - Run unit tests
- `npm run e2e` - Run end-to-end tests

[![Get it from the Snap Store](https://snapcraft.io/static/images/badges/en/snap-store-black.svg)](https://snapcraft.io/ruvo-player)

<a href="https://ruvoplay.com/support" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/default-green.png" alt="Support Ruvo Play" width="185"></a>

## How to Build and Develop

Requirements:

-   Node.js with npm
-   Rust (required for tauri)

1. Clone this repository and install project dependencies:

    ```
    $ npm install
    ```

2. Start the application:
    ```
    $ npm run tauri dev
    ```

This will open the Tauri version in a separate window, while the PWA version will be available at http://localhost:4200.

## About Ruvo Play

Ruvo Play is a platform dedicated to providing high-quality IPTV solutions. Ruvo Player is our flagship application for managing and playing IPTV content.

For more information, visit [ruvoplay.com](https://ruvoplay.com).

## License

This project is based on IPTVnator by 4gray and is licensed under the MIT License. See the LICENSE.md file for details.

## Support

For support and questions, please visit:

-   [GitHub Issues](https://github.com/ruvoplay/ruvo-player/issues)
-   [Telegram Channel](https://t.me/ruvoplayer)
-   [Ruvo Play Support](https://ruvoplay.com/support)
