// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, Runtime,
};
#[cfg(not(target_os = "macos"))]
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_sql::{Migration, MigrationKind};

// 休息窗口标签前缀（用于标识和批量关闭）
const BREAK_WINDOW_PREFIX: &str = "break_window_";

/// 相邻 tick 间隔超过该值即判定为系统休眠（内部常量，不作为设置项）。
const SLEEP_GAP: Duration = Duration::from_secs(2);

/// 计入系统休眠时间的单调时钟，用于检测休眠间隔。
/// macOS：std Instant 用的 CLOCK_UPTIME_RAW 休眠时暂停，CLOCK_MONOTONIC 才会继续走；
/// Linux：CLOCK_BOOTTIME 才计入 suspend；Windows：QPC 本就计入休眠，沿用 std Instant。
#[cfg(target_os = "macos")]
fn monotonic_now() -> Duration {
    let mut ts = libc::timespec { tv_sec: 0, tv_nsec: 0 };
    unsafe { libc::clock_gettime(libc::CLOCK_MONOTONIC, &mut ts) };
    Duration::new(ts.tv_sec as u64, ts.tv_nsec as u32)
}

#[cfg(target_os = "linux")]
fn monotonic_now() -> Duration {
    let mut ts = libc::timespec { tv_sec: 0, tv_nsec: 0 };
    unsafe { libc::clock_gettime(libc::CLOCK_BOOTTIME, &mut ts) };
    Duration::new(ts.tv_sec as u64, ts.tv_nsec as u32)
}

#[cfg(not(any(target_os = "macos", target_os = "linux")))]
fn monotonic_now() -> Duration {
    static START: std::sync::OnceLock<std::time::Instant> = std::sync::OnceLock::new();
    START.get_or_init(std::time::Instant::now).elapsed()
}

/// 休息出现前正在前台的应用。主屏点击跳过会把本应用激活并切走全屏空间，结束时把它激活回来。
#[cfg(target_os = "macos")]
static PREVIOUS_FRONTMOST_BUNDLE: Mutex<Option<String>> = Mutex::new(None);

// 托盘菜单项 ID
const CONFIG_SETTING: &str = "config_setting";
const QUIT_APP: &str = "quit_app";

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
enum TimerPhase {
    Work,
    Break,
}

impl TimerPhase {
    fn as_str(&self) -> &'static str {
        match self {
            TimerPhase::Work => "work",
            TimerPhase::Break => "break",
        }
    }

    fn next(&self) -> TimerPhase {
        match self {
            TimerPhase::Work => TimerPhase::Break,
            TimerPhase::Break => TimerPhase::Work,
        }
    }
}

// ==================== 应用配置 ====================

#[derive(Clone, Debug, Serialize, Deserialize)]
struct AppSettings {
    work_duration: i32,  // 分钟
    break_duration: i32, // 分钟
    notify_before_break: bool,
    no_skip_mode: bool,
    first_run: bool,
    language: String,
    countdown_mode: String, // "ring"（圆环）| "flipclock"（翻页时钟）| "sevenseg"（数码管）
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            work_duration: 25,
            break_duration: 5,
            notify_before_break: true,
            no_skip_mode: false,
            first_run: false,
            language: "zh-CN".to_string(),
            countdown_mode: "ring".to_string(),
        }
    }
}

// ==================== 定时器状态 ====================

struct AppState {
    settings: Mutex<AppSettings>,
    running: Mutex<bool>,
    current_phase: Mutex<TimerPhase>, // 使用枚举，避免魔法值
    restart_requested: Mutex<bool>,   // 请求立即重启计时，让新时长马上生效
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            settings: Mutex::new(AppSettings::default()),
            running: Mutex::new(false),
            current_phase: Mutex::new(TimerPhase::Work), // 使用枚举
            restart_requested: Mutex::new(false),
        }
    }
}

#[derive(Clone, Debug)]
struct I18nTexts {
    // 托盘菜单
    tray_menu_config: String,
    tray_menu_quit: String,

    // 通知
    notification_title: String,
    notification_body: String,
}

/// 托盘菜单与休息前通知的语言表。新增语言：加一行 Locale 即可，
/// 同时记得在前端 src/locales.js 中加对应 locale 对象。
struct Locale {
    code: &'static str,
    tray_menu_config: &'static str,
    tray_menu_quit: &'static str,
    notification_body: &'static str,
}

