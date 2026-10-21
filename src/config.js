const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;
const { locale } = window.__TAURI__.os;


const i18nMessages = {
    'zh-CN': {
        'config.tab.general': "常规",
        'config.tab.about': "关于",
        'config.tab.general.status.title': "运行中",
        'config.tab.general.status.subtitle.work': '当前正在工作',
        'config.tab.general.status.subtitle.break': '当前正在休息',
        'config.tab.general.status.label.work': '距离下一次工作倒计时',
        'config.tab.general.status.label.break': '距离下一次休息倒计时',
        'config.tab.general.work.label': '工作时长',
        'config.tab.general.work.unit': '分钟',
        'config.tab.general.break.label': '休息时长',
        'config.tab.general.break.unit': '分钟',
        'config.tab.general.notify.label': '进入休息前提醒',
        'config.tab.general.notify.tip': '开启后，休息前10秒弹窗提醒',
        'config.tab.general.noSkip.label': '不可跳过模式',
        'config.tab.general.noSkip.tip': '开启后，休息不可跳过',
        'config.tab.general.language.label': '语言',
        'config.tab.general.applyNow.btn': '立即生效',
        'config.tab.general.applyNow.tip': '工作/休息时长默认从下一阶段开始生效。点击后立即按新时长从工作阶段重新计时，效果等同重启应用。',
        'config.tab.about.version.label': '版本',
        'config.tab.about.description.label': '描述',
        'config.tab.about.description.text': '一款帮助你养成良好工作休息习惯的应用，定时提醒你休息，保护你的健康。',
    },
    'zh-TW': {
        'config.tab.general': "一般",
        'config.tab.about': "關於",
        'config.tab.general.status.title': "運行中",
        'config.tab.general.status.subtitle.work': '當前正在工作',
        'config.tab.general.status.subtitle.break': '當前正在休息',
        'config.tab.general.status.label.work': '距離下一次工作倒計時',
        'config.tab.general.status.label.break': '距離下一次休息倒計時',
        'config.tab.general.work.label': '工作時長',
        'config.tab.general.work.unit': '分鐘',
        'config.tab.general.break.label': '休息時長',
        'config.tab.general.break.unit': '分鐘',
        'config.tab.general.notify.label': '進入休息前提醒',
        'config.tab.general.notify.tip': '開啟後，休息前10秒彈窗提醒',
        'config.tab.general.noSkip.label': '不可跳過模式',
        'config.tab.general.noSkip.tip': '開啟後，休息不可跳過',
        'config.tab.general.language.label': '語言',
        'config.tab.general.applyNow.btn': '立即生效',
        'config.tab.general.applyNow.tip': '工作/休息時長預設從下一階段開始生效。點擊後立即依新時長從工作階段重新計時，效果等同重新啟動應用。',
        'config.tab.about.version.label': '版本',
        'config.tab.about.description.label': '描述',
        'config.tab.about.description.text': '一款幫助你養成良好工作休息習慣的應用，定時提醒你休息，保護你的健康。',
    },
    en: {
        'config.tab.general': "General",
        'config.tab.about': "About",
        'config.tab.general.status.title': "Running",
        'config.tab.general.status.subtitle.work': 'Currently working',
        'config.tab.general.status.subtitle.break': 'Currently on break',
        'config.tab.general.status.label.work': 'Countdown to next work',
        'config.tab.general.status.label.break': 'Countdown to next break',
        'config.tab.general.work.label': 'Work duration',
        'config.tab.general.work.unit': 'min',
        'config.tab.general.break.label': 'Break duration',
        'config.tab.general.break.unit': 'min',
        'config.tab.general.notify.label': 'Notify before break',
        'config.tab.general.notify.tip': 'Notify 10 seconds before break',
        'config.tab.general.noSkip.label': 'No-skip mode',
        'config.tab.general.noSkip.tip': 'Break cannot be skipped when enabled',
        'config.tab.general.language.label': 'Language',
        'config.tab.general.applyNow.btn': 'Apply Now',
        'config.tab.general.applyNow.tip': 'New durations apply from the next work/break phase by default. Click to restart timing from the work phase with the new durations immediately — same as relaunching the app.',
        'config.tab.about.version.label': 'Version',
        'config.tab.about.description.label': 'Description',
        'config.tab.about.description.text': 'An app that helps you develop good work-break habits, reminding you to take breaks regularly to protect your health.',
    },
};



