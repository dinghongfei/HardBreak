// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::thread;
use std::time::Duration; // ✅ 从 serde 导入

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, Runtime,
};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_sql::{Migration, MigrationKind};

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
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            work_duration: 25,
            break_duration: 5,
            notify_before_break: true,
            no_skip_mode: false,
            first_run: false,
        }
    }
}

// ==================== 定时器状态 ====================

struct TimerState {
    settings: Mutex<AppSettings>,
    running: Mutex<bool>,
    current_phase: Mutex<TimerPhase>, // 使用枚举，避免魔法值
    remaining_seconds: Mutex<i32>,
}

// ==================== Tauri 命令 ====================

// 更新配置的命令
#[tauri::command]
fn update_settings(app: tauri::AppHandle, window: tauri::WebviewWindow, settings: AppSettings) {
    let state = app.state::<TimerState>();
    let first_run = settings.first_run;
    *state.settings.lock().unwrap() = settings;

    // 如果是第一次，弹出
    if first_run {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

// 启动定时器循环
#[tauri::command]
fn start_timer_cycle(app: tauri::AppHandle) {
    let state = app.state::<TimerState>();

    // 防止重复启动
    let mut running = state.running.lock().unwrap();
    if *running {
        return;
    }
    *running = true;

    // 释放锁
    drop(running);

    // println!("Starting timer cycle...");

    // 启动定时器线程
    let app_clone = app.clone();

    let main_window = app_clone.get_webview_window("main");

    thread::spawn(move || {
        let state = app_clone.state::<TimerState>();

        // 初始为工作状态
        *state.current_phase.lock().unwrap() = TimerPhase::Work;

        loop {
            // 检查是否需要停止
            if !*state.running.lock().unwrap() {
                break;
            }

            // 获取当前阶段（使用枚举，类型安全）
            let phase = state.current_phase.lock().unwrap().clone();

            // 根据阶段获取持续时间
            // 根据阶段获取持续时间
            let duration_seconds = {
                let settings = state.settings.lock().unwrap();
                match phase {
                    TimerPhase::Work => settings.work_duration * 60,
                    TimerPhase::Break => settings.break_duration * 60,
                }
            };

            // 设置剩余时间
            *state.remaining_seconds.lock().unwrap() = duration_seconds;

            // println!("Starting {:?} phase: {} seconds", phase, duration_seconds);

            // 执行当前阶段的倒计时
            let mut notified = false;
            let mut remaining = duration_seconds;

            while remaining > 0 {
                
                // 检查是否需要停止
                if !*state.running.lock().unwrap() {
                    return;
                }

                // ★ 新增：检查阶段是否被外部重置
                let new_phase = state.current_phase.lock().unwrap().clone();
                if new_phase != phase {
                    // 阶段已被重置，跳出当前循环，外层 loop 会处理新阶段
                    break;
                }

                remaining -= 1;
                *state.remaining_seconds.lock().unwrap() = remaining;

                // 发送更新事件到前端
                let _ = app_clone.emit(
                    "app-state-update",
                    serde_json::json!({
                        "phase": phase.as_str(),  // 转换为字符串发送给前端
                        "duration": duration_seconds,
                        "remaining": remaining,
                        "no_skip_mode": state.settings.lock().unwrap().no_skip_mode,
                    }),
                );

                // 工作阶段：检查是否需要发送通知（剩余10秒）
                if matches!(phase, TimerPhase::Work) && !notified && remaining == 10 {
                    let notify_before_break = state.settings.lock().unwrap().notify_before_break;
                    if notify_before_break {
                        notified = true;
                        // 发送进入休息阶段通知
                        send_break_notification(app_clone.clone());
                    }
                }

                // println!("{:?} phase: {} seconds remaining", phase, remaining);

                thread::sleep(Duration::from_secs(1));

                // 调试输出（每分钟或最后10秒）
                // if remaining % 60 == 0 || remaining <= 10 {
                //     println!("{:?} phase: {} seconds remaining", phase, remaining);
                // }
            }

            // println!(
            //     "{:?} phase ended, switching to {:?} phase",
            //     phase, next_phase
            // );

            // ★ 新增：检查阶段是否在倒计时期间被重置
            let current_phase_after_loop = state.current_phase.lock().unwrap().clone();
            if current_phase_after_loop != phase {
                // 阶段已被重置，不发送窗口事件，直接进入下一次循环
                continue;
            }

            // 发送事件：根据当前阶段决定显示还是隐藏窗口
            if let Some(win) = main_window.as_ref() {
                match phase {
                    TimerPhase::Work => {
                        // 工作结束，显示主窗口（开始休息）
                        let _ = win.show();
                        let _ = win.set_focus();
                        let _ = app_clone.emit("break_start", ());
                    }
                    TimerPhase::Break => {
                        // 休息结束，隐藏主窗口（开始工作）
                        let _ = win.hide();
                        let _ = app_clone.emit("work_start", ());
                    }
                }
            }

            // 阶段结束，切换到下一阶段
            let next_phase = phase.next();
            *state.current_phase.lock().unwrap() = next_phase;
        }
    });
}

// // 停止定时器循环
// #[tauri::command]
// fn stop_timer_cycle(app: tauri::AppHandle) {
//     let state = app.state::<TimerState>();
//     *state.running.lock().unwrap() = false;
// }

// // 获取当前状态
// #[tauri::command]
// fn get_timer_status(app: tauri::AppHandle) -> serde_json::Value {
//     let state = app.state::<TimerState>();

//     let phase = state.current_phase.lock().unwrap().clone();

//     serde_json::json!({
//         "running": *state.running.lock().unwrap(),
//         "phase": phase.as_str(),
//         "remaining": *state.remaining_seconds.lock().unwrap()
//     })
// }

#[tauri::command]
fn hide_main_window(app: tauri::AppHandle) {
    let state = app.state::<TimerState>();

    // 强制切换到工作阶段
    *state.current_phase.lock().unwrap() = TimerPhase::Work;

    // 隐藏窗口
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }

    // 通知前端：休息已跳过，开始工作阶段
    let _ = app.emit("work_start", ());
}

// #[tauri::command]
// fn show_main_window(app: tauri::AppHandle) {
//     if let Some(window) = app.get_webview_window("main") {
//         let _ = window.show();
//         let _ = window.set_focus();
//         // 通知前端：窗口已展示，刷新提示语
//         let _ = app.emit("show_main_window", ()).unwrap();
//     }
// }

// #[tauri::command]
// fn send_break_notification(app: tauri::AppHandle) {
//     let _ = app
//         .notification()
//         .builder()
//         .title("HardBreak")
//         .body("10秒后进入休息，请做好准备")
//         .show();
// }

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
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {}))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:config.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_opener::init())
        .manage(TimerState {
            settings: Mutex::new(AppSettings::default()),
            running: Mutex::new(false),
            current_phase: Mutex::new(TimerPhase::Work), // 使用枚举
            remaining_seconds: Mutex::new(0),
        })
        .setup(|app| {
            // 创建托盘
            create_tray(app)?;

            main_window_close_event(app)?;
            config_window_close_event(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            update_settings,
            start_timer_cycle,
            hide_main_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn create_tray<R: Runtime>(app: &tauri::App<R>) -> Result<(), tauri::Error> {
    let config_setting_i = MenuItem::with_id(app, CONFIG_SETTING, "配置", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, QUIT_APP, "退出", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&config_setting_i, &quit_i])?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
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
        .on_tray_icon_event(|_tray, _event| {})
        .build(app)?;

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
    // 处理多语言国际化
    let _ = app
        .notification()
        .builder()
        .title("HardBreak")
        .body("10秒后进入休息，请做好准备")
        .show();
}