const LOCALES: &[Locale] = &[
    Locale {
        code: "zh-CN",
        tray_menu_config: "配置",
        tray_menu_quit: "退出",
        notification_body: "10秒后开始休息，请做好准备",
    },
    Locale {
        code: "zh-TW",
        tray_menu_config: "設定",
        tray_menu_quit: "結束",
        notification_body: "10秒後開始休息，請做好準備",
    },
    Locale {
        code: "en",
        tray_menu_config: "Settings",
        tray_menu_quit: "Quit",
        notification_body: "Your break starts in 10 seconds. Get ready.",
    },
    Locale {
        code: "ja",
        tray_menu_config: "設定",
        tray_menu_quit: "終了",
        notification_body: "10秒後に休憩が始まります。準備をしてください",
    },
    Locale {
        code: "ko",
        tray_menu_config: "설정",
        tray_menu_quit: "종료",
        notification_body: "10초 후 휴식이 시작됩니다. 준비해 주세요",
    },
    Locale {
        code: "de",
        tray_menu_config: "Einstellungen",
        tray_menu_quit: "Beenden",
        notification_body: "Deine Pause beginnt in 10 Sekunden. Mach dich bereit.",
    },
    Locale {
        code: "fr",
        tray_menu_config: "Réglages",
        tray_menu_quit: "Quitter",
        notification_body: "Votre pause commence dans 10 secondes. Préparez-vous.",
    },
    Locale {
        code: "es",
        tray_menu_config: "Ajustes",
        tray_menu_quit: "Salir",
        notification_body: "El descanso empieza en 10 segundos. Prepárate.",
    },
];

impl I18nTexts {
    fn new(language: &str) -> Self {
        // 未支持的语言回退到英文
        let loc = LOCALES
            .iter()
            .find(|l| l.code == language)
            .or_else(|| LOCALES.iter().find(|l| l.code == "en"))
            .unwrap_or(&LOCALES[0]);

        Self {
            tray_menu_config: loc.tray_menu_config.to_string(),
            tray_menu_quit: loc.tray_menu_quit.to_string(),
            notification_title: "HardBreak".to_string(),
            notification_body: loc.notification_body.to_string(),
        }
    }
}

// ==================== Tauri 命令 ====================

// 更新配置的命令
#[tauri::command]
fn update_settings(
    app: tauri::AppHandle,
    window: tauri::WebviewWindow,
    settings: AppSettings,
) -> Result<(), String> {
    let state = app.state::<AppState>();
    let first_run = settings.first_run.clone();
    let current_language = state.settings.lock().unwrap().language.clone();
    let new_language = settings.language.clone();

    *state.settings.lock().unwrap() = settings;

    // 如果是第一次，弹出
    if first_run {
        let _ = window.show();
        let _ = window.set_focus();
    }

    if current_language != new_language {
        if let Some(tray) = app.tray_by_id("tray_icon") {
            let tray_clone = tray.clone();

            let i18n: I18nTexts = get_i18n_texts(app.app_handle());

            let config_setting_i = MenuItem::with_id(
                &app,
                CONFIG_SETTING,
                i18n.tray_menu_config,
                true,
                None::<&str>,
            )
            .map_err(|e| e.to_string())?;
            let quit_i = MenuItem::with_id(&app, QUIT_APP, i18n.tray_menu_quit, true, None::<&str>)
                .map_err(|e| e.to_string())?;

            let menu =
                Menu::with_items(&app, &[&config_setting_i, &quit_i]).map_err(|e| e.to_string())?;

            let _ = tray_clone.set_menu(Some(menu));
        }
    }

    Ok(())
}

