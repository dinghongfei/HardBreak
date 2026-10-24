const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

// ==================== 多语言（文案集中在 locales.js，加语言只需改该文件） ====================
const LOCALES = window.HB_LOCALES;
const FALLBACK_LOCALE = LOCALES[window.HB_FALLBACK_LANG] || LOCALES.en;

function getLocale(language) {
  return LOCALES[language] || FALLBACK_LOCALE;
}

let language_argument = 'zh-CN';
// 当前展示的提示语下标（来自 lib.rs 的随机数），语言切换时保持原下标
let currentTipsIndex = 0;


function randomizeTips(index = currentTipsIndex, language = 'zh-CN') {
  currentTipsIndex = index;
  // 随机选择提示语（tips 长度由 lib.rs 随机区间保证，回退到默认语言）
  const tip = getLocale(language).tips[index];
  document.getElementById('level-1-tip').textContent = tip.primary;
  document.getElementById('level-2-tip').textContent = tip.secondary;
}

function updateNoSkipMode(noSkipMode) {
  const lockTip = document.getElementById('lock-tip');
  const skipBtn = document.getElementById('skip-btn');

  if (noSkipMode) {
    lockTip.style.display = '';
    skipBtn.style.display = 'none';
  } else {
    lockTip.style.display = 'none';
    skipBtn.style.display = '';
  }
}

function resetProgress() {
  const progressEl = document.querySelector('.countdown-circle-progress');
  progressEl.setAttribute('stroke-dashoffset', 0);

}

// 翻页时钟：数字变化时播放翻页动画。每秒渲染都会调用，值没变就直接返回。
function setFlipDigit(digitEl, value) {
  if (digitEl.dataset.value === value) return;
  const previous = digitEl.dataset.value || '0';
  digitEl.dataset.value = value;

  const topSpan = digitEl.querySelector('.flip-top span');
  const bottomSpan = digitEl.querySelector('.flip-bottom span');

  // 上翻页：旧数字向下翻走，露出下面的新数字
  const flapTop = document.createElement('div');
  flapTop.className = 'flip-half flip-flap-top';
  flapTop.innerHTML = `<span>${previous}</span>`;

  // 下翻页：新数字从中线落下
  const flapBottom = document.createElement('div');
  flapBottom.className = 'flip-half flip-flap-bottom';
  flapBottom.innerHTML = `<span>${value}</span>`;

  // 静态上半立即换成新数字（被上翻页盖住，随翻页揭开）
  topSpan.textContent = value;

  digitEl.appendChild(flapTop);
  digitEl.appendChild(flapBottom);

  flapTop.addEventListener('animationend', () => flapTop.remove());
  flapBottom.addEventListener('animationend', () => {
    bottomSpan.textContent = value;
    flapBottom.remove();
  });
}



function languageChanged(language) {
  // 保持当前提示语下标，只换语言重新渲染
  randomizeTips(currentTipsIndex, language);

  const i18n = getLocale(language).breakMessages;

  document.querySelectorAll('[data-translate]').forEach(el => {
    const key = el.getAttribute('data-translate');
    el.textContent = i18n[key];
  });

  // 中文「跳过」原来靠空格把两个字撑开。字距只加在中文上，长单词的语言不受影响。
  document.getElementById('skip-btn').classList.toggle(
    'is-cjk',
    language === 'zh-CN' || language === 'zh-TW'
  );
}



window.addEventListener("DOMContentLoaded", async () => {

  const timeEl = document.querySelector('.countdown-text-box-time');
  const timeMinutesEl = timeEl.querySelector('.time-minutes');
  const timeSecondsEl = timeEl.querySelector('.time-seconds');
  const progressEl = document.querySelector('.countdown-circle-progress');

  // 圆环周长: r=90, 周长=2*PI*90≈565.4867
  // offset=0 表示满环, offset=周长表示空环
  const circumference = 2 * Math.PI * 90;

  // 倒计时样式：ring（圆环，默认）/ flipclock（翻页时钟）
  const ringEl = document.getElementById('countdown-ring');
  const flipclockEl = document.getElementById('countdown-flipclock');
  const flipDigits = ['flip-m1', 'flip-m2', 'flip-s1', 'flip-s2'].map(id => document.getElementById(id));
  let countdownMode = 'ring';

  function applyCountdownMode(mode) {
    const flip = mode === 'flipclock';
    ringEl.style.display = flip ? 'none' : '';
    flipclockEl.style.display = flip ? '' : 'none';
  }

  // 最近一次 break 阶段事件的状态，作为本地逐帧插值的基准
  let breakState = null; // { duration, remaining, receivedAt }
  let rafRunning = false;

  // 用 requestAnimationFrame 逐帧插值，圆环匀速消退，不再按秒抖动
  function smoothRender() {
    if (!breakState) {
      rafRunning = false;
      return;
    }
    const elapsed = (performance.now() - breakState.receivedAt) / 1000;
    const remaining = Math.max(0, breakState.remaining - elapsed);

    // 倒计时文字仍按整秒显示
    const totalSeconds = Math.ceil(remaining);
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');

    if (countdownMode === 'flipclock') {
      setFlipDigit(flipDigits[0], minutes[0]);
      setFlipDigit(flipDigits[1], minutes[1]);
      setFlipDigit(flipDigits[2], seconds[0]);
      setFlipDigit(flipDigits[3], seconds[1]);
    } else {
      timeMinutesEl.textContent = minutes;
      timeSecondsEl.textContent = seconds;
      const progress = breakState.duration > 0 ? remaining / breakState.duration : 0;
      progressEl.setAttribute('stroke-dashoffset', Math.max(0, circumference * (1 - progress)));
    }

    requestAnimationFrame(smoothRender);
  }


  // languageChanged('en');

  listen('app-state-update', async (event) => {
    const { phase, duration, remaining, no_skip_mode, current_language, countdown_mode = 'ring' } = event.payload;
    if (language_argument !== current_language) {
      language_argument = current_language;
      languageChanged(current_language);
    }

    // 倒计时样式实时切换（任何阶段都跟随，休息开始时就是正确的样式）
    if (countdownMode !== countdown_mode) {
      countdownMode = countdown_mode;
      applyCountdownMode(countdownMode);
    }


    if (phase === 'break') {

      updateNoSkipMode(no_skip_mode);

      // 记录插值基准并启动逐帧渲染，每秒由新事件自动校准
      breakState = { duration, remaining, receivedAt: performance.now() };
      if (!rafRunning) {
        rafRunning = true;
        requestAnimationFrame(smoothRender);
      }

    } else {
      // 非休息阶段（工作/跳过）停止插值渲染
      breakState = null;
    }
  })

  // 工作阶段开始：重置提示语和进度
  listen('work_start', async (event) => {
    const { tips_index, current_language } = event.payload;

    randomizeTips(tips_index, current_language);

    // 重置进度条
    resetProgress();
  });


  const skipBtn = document.getElementById("skip-btn");
  // 休息窗不激活应用，系统不会再触发 :hover，改由鼠标进出切换样式。
  skipBtn.addEventListener("mouseenter", () => {
    skipBtn.classList.add("is-hover");
  });
  skipBtn.addEventListener("mouseleave", () => {
    skipBtn.classList.remove("is-hover");
  });
  skipBtn.addEventListener("click", () => {
    // 跳过时，清除主窗口定时器 
    invoke("hide_break_window");
  });


});


// 全局禁用所有元素的右键菜单
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
});