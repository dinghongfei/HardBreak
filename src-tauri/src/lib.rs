// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
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

#[tauri::command]
fn hide_main_window(window: tauri::WebviewWindow) {
    let _ = window.hide();
    // 通知前端：窗口已展示，刷新提示语
    let _ = window.emit("hide_main_window", ()).unwrap();
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        // 通知前端：窗口已展示，刷新提示语
        let _ = app.emit("show_main_window", ()).unwrap();
    }
}

#[tauri::command]
fn send_break_notification(app: tauri::AppHandle) {
    let _ = app
        .notification()
        .builder()
        .title("HardBreak")
        .body("10秒后进入休息，请做好准备")
        .show();
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
        .setup(|app| {
            // 创建托盘
            create_tray(app)?;

            main_window_close_event(app)?;
            config_window_close_event(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hide_main_window,
            show_main_window,
            send_break_notification
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
                                                  // 通知前端：窗口已展示，刷新提示语
                let _ = main_window_clone.emit("hide_main_window", ()).unwrap();
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