// 启动定时器循环
#[tauri::command]
fn start_timer_cycle(app: tauri::AppHandle) {
    let state = app.state::<AppState>();

    // 防止重复启动
    let mut running = state.running.lock().unwrap();
    if *running {
        return;
    }
    *running = true;

    // 释放锁
    drop(running);

    // 启动定时器线程
    let app_clone = app.clone();

    thread::spawn(move || {
        let state = app_clone.state::<AppState>();

        // 初始为工作状态
        *state.current_phase.lock().unwrap() = TimerPhase::Work;

        loop {
            // 检查是否需要停止
            if !*state.running.lock().unwrap() {
                break;
            }

            // 获取当前阶段（使用枚举，类型安全）
            let phase = state.current_phase.lock().unwrap().clone();

            // 根据阶段获取持续时间（时长只在阶段开始时读取）
            let duration_seconds = {
                let settings = state.settings.lock().unwrap();
                match phase {
                    TimerPhase::Work => settings.work_duration * 60,
                    TimerPhase::Break => settings.break_duration * 60,
                }
            };

            // 按真实流逝推进倒计时，并感知系统休眠：
            // 工作期短休眠（≤ 休息时长）暂停计时；工作期长休眠视为完成自然休息，重置到工作起点；
            // 休息期休眠计入休息（睡眠本身就是休息）。
            let mut accumulated = Duration::ZERO; // 当前阶段已累积的有效时间
            let mut last_tick = monotonic_now();
            let mut notified = false;

            loop {
                // 检查是否需要停止
                if !*state.running.lock().unwrap() {
                    return;
                }

                // 请求了立即重启：跳出当前倒计时，由外层 loop 按新时长重新开始
                if *state.restart_requested.lock().unwrap() {
                    break;
                }

                // 检查阶段是否被外部重置（如跳过休息）
                let new_phase = state.current_phase.lock().unwrap().clone();
                if new_phase != phase {
                    // 阶段已被重置，跳出当前循环，外层 loop 会处理新阶段
                    break;
                }

                let now = monotonic_now();
                let delta = now.saturating_sub(last_tick);
                last_tick = now;

                if delta > SLEEP_GAP {
                    // 间隔远超正常 tick：系统经历了休眠
                    if matches!(phase, TimerPhase::Work) {
                        let break_seconds = {
                            let settings = state.settings.lock().unwrap();
                            settings.break_duration.max(1) as u64 * 60
                        };
                        if delta > Duration::from_secs(break_seconds) {
                            // 工作期长休眠：已睡够一次完整休息，重置到工作起点。
                            // 复用重启路径：外层逻辑收标志后强制 Work 并换提示语重新开始。
                            *state.restart_requested.lock().unwrap() = true;
                            break;
                        }
                        // 工作期短休眠：暂停计时，不计入
                    } else {
                        // 休息期休眠：计入休息
                        accumulated += delta;
                    }
                } else {
                    // 正常 tick，计入真实流逝（天然无漂移）
                    accumulated += delta;
                }

                let elapsed = accumulated.as_secs() as i32;
                let remaining = duration_seconds - elapsed;
                if remaining <= 0 {
                    break;
                }

                // 发送更新事件到前端（一次锁取齐所有字段）
                let (no_skip_mode, current_language, countdown_mode) = {
                    let settings = state.settings.lock().unwrap();
                    (
                        settings.no_skip_mode,
                        settings.language.clone(),
                        settings.countdown_mode.clone(),
                    )
                };
                let _ = app_clone.emit(
                    "app-state-update",
                    serde_json::json!({
                        "phase": phase.as_str(),  // 转换为字符串发送给前端
                        "duration": duration_seconds,
                        "remaining": remaining,
                        "no_skip_mode": no_skip_mode,
                        "current_language": current_language,
                        "countdown_mode": countdown_mode,
                    }),
                );

                // 工作阶段：剩余 10 秒及以内发一次提醒（休眠唤醒可能跳过恰好 10 秒的点）
                if matches!(phase, TimerPhase::Work) && !notified && remaining <= 10 {
                    let notify_before_break = state.settings.lock().unwrap().notify_before_break;
                    if notify_before_break {
                        notified = true;
                        // 发送进入休息阶段通知
                        send_break_notification(app_clone.clone());
                    }
                }

                thread::sleep(Duration::from_secs(1));
            }

            // 检查是否请求了立即重启（让新时长马上生效）
            let restart = {
                let mut flag = state.restart_requested.lock().unwrap();
                let requested = *flag;
                *flag = false;
                requested
            };
            if restart {
                // 休息可能正在进行：收起休息窗并强制回到工作阶段。
                // 由计时线程自己处理窗口，避免与阶段切换竞态。
                hide_break_window_on_all_monitors(&app_clone);
                *state.current_phase.lock().unwrap() = TimerPhase::Work;
                continue;
            }

            // ★ 新增：检查阶段是否在倒计时期间被重置
            let current_phase_after_loop = state.current_phase.lock().unwrap().clone();
            if current_phase_after_loop != phase {
                // 阶段已被重置，不发送窗口事件，直接进入下一次循环
                continue;
            }

            // 发送事件：根据当前阶段决定显示还是隐藏窗口
            match phase {
                TimerPhase::Work => {
                    // 工作结束，显示休息窗口（开始休息）
                    show_break_window_on_all_monitors(&app_clone);
                }
                TimerPhase::Break => {
                    // 休息结束，隐藏休息窗口（开始工作）
                    hide_break_window_on_all_monitors(&app_clone);
                }
            }

            // 阶段结束，切换到下一阶段
            let next_phase = phase.next();
            *state.current_phase.lock().unwrap() = next_phase;
        }
    });
}

#[tauri::command]
fn hide_break_window(app: tauri::AppHandle) {
    hide_break_window_on_all_monitors(&app);

    let state = app.state::<AppState>();

    // 强制切换到工作阶段
    *state.current_phase.lock().unwrap() = TimerPhase::Work;
}

