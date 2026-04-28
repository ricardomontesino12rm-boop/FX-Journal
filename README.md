# FX Journal 📈

A professional, local-first Forex Trading Journal built for privacy, speed, and advanced analytics.

FX Journal is a standalone desktop application that runs entirely on your machine. No cloud subscriptions, no data tracking, and no latency. Your trades, screenshots, and strategies are saved securely on your local hard drive using SQLite.

## Features
- **Privacy First:** 100% offline. Your data never leaves your computer.
- **Advanced Metrics:** Prop-firm level calculations including Win Rate, Profit Factor, Expectancy, and Max Drawdown.
- **Rich Text Editor:** Built-in Tiptap editor for your Study Cases and trade notes. Paste screenshots directly from TradingView (`Ctrl+V`).
- **Portfolio Management:** Track multiple accounts (Funded, Challenge, Personal) separately.
- **Premium OLED UI:** Dark mode by default, built with Next.js and Electron for a buttery-smooth experience.

## Installation
Go to the [Releases](https://github.com/yourusername/fx-journal/releases) tab and download the latest installer for your Operating System (`.exe` for Windows, `.dmg` for Mac, `.AppImage` for Linux).

## Development Setup
If you want to contribute or build the app from source:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/fx-journal.git
   cd fx-journal
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run electron:dev
   ```

4. Build the executable:
   ```bash
   npm run electron:build
   ```

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
