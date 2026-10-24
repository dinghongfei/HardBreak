const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { locale } = window.__TAURI__.os;

// ==================== 多语言（文案集中在 locales.js，加语言只需改该文件） ====================
const LOCALES = window.HB_LOCALES;
const FALLBACK_LOCALE = LOCALES[window.HB_FALLBACK_LANG] || LOCALES.en;

function getLocale(language) {
    return LOCALES[language] || FALLBACK_LOCALE;
}

// 系统语言 → 应用语言
function detectLanguage(systemLocale) {
    for (const [re, code] of window.HB_LANG_MATCH) {
        if (re.test(systemLocale)) return code;
    }
    return window.HB_FALLBACK_LANG;
}





// 缓存数据库连接，避免每次读写都重新加载
let dbPromise = null;
function loadDatabase() {
    if (!dbPromise) {
        const Database = window.__TAURI__.sql;
        dbPromise = Database.load("sqlite:config.db");
    }
    return dbPromise;
}

async function saveSetting(key, value) {
    const db = await loadDatabase();
    await db.execute("UPDATE settings SET value = $1 WHERE key = $2", [String(value), key]);

    // 数据状态更新到后端
    await syncSettingsToBackend();

}


async function querySettings() {
    const db = await loadDatabase();
    const rows = await db.select("select * from settings");

    // 将数组转换为对象: { work_duration: '25', break_duration: '5', ... }
    const settings = {};
    for (const row of rows) {
        settings[row.key] = row.value;
    }
    return settings;
}


async function syncSettingsToBackend() {
    const settings = await querySettings();

    const backendSettings = {
        work_duration: parseInt(settings.work_duration) || 25,
        break_duration: parseInt(settings.break_duration) || 5,
        notify_before_break: settings.notify_before_break === '1',
        no_skip_mode: settings.no_skip_mode === '1',
        first_run: settings.first_run === '1',
        language: settings.language || 'zh-CN',
        countdown_mode: settings.countdown_mode || 'ring',
    };

    await invoke('update_settings', { settings: backendSettings });

    return backendSettings;
}



// 滑块交互
function initSlider(thumb, fill, valueEl, min, max, onDragEnd) {
    const track = thumb.parentElement;
    const minPercent = (min / max) * 100;
    let isDragging = false;
    let currentValue = min;

    const updatePosition = (percent) => {
        percent = Math.max(minPercent, Math.min(100, percent));
        thumb.style.left = percent + '%';
        fill.style.width = percent + '%';
        currentValue = Math.round(percent / 100 * max);
        valueEl.textContent = currentValue;
    };

    const handleMove = (clientX) => {
        const rect = track.getBoundingClientRect();
        const percent = ((clientX - rect.left) / rect.width) * 100;
        updatePosition(percent);
    };

    let dragEndedAt = 0;
    thumb.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mouseup', () => {
        if (isDragging && onDragEnd) {
            onDragEnd(currentValue);
            dragEndedAt = Date.now();
        }
        isDragging = false;
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) handleMove(e.clientX);
    });

    track.addEventListener('click', (e) => {
        // 拖拽刚结束时浏览器会补发一次 click，mouseup 里已保存过，跳过避免重复写库
        if (Date.now() - dragEndedAt < 100) return;
        handleMove(e.clientX);
        if (onDragEnd) onDragEnd(currentValue);
    });

    return { updatePosition };
}



function languageChanged(language) {
    document.getElementById('language-select').value = language;

    const i18n = getLocale(language).configMessages;

    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        el.textContent = i18n[key];
    });
}


let language_argument = 'zh-CN';