/// 立即应用新的工作/休息时长：终止当前阶段，从工作阶段起点重新计时。
/// 效果等同重启应用（一上来就是工作时间）。时长仍在阶段开始时读取，
/// 这里只请求计时线程跳出当前倒计时，休息窗由计时线程负责收起。
#[tauri::command]
fn restart_timer_cycle(app: tauri::AppHandle) {
    let state = app.state::<AppState>();

    *state.current_phase.lock().unwrap() = TimerPhase::Work;
    *state.restart_requested.lock().unwrap() = true;
}


#[tauri::command]
fn get_app_version(app: tauri::AppHandle) -> String {
    app.package_info().version.to_string()
}



#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 数据库初始化
    let migrations = vec![
        // Define your migrations here
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: include_str!("../sqls/01_init.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_countdown_mode",
            sql: include_str!("../sqls/02_add_countdown_mode.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_os::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:config.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState::default())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            hide_dock_icon();

            // 创建休息窗口
            create_break_window_on_all_monitors(app.handle());

            // 创建托盘
            create_tray(app)?;

            main_window_close_event(app)?;
            config_window_close_event(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            update_settings,
            start_timer_cycle,
            hide_break_window,
            restart_timer_cycle,
            get_app_version,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// 在所有显示器上显示休息窗口
fn show_break_window_on_all_monitors(app: &tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    show_macos_break_covering_each_screen(app);

    #[cfg(not(target_os = "macos"))]
    if let Ok(monitors) = app.available_monitors() {
        for (i, monitor) in monitors.iter().enumerate() {
            let label = format!("{}{}", BREAK_WINDOW_PREFIX, i);
            let position = monitor.position();
            let size = monitor.size();

            // 尝试获取已存在的窗口
            if let Some(window) = app.get_webview_window(&label) {
                // 窗口已存在：更新位置/大小（显示器配置可能变化），然后显示
                let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::<
                    i32,
                > {
                    x: position.x,
                    y: position.y,
                }));
                let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: size.width,
                    height: size.height,
                }));
                present_break_window(&window, *position, *size, monitor.scale_factor());
            } else {
                // 窗口不存在：创建新窗口
                create_break_window(app, &label, *position, *size, monitor.scale_factor(), true);
            }
        }
    }

    // 窗口刚显示时先推一次休息倒计时，避免界面停在 HTML 里的 00:00
    let state = app.state::<AppState>();
    let settings = state.settings.lock().unwrap();
    let duration_seconds = settings.break_duration * 60;
    let _ = app.emit(
        "app-state-update",
        serde_json::json!({
            "phase": "break",
            "duration": duration_seconds,
            "remaining": duration_seconds,
            "no_skip_mode": settings.no_skip_mode,
            "current_language": settings.language,
            "countdown_mode": settings.countdown_mode,
        }),
    );
    drop(settings);

    let _ = app.emit("break_start", ());
}

// 隐藏所有休息窗口（不销毁，便于下次快速显示）
fn hide_break_window_on_all_monitors(app: &tauri::AppHandle) {
    let windows = app.webview_windows();
    #[cfg(target_os = "macos")]
    let mut restore_from = None;
    for (label, window) in windows.iter() {
        if label.starts_with(BREAK_WINDOW_PREFIX) {
            #[cfg(target_os = "macos")]
            {
                restore_from = Some(window.clone());
            }
            dismiss_break_window(window);
        }
    }
    #[cfg(target_os = "macos")]
    if let Some(window) = restore_from {
        // 点击跳过若抢走了前台，还给休息前的应用。程序坞图标保持隐藏。
        restore_previous_frontmost_app(&window);
    }
    // 需要计算下一次要展示的文案,计算index,返回给前端

    let mut rng = rand::rng();
    let index = rng.random_range(0..30); // 生成 [0, 30) 的随机整数，对应八种语言各 30 条提示

    // 通知前端：休息已跳过，开始工作阶段
    let _ = app.emit(
        "work_start",
        serde_json::json!({
            "tips_index": index,
            "current_language": app.state::<AppState>().settings.lock().unwrap().language.clone(),
        }),
    );
}

fn create_break_window_on_all_monitors(app: &tauri::AppHandle) {
    // 获取所有显示器
    if let Ok(monitors) = app.available_monitors() {
        for (i, monitor) in monitors.iter().enumerate() {
            let label = format!("{}{}", BREAK_WINDOW_PREFIX, i);
            let position = monitor.position();
            let size = monitor.size();

            // 尝试获取已存在的窗口
            if app.get_webview_window(&label).is_none() {
                // 窗口不存在：创建新窗口
                create_break_window(app, &label, *position, *size, monitor.scale_factor(), false);
            }
        }
    }
}

