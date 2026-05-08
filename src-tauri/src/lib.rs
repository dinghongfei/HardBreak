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
const SHOW_MAIN_WINDOW: &str = "show_main_window";
const QUIT_APP: &str = "quit_app";

#[tauri::command]
fn hide_main_window(window: tauri::WebviewWindow) {
    let _ = window.hide();
    // 通知前端：窗口已展示，刷新提示语
    let _ = window.emit("hide_main_window", ()).unwrap();
}

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    _show_main_window(&app);
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
            // 创建托盘菜单
            let config_setting_i =
                MenuItem::with_id(app, CONFIG_SETTING, "配置", true, None::<&str>)?;
            let show_main_window_i =
                MenuItem::with_id(app, SHOW_MAIN_WINDOW, "显示", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, QUIT_APP, "退出", true, None::<&str>)?;

            // let menu = Menu::with_items(app, &[&config_setting_i, &show_main_window_i, &quit_i])?;
            let menu = Menu::with_items(app, &[&config_setting_i, &quit_i])?;

            // 创建托盘图标
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .tooltip("HardBreak")
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    CONFIG_SETTING => {
                        // let _ = app.emit("tray-pause-timer", ());
                        show_config_window(app);
                    }
                    SHOW_MAIN_WINDOW => {
                        // let _ = app.emit("tray-pause-timer", ());
                        _show_main_window(app);
                    }
                    QUIT_APP => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {})
                .build(app)?;
            // 预创建配置窗口（默认隐藏）
            let _config_window = tauri::WebviewWindowBuilder::new(
                app,
                "config_window",
                tauri::WebviewUrl::App("config.html".into()),
            )
            .title("配置")
            .inner_size(760.0, 480.0)
            .resizable(false)
            .center()
            .visible(false) // 关键：默认不显示
            .closable(true)
            .build()?;

            let config_window_clone = _config_window.clone();
            _config_window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close(); // 阻止默认的关闭（销毁）行为
                    let _ = config_window_clone.hide(); // 改为隐藏窗口
                }
            });

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
        })
        .invoke_handler(tauri::generate_handler![
            hide_main_window,
            show_main_window,
            send_break_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn _show_main_window<R: Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
        // 通知前端：窗口已展示，刷新提示语
        let _ = app.emit("show_main_window", ()).unwrap();
    }
}

/// 显示配置窗口（启动时已预创建，此处仅显示并聚焦）
fn show_config_window<R: Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(window) = app.get_webview_window("config_window") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}
