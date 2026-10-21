const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;


// 提示语列表（纯中文）,增加后,无比修改lib.rs 中计算提示语index的逻辑
const tipsZHCN = [
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

const tipsZHTW = [
  { primary: '停下來，歇一歇', secondary: '讓眼睛和身體都喘口氣' },
  { primary: '遠眺窗外', secondary: '看看遠處的綠色，放鬆睫狀肌' },
  { primary: '閉目養神', secondary: '哪怕一分鐘，也是給雙眼的禮物' },
  { primary: '起身走一走', secondary: '久坐是溫柔的殺手' },
  { primary: '喝杯水吧', secondary: '補充水分，清醒頭腦' },
  { primary: '深呼吸三次', secondary: '吸氣，屏住，呼出——壓力隨之散去' },
  { primary: '放下鼠標', secondary: '你的手腕也需要休息' },
  { primary: '別看屏幕了', secondary: '世界不止在顯示器裡' },
  { primary: '強制休息時間', secondary: '這不是打擾，是保護' },
  { primary: '放鬆一下', secondary: '接下來幾分鐘，只屬於你' },
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




const i18nMessages = {
  'zh-CN': {
    'break.countdown.label': "剩余时间",
    'break.lock.tip': "不可跳过模式已开启",
    'break.skip.btn': "跳 过",
  },
  'zh-TW': {
    'break.countdown.label': "剩餘時間",
    'break.lock.tip': "不可跳過模式已開啟",
    'break.skip.btn': "跳 過",
  },
  en: {
    'break.countdown.label': "Remaining Time",
    'break.lock.tip': "No-skip mode is enabled",
    'break.skip.btn': "Skip",
  },
};


let language_argument = 'zh-CN';


function randomizeTips(index = 0, language = 'zh-CN') {
  // 随机选择提示语
  const tip = language === 'zh-CN' ? tipsZHCN[index] : language === 'zh-TW' ? tipsZHTW[index] : tipsEn[index];
  document.getElementById('level-1-tip').textContent = tip.primary;
  document.getElementById('level-2-tip').textContent = tip.secondary;
}

function updateNoKipMode(noSkipMode) {
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
  console.log(`languageChanged: ${language}`);
  randomizeTips(0, language);

  const i18n = i18nMessages[language] || i18nMessages.en;

  document.querySelectorAll('[data-translate]').forEach(el => {
    const key = el.getAttribute('data-translate');
    el.textContent = i18n[key];
  });
}



window.addEventListener("DOMContentLoaded", async () => {

  const timeEl = document.querySelector('.countdown-text-box-time');
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
      timeEl.textContent = `${minutes}:${seconds}`;
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

      no_skip_mode ? updateNoKipMode(true) : updateNoKipMode(false);

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

  // 新增：监听配置变更事件
  listen('break_start', async () => {

  });




  // 新增：监听配置变更事件
  listen('work_start', async (event) => {
    // 文案重置
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