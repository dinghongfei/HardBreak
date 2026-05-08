const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;


async function loadDatabase() {
  const Database = window.__TAURI__.sql;

  const db = await Database.load("sqlite:config.db");
  return db;
}

async function querySettings() {
  const db = await loadDatabase();
  const rows = await db.select("select key, value from settings");

  // 将数组转换为对象: { work_duration: '25', break_duration: '5', ... }
  const settings = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}






// 提示语列表（纯中文）
const tips = [
  { primary: '停下来，歇一歇', secondary: '让眼睛和身体都喘口气' },
  { primary: '远眺窗外', secondary: '看看远处的绿色，放松睫状肌' },
  { primary: '闭目养神', secondary: '哪怕一分钟，也是给双眼的礼物' },
  { primary: '起身走一走', secondary: '久坐是温柔的杀手' },
  { primary: '喝杯水吧', secondary: '补充水分，清醒头脑' },
  { primary: '深呼吸三次', secondary: '吸气，屏住，呼出——压力随之散去' },
  { primary: '放下鼠标', secondary: '你的手腕也需要休息' },
  { primary: '别看屏幕了', secondary: '世界不止在显示器里' },
  { primary: '强制休息时间', secondary: '这不是打扰，是保护' },
  { primary: '放松一下', secondary: '接下来几分钟，只属于你' },
];

// 提示语列表（纯英文）
const tipsEn = [
  { primary: 'Take a break', secondary: 'Your eyes will thank you' },
  { primary: 'Step away from the screen', secondary: 'A short pause, a long gain' },
  { primary: 'Rest your eyes', secondary: 'Look somewhere 20 feet away for 20 seconds' },
  { primary: 'Stand up and stretch', secondary: 'Your spine needs it' },
  { primary: 'Hydrate yourself', secondary: 'Drink some water, refresh your focus' },
  { primary: 'Breathe deeply', secondary: 'Inhale calm, exhale stress' },
  { primary: 'Hands off the keyboard', secondary: 'Give your wrists a moment' },
  { primary: 'Time to reset', secondary: "Close this window when you're ready" },
  { primary: 'Not a punishment', secondary: "It's a health reminder" },
  { primary: 'Take it easy', secondary: "Work will wait, your well-being won't" },
];


function randomizeTips() {
  // 随机选择提示语
  const tip = tips[Math.floor(Math.random() * tips.length)];
  document.querySelector('#level-1-tip').textContent = tip.primary;
  document.querySelector('#level-2-tip').textContent = tip.secondary;
}



function updateNoKipMode(noSkipMode) {
  const lockTip = document.querySelector('#lock-tip');
  const skipBtn = document.querySelector('#skip-btn');

  if (noSkipMode) {
    lockTip.style.display = '';
    skipBtn.style.display = 'none';
  } else {
    lockTip.style.display = 'none';
    skipBtn.style.display = '';
  }
}

async function hideMainWindow() {
  if (breakCountdownTimer) clearInterval(breakCountdownTimer);
  breakCountdownTimer = null;

  await invoke("hide_main_window");

  randomizeTips();

  // 重置进度条
  const progressEl = document.querySelector('.countdown-circle-progress');
  progressEl.setAttribute('stroke-dashoffset', 0);

  // 开启 工作倒计时
}

// ----------------start-------工作倒计时---------------------------------------------------------------
// 定时器和剩余秒数
let workCountdownTimer = null;
let workRemainingSeconds = 0;
let workNotifyBefore = false; // 是否开启进入休息前提醒
let workNotified = false;     // 是否已经发送过提醒通知

function updateWorkCountdown() {
  // 进入休息前提醒：剩余10秒时发送系统通知
  if (workNotifyBefore && !workNotified && workRemainingSeconds <= 10 && workRemainingSeconds > 0) {
    workNotified = true;
    invoke('send_break_notification');
  }

  // 工作倒计时结束，显示主窗口进入休息
  if (workRemainingSeconds <= 0) {
    clearInterval(workCountdownTimer);
    workCountdownTimer = null;
    invoke('show_main_window');
    return;
  }

  workRemainingSeconds--;
}

