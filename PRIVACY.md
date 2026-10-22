# HardBreak 隐私政策

HardBreak 是一款在你的电脑上运行的番茄钟。工作一段时间后，它会在每块显示器上显示休息窗口。本政策说明这款桌面应用处理哪些信息。

最后更新：2026-10-22

## 我们不收集的内容

HardBreak 没有账号，也不连接开发者的服务器。应用不会：

- 收集姓名、邮箱、电话、位置或设备标识；
- 统计使用情况、上报崩溃或投放广告；
- 把任何信息发送或出售给第三方。

计时、设置和休息提示都在你的电脑上完成。

## 保存在本机的信息

应用把下面这些设置写在本机的 SQLite 数据库 `config.db` 里。这个文件由系统放在该应用自己的配置目录中，不会上传。

| 内容 | 用途 |
|---|---|
| 工作时长、休息时长 | 决定下一阶段的倒计时 |
| 休息前是否通知、是否允许跳过 | 控制休息前通知和跳过按钮 |
| 界面语言 | 显示对应语言的文案 |
| 倒计时样式（圆环或翻页时钟） | 决定休息窗使用哪种倒计时界面 |
| 是否已完成首次启动 | 只在第一次启动时按系统语言选择界面语言 |

首次启动时，应用会读取操作系统的语言设置，用来选择简体中文、繁体中文或英文，然后把选择结果保存在上面的数据库里。这个读取只发生在本机。

卸载应用，或删除该应用的本地配置目录，这些设置会一并删除。应用内没有单独的「清除数据」按钮。

## 只留在内存里的信息

在 macOS 上，如果休息窗口出现时你正在使用另一个应用，HardBreak 会暂时记住那个应用的标识，以便你点「跳过」或休息结束时把前台还给它。这个标识只存在于当次运行的内存中，不写入数据库，也不离开这台电脑。应用退出后即消失。

当前倒计时（处于工作还是休息、剩余秒数）同样只在运行时保存在内存中。

## 系统功能

在你开启「休息前通知」时，HardBreak 会请操作系统显示一条本地通知，内容是固定的休息预告，不包含你的文件或输入。通知由 Windows、macOS 或 Linux 的系统通知功能显示。

应用会读取已连接的显示器数量和尺寸，以便在每块屏幕上放置休息窗口。这些信息只用于摆放窗口。

## 本政策的变更

如果以后的版本开始处理新的信息，会先更新本文件。建议在更新应用时看一眼本页。

---

## Privacy Policy

HardBreak is a Pomodoro timer that runs on your computer and shows a break window on each display. This policy describes what the desktop app does with information.

Last updated: 2026-10-22

### What we do not collect

HardBreak has no account and does not contact the developer’s servers. The app does not:

- collect your name, email, phone number, location, or device identifiers;
- record usage analytics, report crashes, or show ads;
- send or sell any information to third parties.

Timing, settings, and break tips stay on your computer.

### What is stored on this device

The app writes the settings below to a local SQLite database, `config.db`, in the app’s own configuration folder. That file is not uploaded.

| Data | Purpose |
|---|---|
| Work duration and break duration | Length of the next timer phase |
| Notify-before-break and no-skip switches | Whether to show the pre-break notification and the skip button |
| Interface language | Which language to display |
| Countdown style (ring or flip clock) | Which countdown style the break window shows |
| First-run flag | On the first launch only, pick the interface language from the system language |

On first launch, the app reads the operating system language to choose Simplified Chinese, Traditional Chinese, or English, then saves that choice in the database above. The read stays on the device.

Uninstalling the app, or deleting its local configuration folder, removes these settings. There is no separate “erase data” button inside the app.

### What stays in memory only

On macOS, if another app is in front when a break window appears, HardBreak briefly remembers that app’s identifier so it can hand the foreground back when you skip or the break ends. The identifier lives only in memory for that run. It is not written to the database and does not leave the computer. It is gone when the app quits.

The current countdown (work or break, and the remaining seconds) is also kept only in memory while the app is running.

### System features

If you turn on the pre-break notification, HardBreak asks the operating system to show a local notification. The text is a fixed rest reminder. It does not include your files or anything you typed. Windows, macOS, or Linux displays that notification.

The app reads how many displays are connected and their sizes so it can place a break window on each one. That information is used only to position the windows.

### Changes

If a future version starts handling new information, this file will be updated first. Please check this page when you update the app.
