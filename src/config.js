


async function loadDatabase() {
    const Database = window.__TAURI__.sql;

    const db = await Database.load("sqlite:config.db");
    return db;
}

async function saveSetting(key, value) {
    const db = await loadDatabase();
    await db.execute("UPDATE settings SET value = $1 WHERE key = $2", [String(value), key]);


    // 配置数据变化，需要通知主窗口，数据变化，主窗口需要重新加载配置
    window.__TAURI__.event.emit("settings-changed");
    
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



// 滑块交互
function initSlider(thumb, fill, valueEl, min, max, unit, onDragEnd) {
    const track = thumb.parentElement;
    const minPercent = (min / max) * 100;
    let isDragging = false;
    let currentValue = min;

    const updatePosition = (percent) => {
        percent = Math.max(minPercent, Math.min(100, percent));
        thumb.style.left = percent + '%';
        fill.style.width = percent + '%';
        currentValue = Math.round(percent / 100 * max);
        valueEl.textContent = currentValue + ' ' + unit;
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




window.addEventListener("DOMContentLoaded", async () => {
    // 首次运行检测：如果是第一次启动，显示配置窗口并标记为非首次
    const settings = await querySettings();


    if (settings.first_run === '1') {
        // 显示当前配置窗口
        const currentWindow = window.__TAURI__.window.getCurrentWindow();
        await currentWindow.show();
        await currentWindow.setFocus();
        // 标记为非首次，下次不再自动展示
        await saveSetting('first_run', '0');
    }

    // 查询数据库设置，带默认兜底
    const workDuration = parseInt(settings.work_duration) || 25;
    const breakDuration = parseInt(settings.break_duration) || 5;
    const notifyBefore = settings.notify_before_break === '1';
    const noSkipMode = settings.no_skip_mode === '1';

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
        1, 120, '分钟',
        (value) => saveSetting('work_duration', value)
    );
    workSlider.updatePosition((workDuration / 120) * 100);

    // 初始化休息时长滑块 (最小1分钟, 最大60分钟)
    const breakSlider = initSlider(
        document.getElementById('breakThumb'),
        document.getElementById('breakSliderFill'),
        document.getElementById('breakDurationValue'),
        1, 60, '分钟',
        (value) => saveSetting('break_duration', value)
    );
    breakSlider.updatePosition((breakDuration / 60) * 100);

    // 初始化进入休息前提醒开关
    const notifyToggle = document.getElementById('notifyToggle');
    if (notifyBefore) {
        notifyToggle.classList.add('on');
    } else {
        notifyToggle.classList.remove('on');
    }
    notifyToggle.addEventListener('click', () => {
        notifyToggle.classList.toggle('on');
        saveSetting('notify_before_break', notifyToggle.classList.contains('on') ? '1' : '0');
    });

    // 初始化不可跳过模式开关
    const noSkipToggle = document.getElementById('noSkipToggle');
    if (noSkipMode) {
        noSkipToggle.classList.add('on');
    } else {
        noSkipToggle.classList.remove('on');
    }
    noSkipToggle.addEventListener('click', () => {
        noSkipToggle.classList.toggle('on');
        saveSetting('no_skip_mode', noSkipToggle.classList.contains('on') ? '1' : '0');
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