fn create_break_window(
    app: &tauri::AppHandle,
    label: &str,
    position: tauri::PhysicalPosition<i32>,
    size: tauri::PhysicalSize<u32>,
    scale: f64,
    visible: bool,
) {
    let _ =
        tauri::WebviewWindowBuilder::new(app, label, tauri::WebviewUrl::App("index.html".into()))
            .title("HardBreak")
            .position(position.x as f64, position.y as f64)
            // .center()
            .inner_size(size.width as f64, size.height as f64)
            .resizable(false)
            .transparent(true) //是否透明
            .decorations(false) // fixme 是否有边框
            .visible(visible)
            .devtools(false) // fixme 开发模式下显示开发者工具
            .always_on_top(true) // fixme 是否置顶
            .skip_taskbar(true)
            .content_protected(false)
            .disable_drag_drop_handler()
            // 非当前窗口时，第一次点击会只用来激活窗口。打开后单击就能点到跳过。
            .accept_first_mouse(true)
            .build();

    if visible {
        if let Some(window) = app.get_webview_window(label) {
            present_break_window(&window, position, size, scale);
        }
    }
}

/// macOS 不进入系统全屏空间。系统全屏会在出现和消失时切换桌面，Windows 没有这一步。
fn present_break_window(
    window: &tauri::WebviewWindow,
    position: tauri::PhysicalPosition<i32>,
    size: tauri::PhysicalSize<u32>,
    scale: f64,
) {
    #[cfg(target_os = "macos")]
    {
        let _ = window.show();
        show_macos_break_overlay(window, position, size, scale);
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (position, size, scale);
        let _ = window.set_always_on_top(true);
        let _ = window.set_visible_on_all_workspaces(true);
        let _ = window.show();
        let _ = window.set_focus();
        let _ = window.set_simple_fullscreen(true);
    }
}

#[cfg(target_os = "macos")]
fn with_ns_window(window: &tauri::WebviewWindow, f: impl FnOnce(&objc2_app_kit::NSWindow)) {
    let Ok(ptr) = window.ns_window() else {
        return;
    };
    if ptr.is_null() {
        return;
    }
    unsafe {
        f(&*ptr.cast::<objc2_app_kit::NSWindow>());
    }
}

#[cfg(target_os = "macos")]
fn shielding_window_level() -> objc2_app_kit::NSWindowLevel {
    #[link(name = "CoreGraphics", kind = "framework")]
    extern "C" {
        fn CGShieldingWindowLevel() -> i32;
    }
    // 主屏全屏应用有一层 shielding window，普通屏保层级盖不住它。
    unsafe { CGShieldingWindowLevel() as objc2_app_kit::NSWindowLevel + 1 }
}

#[cfg(target_os = "macos")]
fn macos_screen_frames(app: &tauri::AppHandle) -> Vec<(f64, f64, f64, f64)> {
    let Some(anchor) = app.get_webview_window("config_window") else {
        return Vec::new();
    };
    let (tx, rx) = std::sync::mpsc::sync_channel(1);
    if anchor
        .run_on_main_thread(move || {
            use objc2::MainThreadMarker;
            use objc2_app_kit::NSScreen;

            let mut frames = Vec::new();
            if let Some(mtm) = MainThreadMarker::new() {
                for screen in NSScreen::screens(mtm).iter() {
                    let frame = screen.frame();
                    frames.push((
                        frame.origin.x,
                        frame.origin.y,
                        frame.size.width,
                        frame.size.height,
                    ));
                }
            }
            let _ = tx.send(frames);
        })
        .is_err()
    {
        return Vec::new();
    }
    rx.recv_timeout(Duration::from_secs(2))
        .unwrap_or_default()
}