async function loadDatabase() {
    const Database = window.__TAURI__.sql;

    const db = await Database.load("sqlite:config.db");
    return db;
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

    thumb.addEventListener('mousedown', () => isDragging = true);
    document.addEventListener('mouseup', () => {
        if (isDragging && onDragEnd) {
            onDragEnd(currentValue);
        }
        isDragging = false;
    });
    document.addEventListener('mousemove', (e) => {
        if (isDragging) handleMove(e.clientX);
    });

    track.addEventListener('click', (e) => {
        handleMove(e.clientX);
        if (onDragEnd) onDragEnd(currentValue);
    });

    return { updatePosition };
}



function languageChanged(language) {
    document.getElementById('language-select').value = language;

    const i18n = i18nMessages[language] || i18nMessages.en;

    document.querySelectorAll('[data-translate]').forEach(el => {
        const key = el.getAttribute('data-translate');
        el.textContent = i18n[key];
    });
}


let language_argument = 'zh-CN';

window.addEventListener("DOMContentLoaded", async () => {
    // 首次运行检测：如果是第一次启动，显示配置窗口并标记为非首次
    const settings = await syncSettingsToBackend();

    if (settings.first_run) {
        const systemLocale = await locale() || 'zh-CN';
        const language = systemLocale.includes('zh') ? (systemLocale === 'zh-CN' ? 'zh-CN' : 'zh-TW') : 'en'
        // const language = 'en'

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

        const i18n = i18nMessages[current_language] || i18nMessages.en;

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
    noSkipToggle.addEventListener('click', () => {
        const isOn = noSkipToggle.classList.contains('on');
        if (isOn) {
            noSkipToggle.classList.remove('on');
        } else {
            noSkipToggle.classList.toggle('on');
        }
        saveSetting('no_skip_mode', isOn ? '0' : '1');
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












    // 删除提示语
    document.querySelectorAll('.icon-btn.danger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (confirm('确定删除这条提示语吗？')) {
                e.target.closest('.tip-card').remove();
            }
        });
    });

    // 编辑提示语
    document.querySelectorAll('.icon-btn:not(.danger)').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const card = e.target.closest('.tip-card');
            const texts = card.querySelectorAll('.tip-text');
            const newPrimary = prompt('一级提示:', texts[0].textContent);
            if (newPrimary !== null && newPrimary.trim()) {
                texts[0].textContent = newPrimary.trim();
            }
            const newSecondary = prompt('二级提示:', texts[1].textContent);
            if (newSecondary !== null && newSecondary.trim()) {
                texts[1].textContent = newSecondary.trim();
            }
        });
    });

    // 添加新提示语
    document.getElementById('addTipBtn').addEventListener('click', () => {
        const primary = prompt('请输入一级提示:');
        if (!primary || !primary.trim()) return;
        const secondary = prompt('请输入二级提示:');
        if (!secondary || !secondary.trim()) return;

        const newCard = document.createElement('div');
        newCard.className = 'tip-card';
        newCard.innerHTML = `
                <div class="tip-row">
                    <span class="tip-label">一级提示</span>
                    <span class="tip-text">${primary.trim()}</span>
                    <div class="tip-actions">
                        <button class="icon-btn" title="编辑">✎</button>
                        <button class="icon-btn danger" title="删除">🗑</button>
                    </div>
                </div>
                <div class="tip-row">
                    <span class="tip-label">二级提示</span>
                    <span class="tip-text">${secondary.trim()}</span>
                </div>
            `;
        document.getElementById('tipsList').appendChild(newCard);

        // 绑定事件
        newCard.querySelector('.icon-btn.danger').addEventListener('click', (e) => {
            if (confirm('确定删除这条提示语吗？')) {
                e.target.closest('.tip-card').remove();
            }
        });
        newCard.querySelector('.icon-btn:not(.danger)').addEventListener('click', (e) => {
            const card = e.target.closest('.tip-card');
            const texts = card.querySelectorAll('.tip-text');
            const newP = prompt('一级提示:', texts[0].textContent);
            if (newP !== null && newP.trim()) texts[0].textContent = newP.trim();
            const newS = prompt('二级提示:', texts[1].textContent);
            if (newS !== null && newS.trim()) texts[1].textContent = newS.trim();
        });
    });

    // 重置默认提示语
    document.getElementById('resetTipsBtn').addEventListener('click', () => {
        if (confirm('确定重置为默认提示语吗？')) {
            location.reload();
        }
    });

});


// 全局禁用所有元素的右键菜单
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});