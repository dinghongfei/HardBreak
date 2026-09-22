English | [简体中文](README.zh-CN.md)

# HardBreak

A Pomodoro timer that puts a break window on every display when it is time to rest.

<p align="center">
  <img src="docs/images/英语-休息-可跳过.png" alt="HardBreak break window" width="720">
</p>

<p align="center">
  <a href="https://apps.microsoft.com/detail/9N3DPNG7LML0">Download for Windows</a>
  ·
  <a href="https://github.com/dinghongfei/HardBreak/releases">Download for macOS</a>
</p>

## Features

- **Pomodoro cycle.** 25 minutes of work and 5 minutes of rest by default. Both durations are adjustable, and the cycle repeats on its own.
- **Every display.** When a break starts, each connected monitor gets its own break window, including a fullscreen app on that screen.
- **Break tips.** Each break shows one health suggestion, such as drinking water, looking into the distance, or standing up.
- **Ten-second notice.** An optional system notification appears 10 seconds before the break.
- **No-skip mode.** Turn off the Skip button when you want the break to finish.
- **Tray only on macOS.** The app stays in the menu bar. It does not appear in the Dock.
- **Private by design.** Settings stay on this computer. There is no account and no usage reporting. See [PRIVACY.md](PRIVACY.md).

## Platforms

| | |
|---|---|
| Windows | Microsoft Store |
| macOS | [GitHub Releases](https://github.com/dinghongfei/HardBreak/releases) |

Languages: English, Simplified Chinese, and Traditional Chinese. On first launch, HardBreak follows the system language.

## Development

Requirements: [Node.js](https://nodejs.org/), [pnpm](https://pnpm.io/), and [Rust](https://www.rust-lang.org/).

```bash
pnpm install
pnpm tauri dev
pnpm tauri build
```

The app version is `version` in `src-tauri/tauri.conf.json`. `package.json` is not the app version.

## License

[Apache License 2.0](LICENSE)