#[cfg(target_os = "macos")]
fn show_macos_break_covering_each_screen(app: &tauri::AppHandle) {
    let frames = macos_screen_frames(app);
    for (i, _) in frames.iter().enumerate() {
        let label = format!("{}{}", BREAK_WINDOW_PREFIX, i);
        if app.get_webview_window(&label).is_none() {
            create_break_window(
                app,
                &label,
                tauri::PhysicalPosition { x: 0, y: 0 },
                tauri::PhysicalSize {
                    width: 800,
                    height: 600,
                },
                1.0,
                false,
            );
        }
    }

    let windows: Vec<_> = (0..frames.len())
        .filter_map(|i| app.get_webview_window(&format!("{}{}", BREAK_WINDOW_PREFIX, i)))
        .collect();
    for window in &windows {
        let _ = window.show();
    }
    let Some(anchor) = windows.first().cloned() else {
        return;
    };
    let windows = windows.clone();
    let _ = anchor.run_on_main_thread(move || {
        use objc2::MainThreadMarker;
        use objc2_app_kit::{
            NSScreen, NSWindowAnimationBehavior, NSWindowButton, NSWindowCollectionBehavior,
            NSWindowStyleMask, NSWindowTitleVisibility,
        };

        let Some(mtm) = MainThreadMarker::new() else {
            return;
        };
        remember_frontmost_app();

        let screens = NSScreen::screens(mtm);
        let level = shielding_window_level();
        for (window, screen) in windows.iter().zip(screens.iter()) {
            with_ns_window(window, |ns_window| {
                let mut behavior = ns_window.collectionBehavior();
                behavior.remove(NSWindowCollectionBehavior::MoveToActiveSpace);
                behavior.remove(NSWindowCollectionBehavior::FullScreenPrimary);
                behavior.remove(NSWindowCollectionBehavior::FullScreenNone);
                behavior.insert(NSWindowCollectionBehavior::CanJoinAllSpaces);
                behavior.insert(NSWindowCollectionBehavior::CanJoinAllApplications);
                behavior.insert(NSWindowCollectionBehavior::FullScreenAuxiliary);
                behavior.insert(NSWindowCollectionBehavior::Stationary);
                ns_window.setCollectionBehavior(behavior);

                let mut style = ns_window.styleMask();
                style.insert(NSWindowStyleMask::NonactivatingPanel);
                ns_window.setStyleMask(style);
                ns_window.setAnimationBehavior(NSWindowAnimationBehavior::None);
                ns_window.setHidesOnDeactivate(false);
                ns_window.setTitleVisibility(NSWindowTitleVisibility::Hidden);
                ns_window.setTitlebarAppearsTransparent(true);
                for kind in [
                    NSWindowButton::CloseButton,
                    NSWindowButton::MiniaturizeButton,
                    NSWindowButton::ZoomButton,
                ] {
                    if let Some(button) = ns_window.standardWindowButton(kind) {
                        let _: () = unsafe { objc2::msg_send![&*button, setHidden: true] };
                    }
                }
                ns_window.setFrame_display(screen.frame(), false);
                ns_window.setLevel(level);
                ns_window.setAcceptsMouseMovedEvents(true);
                ns_window.orderFrontRegardless();
                // 先成为 key window，WebKit 才会更新悬浮。再禁止激活应用，避免主屏被切走。
                ns_window.makeKeyWindow();
                let _: () = unsafe { objc2::msg_send![ns_window, _setPreventsActivation: true] };
            });
        }
    });
}

#[cfg(target_os = "macos")]
fn show_macos_break_overlay(
    window: &tauri::WebviewWindow,
    position: tauri::PhysicalPosition<i32>,
    size: tauri::PhysicalSize<u32>,
    scale: f64,
) {
    let window = window.clone();
    let _ = window.clone().run_on_main_thread(move || {
        use objc2_app_kit::{
            NSScreenSaverWindowLevel, NSWindowAnimationBehavior, NSWindowButton,
            NSWindowCollectionBehavior, NSWindowTitleVisibility,
        };

        use objc2::MainThreadMarker;
        use objc2_app_kit::{NSApplication, NSApplicationActivationPolicy, NSWindowStyleMask};

        with_ns_window(&window, |ns_window| {
            let mut behavior = ns_window.collectionBehavior();
            behavior.remove(NSWindowCollectionBehavior::MoveToActiveSpace);
            behavior.remove(NSWindowCollectionBehavior::FullScreenPrimary);
            behavior.remove(NSWindowCollectionBehavior::FullScreenNone);
            // 普通窗口进不了其他应用的全屏空间。CanJoinAllApplications 才能盖在那个空间上，且不切换桌面。
            behavior.insert(NSWindowCollectionBehavior::CanJoinAllSpaces);
            behavior.insert(NSWindowCollectionBehavior::CanJoinAllApplications);
            behavior.insert(NSWindowCollectionBehavior::FullScreenAuxiliary);
            behavior.insert(NSWindowCollectionBehavior::Stationary);
            ns_window.setCollectionBehavior(behavior);

            let mut style = ns_window.styleMask();
            style.insert(NSWindowStyleMask::NonactivatingPanel);
            ns_window.setStyleMask(style);
            ns_window.setAnimationBehavior(NSWindowAnimationBehavior::None);
            ns_window.setHidesOnDeactivate(false);
            ns_window.setTitleVisibility(NSWindowTitleVisibility::Hidden);
            ns_window.setTitlebarAppearsTransparent(true);
            for kind in [
                NSWindowButton::CloseButton,
                NSWindowButton::MiniaturizeButton,
                NSWindowButton::ZoomButton,
            ] {
                if let Some(button) = ns_window.standardWindowButton(kind) {
                    let _: () = unsafe { objc2::msg_send![&*button, setHidden: true] };
                }
            }
            let screen = ns_screen_for_monitor(position, size, scale).or_else(|| ns_window.screen());
            if let Some(screen) = screen {
                ns_window.setFrame_display(screen.frame(), false);
            }
            ns_window.setLevel(NSScreenSaverWindowLevel);
            ns_window.orderFrontRegardless();
        });

        // 附属策略会把已经显示的窗口清掉，所以先改策略，全部窗口摆完后再统一置前。
        if let Some(mtm) = MainThreadMarker::new() {
            let _ = NSApplication::sharedApplication(mtm)
                .setActivationPolicy(NSApplicationActivationPolicy::Accessory);
        }
    });
}

