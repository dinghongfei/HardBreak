const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;


// 提示语列表（纯中文）,增加后,无比修改lib.rs 中计算提示语index的逻辑
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


function randomizeTips(index) {
  // 随机选择提示语
  const tip = tips[index];
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

function resetProgress() {
  const progressEl = document.querySelector('.countdown-circle-progress');
  progressEl.setAttribute('stroke-dashoffset', 0);

}


window.addEventListener("DOMContentLoaded", async () => {


  const timeEl = document.querySelector('.countdown-text-box-time');
  const progressEl = document.querySelector('.countdown-circle-progress');


  listen('app-state-update', async (event) => {
    const data = event.payload;


    if (data.phase === 'break') {
      const duration = data.duration;
      const remaining = data.remaining;
      const no_skip_mode = data.no_skip_mode;


      no_skip_mode ? updateNoKipMode(true) : updateNoKipMode(false);


      // 更新倒计时
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      timeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // 计算圆环进度: r=90, 周长=2*PI*90≈565.4867
      // offset=0 表示满环, offset=周长表示空环
      const circumference = 2 * Math.PI * 90;
      // 使用 data 属性存储总时长以便计算比例
      const progress = remaining / duration;
      const offset = circumference * (1 - progress);
      progressEl.setAttribute('stroke-dashoffset', Math.max(0, offset));


    }
  })


  // 新增：监听配置变更事件
  listen('break_start', async () => {

  });

  // 新增：监听配置变更事件
  listen('work_start', async (event) => {
    // 文案重置
    const { tips_index } = event.payload;
    randomizeTips(tips_index);

    // 重置进度条
    resetProgress();
  });


  document.querySelector("#skip-btn").addEventListener("click", () => {
    // 跳过时，清除主窗口定时器 
    invoke("hide_break_window");
  });


});


// 全局禁用所有元素的右键菜单
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  return false;
});