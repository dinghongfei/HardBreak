-- 常规配置表
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
);

-- 默认配置值
INSERT INTO settings (key, value) VALUES ('work_duration',  '25');
INSERT INTO settings (key, value) VALUES ('break_duration', '5');
INSERT INTO settings (key, value) VALUES ('notify_before_break', '1');
INSERT INTO settings (key, value) VALUES ('no_skip_mode', '0');
INSERT INTO settings (key, value) VALUES ('first_run', '1');