#[cfg(target_os = "macos")]
fn ns_screen_for_monitor(
    position: tauri::PhysicalPosition<i32>,
    _size: tauri::PhysicalSize<u32>,
    scale: f64,
) -> Option<objc2::rc::Retained<objc2_app_kit::NSScreen>> {
    use objc2::MainThreadMarker;
    use objc2_app_kit::NSScreen;

    let mtm = MainThreadMarker::new()?;
    let screens = NSScreen::screens(mtm);
    if screens.count() == 0 {
        return None;
    }
    let primary = screens.objectAtIndex(0);
    let primary_frame = primary.frame();
    let primary_max_y = primary_frame.origin.y + primary_frame.size.height;
    let scale = if scale > 0.0 { scale } else { 1.0 };
    let target_x = position.x as f64 / scale;
    let target_y = position.y as f64 / scale;

    let mut best: Option<objc2::rc::Retained<NSScreen>> = None;
    let mut best_dist = f64::MAX;
    for screen in screens.iter() {
        let frame = screen.frame();
        // 不用物理尺寸比较。内置视网膜屏的尺寸会被缩放算两次，对不上点坐标，窗口就会被放到扩展屏上。
        let cg_x = frame.origin.x;
        let cg_y = primary_max_y - (frame.origin.y + frame.size.height);
        let dist = (cg_x - target_x).powi(2) + (cg_y - target_y).powi(2);
        if dist < best_dist {
            best_dist = dist;
            best = Some(screen.clone());
        }
    }
    best
}

#[cfg(target_os = "macos")]
fn remember_frontmost_app() {
    use objc2_app_kit::{NSRunningApplication, NSWorkspace};

    let Some(front) = NSWorkspace::sharedWorkspace().frontmostApplication() else {
        return;
    };
    let Some(front_id) = front.bundleIdentifier() else {
        return;
    };
    let ours = NSRunningApplication::currentApplication();
    if ours
        .bundleIdentifier()
        .is_some_and(|bundle| bundle.to_string() == front_id.to_string())
    {
        return;
    }
    *PREVIOUS_FRONTMOST_BUNDLE.lock().unwrap() = Some(front_id.to_string());
}

#[cfg(target_os = "macos")]
fn restore_previous_frontmost_app(window: &tauri::WebviewWindow) {
    let window = window.clone();
    let _ = window.run_on_main_thread(move || {
        use objc2::MainThreadMarker;
        use objc2_app_kit::{
            NSApplication, NSApplicationActivationOptions, NSRunningApplication, NSWorkspace,
        };
        use objc2_foundation::NSString;

        let Some(front) = NSWorkspace::sharedWorkspace().frontmostApplication() else {
            return;
        };
        let ours = NSRunningApplication::currentApplication();
        let we_are_front = match (front.bundleIdentifier(), ours.bundleIdentifier()) {
            (Some(front_id), Some(our_id)) => front_id.to_string() == our_id.to_string(),
            _ => false,
        };
        // 倒计时结束时前台仍是原来的应用，不要再激活一次。
        if !we_are_front {
            return;
        }
        let Some(bundle_id) = PREVIOUS_FRONTMOST_BUNDLE.lock().unwrap().take() else {
            return;
        };
        let bundle = NSString::from_str(&bundle_id);
        let Some(previous) = NSRunningApplication::runningApplicationsWithBundleIdentifier(&bundle)
            .iter()
            .next()
        else {
            return;
        };
        let Some(mtm) = MainThreadMarker::new() else {
            return;
        };
        NSApplication::sharedApplication(mtm).yieldActivationToApplication(&previous);
        let _ = previous.activateWithOptions(NSApplicationActivationOptions::ActivateAllWindows);
    });
}

#[cfg(target_os = "macos")]
fn hide_dock_icon() {
    use objc2::MainThreadMarker;
    use objc2_app_kit::{NSApplication, NSApplicationActivationPolicy};

    let Some(mtm) = MainThreadMarker::new() else {
        return;
    };
    let _ = NSApplication::sharedApplication(mtm)
        .setActivationPolicy(NSApplicationActivationPolicy::Accessory);
}