window.addEventListener("DOMContentLoaded", async () => {
    // 语言选择器按 locale 表动态生成（locales.js 加语言后自动出现）
    const languageSelect = document.getElementById('language-select');
    for (const [code, loc] of Object.entries(LOCALES)) {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = loc.name;
        languageSelect.appendChild(opt);
    }

    // 首次运行检测：如果是第一次启动，显示配置窗口并标记为非首次
    const settings = await syncSettingsToBackend();

    if (settings.first_run) {
        const systemLocale = await locale() || 'zh-CN';
        const language = detectLanguage(systemLocale);

        // 第一次访问，先获取语言
        // 处理前端第一次语言展示
        if (language !== 'zh-CN') {
            settings.language = language;

            // 更新语言
            await saveSetting('language', language);
        }

        // 更新第一次效果
        await saveSetting('first_run', '0');
    }

    // 启动定时任务
    invoke('start_timer_cycle');


    // 首次刷新一下页面语言
    if (settings.language !== 'zh-CN') {
        languageChanged(settings.language);
    }


    // 更新应用版本
    const appVersion = await invoke('get_app_version');
    document.getElementById('app-version').textContent = appVersion;



    const statusSubtitleEl = document.getElementById('status-subtitle');
    const statusLableEl = document.getElementById('status-label');
    const statusNumberEl = document.getElementById('status-number');

    // 「立即生效」按钮状态：current* 是滑块当前值，effective* 是已生效值。
    // 两者不一致（用户拖过滑块）才展示按钮。
    let currentWorkDuration = parseInt(settings.work_duration) || 25;
    let currentBreakDuration = parseInt(settings.break_duration) || 5;
    let effectiveWorkDuration = currentWorkDuration;
    let effectiveBreakDuration = currentBreakDuration;
    let lastPhase = null;

    const applyNowContainer = document.querySelector('.apply-now-container');
    function updateApplyNowVisibility() {
        const dirty = currentWorkDuration !== effectiveWorkDuration
            || currentBreakDuration !== effectiveBreakDuration;
        applyNowContainer.classList.toggle('visible', dirty);
    }

    listen('app-state-update', (event) => {

        const { phase, remaining, current_language } = event.payload;

        const i18n = getLocale(current_language).configMessages;

        statusSubtitleEl.textContent = phase === 'work' ? i18n['config.tab.general.status.subtitle.work'] : i18n['config.tab.general.status.subtitle.break'];
        statusLableEl.textContent = phase === 'work' ? i18n['config.tab.general.status.label.break'] : i18n['config.tab.general.status.label.work'];


        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        statusNumberEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // 阶段自然切换后，对应阶段的时长已经开始生效，同步基准值
        if (lastPhase !== null && phase !== lastPhase) {
            if (phase === 'break') {
                effectiveBreakDuration = currentBreakDuration;
            } else {
                effectiveWorkDuration = currentWorkDuration;
            }
            updateApplyNowVisibility();
        }
        lastPhase = phase;

    })




    // 查询数据库设置，带默认兜底
    const workDuration = parseInt(settings.work_duration) || 25;
    const breakDuration = parseInt(settings.break_duration) || 5;
    const notifyBeforeBreak = settings.notify_before_break;
    const noSkipMode = settings.no_skip_mode;


    // 标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });


    // 初始化工作时长滑块 (最小1分钟, 最大120分钟)
    const workSlider = initSlider(
        document.getElementById('workThumb'),
        document.getElementById('workSliderFill'),
        document.getElementById('workDurationValue'),
        1, 120,
        (value) => {
            saveSetting('work_duration', value);
            currentWorkDuration = value;
            updateApplyNowVisibility();
        }
    );
    workSlider.updatePosition((workDuration / 120) * 100);

    // 初始化休息时长滑块 (最小1分钟, 最大60分钟)
    const breakSlider = initSlider(
        document.getElementById('breakThumb'),
        document.getElementById('breakSliderFill'),
        document.getElementById('breakDurationValue'),
        1, 60,
        (value) => {
            saveSetting('break_duration', value);
            currentBreakDuration = value;
            updateApplyNowVisibility();
        }
    );
    breakSlider.updatePosition((breakDuration / 60) * 100);

    // 初始化进入休息前提醒开关
    const notifyToggle = document.getElementById('notifyToggle');
    if (notifyBeforeBreak) {
        notifyToggle.classList.add('on');
    } else {
        notifyToggle.classList.remove('on');
    }

    notifyToggle.addEventListener('click', () => {
        const isOn = notifyToggle.classList.contains('on');
        if (isOn) {
            notifyToggle.classList.remove('on');
        } else {
            notifyToggle.classList.add('on');
        }
        saveSetting('notify_before_break', isOn ? '0' : '1');
    });

    // 初始化不可跳过模式开关
    const noSkipToggle = document.getElementById('noSkipToggle');
    if (noSkipMode) {
        noSkipToggle.classList.add('on');
    } else {
        noSkipToggle.classList.remove('on');
    }

    function setNoSkipMode(on) {
        noSkipToggle.classList.toggle('on', on);
        saveSetting('no_skip_mode', on ? '1' : '0');
    }

    // 关闭不需要确认；开启前二次确认（自绘弹窗，macOS WKWebView 不支持 confirm()）
    const noSkipConfirmOverlay = document.getElementById('noSkipConfirm');
    const closeNoSkipConfirm = () => noSkipConfirmOverlay.style.display = 'none';

    noSkipToggle.addEventListener('click', () => {
        if (noSkipToggle.classList.contains('on')) {
            setNoSkipMode(false);
        } else {
            noSkipConfirmOverlay.style.display = 'flex';
        }
    });

    document.getElementById('noSkipCancel').addEventListener('click', closeNoSkipConfirm);
    document.getElementById('noSkipOk').addEventListener('click', () => {
        closeNoSkipConfirm();
        setNoSkipMode(true);
    });
    // 点遮罩或按 Esc 取消
    noSkipConfirmOverlay.addEventListener('click', (e) => {
        if (e.target === noSkipConfirmOverlay) closeNoSkipConfirm();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeNoSkipConfirm();
    });






    document.getElementById('language-select').addEventListener('change', (e) => {
        const language = e.target.value;
        languageChanged(language);
        saveSetting('language', language);
    });

    // 时长立即生效：回到工作阶段起点，按新时长重新计时（等同重启应用）
    document.getElementById('applyNowBtn').addEventListener('click', () => {
        invoke('restart_timer_cycle');
        // 新时长已立即生效：同步基准值并隐藏按钮
        effectiveWorkDuration = currentWorkDuration;
        effectiveBreakDuration = currentBreakDuration;
        updateApplyNowVisibility();
    });

    // 倒计时样式选择：点击卡片保存，随下一次 app-state-update（≤1秒）同步到休息窗
    const savedCountdownMode = settings.countdown_mode || 'ring';
    document.querySelectorAll('.countdown-mode-card').forEach(card => {
        if (card.dataset.mode === savedCountdownMode) {
            card.classList.add('active');
        }
        card.addEventListener('click', () => {
            document.querySelectorAll('.countdown-mode-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            saveSetting('countdown_mode', card.dataset.mode);
        });
    });

});

// 全局禁用所有元素的右键菜单
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});