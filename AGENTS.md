# HardBreak

桌面番茄钟：工作一段时间后，在每块显示器上弹出全屏休息窗。Tauri 2，前端是 `src/` 里的原生 HTML/JS（无打包器），计时、托盘和窗口在 Rust。

## 运行

包管理器是 pnpm。不要提交 `package-lock.json` 或 `yarn.lock`。

```bash
pnpm install
pnpm tauri dev
pnpm tauri build
```

应用版本只改 `src-tauri/tauri.conf.json` 的 `version`。`get_app_version` 读的是它。`package.json` 的 `version` 不是应用版本。

## 平台

所有代码修改必须同时考虑 Windows、macOS、Linux。窗口、托盘、通知、快捷键、文件路径和系统 API 都要在三个系统上有明确行为。

平台差异用 `cfg(target_os)` 或 Tauri 跨平台 API 分开处理。数据库继续用 `sqlite:config.db`，路径由插件解析到各系统的应用配置目录，不要写死某一个系统的绝对路径。

## 目录

| 路径 | 职责 |
|---|---|
| `src/index.html` `index.js` `index.css` | 全屏休息窗 |
| `src/config.html` `config.js` `config.css` | 托盘打开的配置窗，启动时加载并拉起计时 |
| `src-tauri/src/lib.rs` | `AppState`、计时线程、托盘、多屏窗口、命令 |
| `src-tauri/sqls/01_init.sql` | `settings` 表和默认值 |
| `src-tauri/capabilities/default.json` | 窗口与插件权限 |
| `docs/index.html` | 产品落地页，不是应用界面 |
| `RELEASES.md` | 发版记录：功能清单，以及各语言的商店介绍和关键词 |

`tauri.conf.json` 只预创建 `config_window`（默认隐藏）。休息窗在 `setup` 里按显示器创建，label 为 `break_window_0`、`break_window_1`……没有 label 为 `main` 的窗口。

## 设置

配置窗启动时：读 SQLite `sqlite:config.db` → `invoke('update_settings')` 写入 `AppState` → 处理首次运行 → `invoke('start_timer_cycle')`。

写入必须走 `src/config.js` 的 `saveSetting`：先 `UPDATE settings`，再同步后端。不要只改数据库或只改 `AppState`。

键：`work_duration`、`break_duration`、`notify_before_break`、`no_skip_mode`、`first_run`、`language`、`countdown_mode`。时长单位是分钟，库里开关和 `first_run` 是 `'1'` / `'0'`，`countdown_mode` 是 `'ring'` / `'flipclock'` / `'sevenseg'`。工作滑块 1–120，休息滑块 1–60。时长在**下一阶段开始**时读取，不要在当前倒计时中途重置 `remaining`。

已安装用户不会重跑 version 1 迁移。改默认值可以改 `01_init.sql`（只影响新库）。给已有库加键时新增一条 `Migration`，不要改已发布的 version 1 SQL 指望它再执行。

## 计时与窗口

`start_timer_cycle` 用 `running` 防重入，只能启动一次。`restart_timer_cycle` 用于「立即生效」：置 `restart_requested` 并回到 `Work` 阶段，由计时线程收标志、收起休息窗后按新时长重新开始。

每秒发送 `app-state-update`：

```json
{ "phase": "work|break", "duration": 1500, "remaining": 1499, "no_skip_mode": false, "current_language": "zh-CN", "countdown_mode": "ring" }
```

`duration` 和 `remaining` 是秒，倒计时按真实流逝推进。相邻 tick 间隔超过 2 秒（内部常量 `SLEEP_GAP`，不是设置项）判定为系统休眠：工作阶段休眠 ≤ 休息时长则暂停不计入，> 休息时长视为完成自然休息并走重启路径重置到工作起点；休息阶段休眠计入休息。休眠感知时钟按平台分岔（macOS `CLOCK_MONOTONIC`、Linux `CLOCK_BOOTTIME`、Windows 沿用 `Instant`/QPC），不要用 `std::time::Instant` 直接计时——它在 macOS/Linux 上休眠时会暂停。工作阶段 `remaining <= 10` 且 `notify_before_break` 时发一次系统通知。

- 工作结束：显示所有休息窗，发送 `break_start`。
- 休息结束：隐藏休息窗，发送 `work_start`：`{ "tips_index": 0, "current_language": "zh-CN" }`。
- 跳过：前端 `invoke('hide_break_window')`。该命令隐藏休息窗并把阶段设为 `Work`。计时线程发现阶段被外部改掉后直接进入下一轮，不要再补发窗口事件。

休息窗保持全屏、置顶、无边框、透明、`skip_taskbar`。关闭配置窗改为隐藏。退出只走托盘「退出」。

新窗口 label 要写进 `capabilities/default.json` 的 `windows`（休息窗已用 `break_window_*`）。

## 命令

`invoke_handler`：`update_settings`、`start_timer_cycle`、`hide_break_window`、`restart_timer_cycle`、`get_app_version`。

`removeUnusedCommands` 为 true。新命令必须放进 `generate_handler!`，并在 `src/` 里被 `invoke`，否则会被裁掉。

前端用 `window.__TAURI__`（`withGlobalTauri: true`）。不要改成从依赖包导入，除非同时加上前端构建。

## 文案

前端语言内容集中在 `src/locales.js`（普通脚本，两个页面都先加载它）：每个 locale 含 `name`、`tips`、`breakMessages`（休息窗）、`configMessages`（配置窗）。加语言三步：

1. `src/locales.js` 的 `HB_LOCALES` 加一个 locale 对象（语言选择器由 `config.js` 按表动态生成，不用改 HTML）；
2. 同文件的 `HB_LANG_MATCH` 登记系统语言前缀映射（未匹配回退 `HB_FALLBACK_LANG`）；
3. `lib.rs` 的 `LOCALES` 表加托盘菜单和休息前通知文案。

HTML 默认是简体中文，用 `data-translate`。

提示语下标来自 `lib.rs` 的 `rand::random_range(0..30)`。各语言 `tips` 长度必须相同（目前 30 条），增删时改这个区间。改完任何语言内容后跑 `node scripts/check-locales.js` 校验一致性（tips 条数、键集、映射、lib.rs 覆盖）。

配置窗没有提示语编辑页（旧的静态页面已删除）。未来做提示语设置时放到「休息窗」标签下，持久化到数据库并由休息窗读取；macOS 的 WKWebView 不支持 `prompt()`，编辑弹窗用自绘 UI。

这是原生 HTML，属性用 `class`，不要写 `className`。

## 发版

商店详情不放进 `locales.js`。发版前在 `RELEASES.md` 最上面新增一节。微软商店每种语言填写说明、此版本新增功能、产品功能、短标题、简短描述、关键字。首次提交时「此版本新增功能」留空；已有上一版时只写相对上一版的变化。已经上架的那一节保持原样。

## 不要做的事

- 不要加统计、账号或联网上报。见 `PRIVACY.md`。
- 不要引入前端打包器或 UI 框架，除非任务明确要求。
- 不要在休息窗里用 DOM 隐藏代替 `hide_break_window`。