fn dismiss_break_window(window: &tauri::WebviewWindow) {
    #[cfg(target_os = "macos")]
    {
        let window_for_order_out = window.clone();
        let _ = window.clone().run_on_main_thread(move || {
            use objc2_app_kit::NSNormalWindowLevel;

            with_ns_window(&window_for_order_out, |ns_window| {
                ns_window.setLevel(NSNormalWindowLevel);
                ns_window.orderOut(None);
            });
        });
        let _ = window.hide();
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = window.set_simple_fullscreen(false);
        let _ = window.hide();
    }
}

fn create_tray<R: Runtime>(app: &tauri::App<R>) -> Result<(), tauri::Error> {
    // 菜单按钮名称，国际化
    let i18n: I18nTexts = get_i18n_texts(app.app_handle());

    let config_setting_i = MenuItem::with_id(
        app,
        CONFIG_SETTING,
        i18n.tray_menu_config,
        true,
        None::<&str>,
    )?;
    let quit_i = MenuItem::with_id(app, QUIT_APP, i18n.tray_menu_quit, true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&config_setting_i, &quit_i])?;

    // macOS 菜单栏惯例是单色模板图标，系统自动按菜单栏明暗反色；
    // Windows/Linux 托盘彩色图标是常态，继续用应用图标
    #[cfg(target_os = "macos")]
    let tray_icon = tauri::image::Image::new(
        include_bytes!("../icons/tray-macos.rgba"), // 44x44 原始 RGBA，由脚本从 app-icon.png 生成
        44,
        44,
    );
    #[cfg(not(target_os = "macos"))]
    let tray_icon = app.default_window_icon().unwrap().clone();

    let builder = TrayIconBuilder::with_id("tray_icon")
        .icon(tray_icon)
        .menu(&menu)
        .tooltip("HardBreak")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            CONFIG_SETTING => {
                show_config_window(app);
            }
            QUIT_APP => {
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|_tray, _event| {});

    #[cfg(target_os = "macos")]
    let builder = builder.icon_as_template(true);

    let _tray = builder.build(app)?;

    Ok(())
}

fn main_window_close_event<R: Runtime>(app: &tauri::App<R>) -> Result<(), tauri::Error> {
    // 拦截主窗口关闭事件，改为隐藏
    if let Some(main_window) = app.get_webview_window("main") {
        let main_window_clone = main_window.clone();
        main_window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close(); // 阻止默认的关闭（销毁）行为
                let _ = main_window_clone.hide(); // 改为隐藏窗口

                // 参考 hide 方法
            }
        });
    }
    Ok(())
}

fn config_window_close_event<R: Runtime>(app: &tauri::App<R>) -> Result<(), tauri::Error> {
    // 配置窗口的关闭事件，改为隐藏
    if let Some(config_window) = app.get_webview_window("config_window") {
        let config_window_clone = config_window.clone();
        config_window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close(); // 阻止默认的关闭（销毁）行为
                let _ = config_window_clone.hide(); // 改为隐藏窗口
            }
        });
    }
    Ok(())
}

/// 显示配置窗口（启动时已预创建，此处仅显示并聚焦）
fn show_config_window<R: Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window("config_window") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn send_break_notification(app: tauri::AppHandle) {
    let i18n: I18nTexts = get_i18n_texts(&app);

    #[cfg(target_os = "macos")]
    {
        // 开发时插件会把通知记到 Terminal，并在后台线程投递，Cursor 里启动时横幅不会出现。
        send_macos_user_notification(&i18n.notification_title, &i18n.notification_body);
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = app
            .notification()
            .builder()
            .title(&i18n.notification_title)
            .body(&i18n.notification_body)
            .show();
    }
}

#[cfg(target_os = "macos")]
fn send_macos_user_notification(title: &str, body: &str) {
    fn escape_applescript(value: &str) -> String {
        value.replace('\\', "\\\\").replace('"', "\\\"")
    }

    // 左侧图标由发送进程决定。开发时这条通知由系统脚本发出，才能在当前 macOS 上弹出。
    let script = format!(
        "display notification \"{}\" with title \"{}\" sound name \"default\"",
        escape_applescript(body),
        escape_applescript(title)
    );
    let _ = std::process::Command::new("/usr/bin/osascript")
        .arg("-e")
        .arg(script)
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn();
}

// 获取当前语言的辅助函数
fn get_i18n_texts<R: Runtime>(app: &tauri::AppHandle<R>) -> I18nTexts {
    let state = app.state::<AppState>();
    let language = state.settings.lock().unwrap().language.clone();
    I18nTexts::new(&language)
}