function startWorkCountdown(durationMinutes, notifyBefore) {
  // 清除已有定时器
  if (workCountdownTimer) clearInterval(workCountdownTimer);

  workRemainingSeconds = durationMinutes * 60;
  workNotifyBefore = !!notifyBefore;
  workNotified = false;

  // 启动定时器，每秒执行一次
  workCountdownTimer = setInterval(updateWorkCountdown, 1000);
}

// ----------------end---------工作倒计时---------------------------------------------------------------



// ----------------start-------休息倒计时---------------------------------------------------------------
// 定时器和剩余秒数
let breakCountdownTimer = null;
let breakRemainingSeconds = 0;

function updateBreakCountdown() {
  const timeEl = document.querySelector('.countdown-text-box-time');
  const progressEl = document.querySelector('.countdown-circle-progress');

  // 格式化时间为 MM:SS
  const minutes = Math.floor(breakRemainingSeconds / 60);
  const seconds = breakRemainingSeconds % 60;
  timeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // 计算圆环进度: r=90, 周长=2*PI*90≈565.4867
  // offset=0 表示满环, offset=周长表示空环
  const circumference = 2 * Math.PI * 90;
  const totalSeconds = parseInt(timeEl.dataset.total) || breakRemainingSeconds;
  // 使用 data 属性存储总时长以便计算比例
  const progress = breakRemainingSeconds / totalSeconds;
  const offset = circumference * (1 - progress);
  progressEl.setAttribute('stroke-dashoffset', Math.max(0, offset));

  // 倒计时结束
  if (breakRemainingSeconds <= 0) {
    hideMainWindow();
    return;
  }

  breakRemainingSeconds--;
}

function startBreakCountdown(durationMinutes) {
  // 清除已有定时器
  if (breakCountdownTimer) clearInterval(breakCountdownTimer);

  breakRemainingSeconds = durationMinutes * 60;
  const timeEl = document.querySelector('.countdown-text-box-time');

  // 存储总时长用于进度计算
  timeEl.dataset.total = breakRemainingSeconds;

  // 立即执行一次，然后启动定时器
  updateBreakCountdown();
  breakCountdownTimer = setInterval(updateBreakCountdown, 1000);
}


// ----------------end-------休息倒计时---------------------------------------------------------------

window.addEventListener("DOMContentLoaded", async () => {

  // const settings = await querySettings();

  // // 工作时长
  // const workDuration = parseInt(settings.work_duration) || 25;
  // // 休息时长
  // const breakDuration = parseInt(settings.break_duration) || 5;

  // // 进入休息前提醒
  // const notifyBefore = settings.notify_before_break === '1';
  // // 不可跳过模式是否开启
  // const noSkipMode = settings.no_skip_mode === '1';

  // // 更新模式
  // updateNoKipMode(noSkipMode);

  // 改为 let，使其可被重新赋值
  let workDuration, breakDuration, notifyBefore, noSkipMode;

  // 封装加载配置的逻辑为函数
  async function reloadSettings() {
    const settings = await querySettings();
    workDuration = parseInt(settings.work_duration) || 25;
    breakDuration = parseInt(settings.break_duration) || 5;
    notifyBefore = settings.notify_before_break === '1';
    noSkipMode = settings.no_skip_mode === '1';

    // 更新 UI
    updateNoKipMode(noSkipMode);
  }

  // 首次加载
  await reloadSettings();



  // 启动工作倒计时
  startWorkCountdown(workDuration, notifyBefore);

  listen('hide_main_window', async () => {
    // 重新加载配置，确保使用最新值
    await reloadSettings();

    // 启动倒计时
    startWorkCountdown(workDuration, notifyBefore);

  });



  // 监听show_main_window事件
  listen('show_main_window', async () => {
    // 重新加载配置，确保使用最新值
    await reloadSettings();

    // 启动倒计时
    startBreakCountdown(breakDuration);

  });

    // 新增：监听配置变更事件
  listen('settings-changed', async () => {
    // await reloadSettings();
    // 注意：这里只更新变量和 UI，不重启正在运行的倒计时
    // 新配置将在下一个工作/休息周期生效
  });




  document.querySelector("#skip-btn").addEventListener("click", () => {
    // 跳过时，清除主窗口定时器
    hideMainWindow();
  });


});


// 全局禁用所有元素的右键菜单
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
});