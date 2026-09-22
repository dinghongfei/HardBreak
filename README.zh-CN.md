[English](README.md) | 简体中文

# HardBreak

番茄钟。到了休息时间，每块显示器都会弹出休息窗口。

<p align="center">
  <img src="docs/images/中文-休息-可跳过.png" alt="HardBreak 休息窗口" width="720">
</p>

<p align="center">
  <a href="https://apps.microsoft.com/detail/9N3DPNG7LML0">Windows 下载</a>
  ·
  <a href="https://github.com/dinghongfei/HardBreak/releases">macOS 下载</a>
</p>

## 功能

- **番茄循环。** 默认工作 25 分钟、休息 5 分钟，时长可以改，阶段自动交替。
- **每块屏幕。** 休息开始时，每台已连接的显示器各有一扇休息窗，也能盖住该屏幕上的全屏应用。
- **休息提示。** 每次休息显示一条健康建议，例如喝水、远眺、起身走走。
- **提前 10 秒。** 可选的系统通知会在休息前 10 秒出现。
- **不可跳过。** 打开后，休息窗口上没有跳过按钮。
- **macOS 只在托盘。** 应用留在菜单栏，不出现在程序坞。
- **只留在本机。** 设置保存在这台电脑上。没有账号，也不上报使用情况。见 [PRIVACY.md](PRIVACY.md)。

## 平台

| | |
|---|---|
| Windows | 微软商店 |
| macOS | [GitHub Releases](https://github.com/dinghongfei/HardBreak/releases) |

界面语言有简体中文、繁体中文和英文。第一次启动时跟随系统语言。

## 开发

需要 [Node.js](https://nodejs.org/)、[pnpm](https://pnpm.io/) 和 [Rust](https://www.rust-lang.org/)。

```bash
pnpm install
pnpm tauri dev
pnpm tauri build
```

应用版本是 `src-tauri/tauri.conf.json` 里的 `version`。`package.json` 里的版本不是应用版本。

## 许可证

[Apache License 2.0](LICENSE)
