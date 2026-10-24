// ============================================================================
// 七段数码管（普通脚本，无打包器，三个页面共用）：
//   src/index.html      休息窗倒计时
//   src/config.html     模式卡片迷你预览
//   preview/break.html  文案预览
// 只负责构建 SVG 与切换点亮段，样式（颜色/粗细/辉光）在各页面的 CSS 里：
//   .seg-line 未点亮段  .seg-line.lit 点亮段  .sevenseg-colon circle 冒号
// ============================================================================
(function () {
  // 单个数字的 viewBox 为 0 0 70 124。七段命名沿用惯例：
  //   --a--
  //  f     b
  //   --g--
  //  e     c
  //   --d--
  // 每段是一根圆头粗线（火柴棍）：x1, y1, x2, y2。
  // 端点内缩 + 圆头端帽，相邻段在拐角处留出均匀小缝，永远不会接触出尖角。
  const SEGMENT_LINES = {
    a: [19, 10, 51, 10],
    g: [19, 62, 51, 62],
    d: [19, 114, 51, 114],
    f: [10, 19, 10, 55],
    b: [60, 19, 60, 55],
    e: [10, 69, 10, 105],
    c: [60, 69, 60, 105],
  };

  // 数字 → 点亮的段
  const DIGIT_SEGMENTS = {
    '0': ['a', 'b', 'c', 'd', 'e', 'f'],
    '1': ['b', 'c'],
    '2': ['a', 'b', 'd', 'e', 'g'],
    '3': ['a', 'b', 'c', 'd', 'g'],
    '4': ['b', 'c', 'f', 'g'],
    '5': ['a', 'c', 'd', 'f', 'g'],
    '6': ['a', 'c', 'd', 'e', 'f', 'g'],
    '7': ['a', 'b', 'c'],
    '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    '9': ['a', 'b', 'c', 'd', 'f', 'g'],
  };

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function createDigit(value = '0') {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 70 124');
    svg.classList.add('sevenseg-digit');
    for (const [seg, [x1, y1, x2, y2]] of Object.entries(SEGMENT_LINES)) {
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', String(x1));
      line.setAttribute('y1', String(y1));
      line.setAttribute('x2', String(x2));
      line.setAttribute('y2', String(y2));
      line.classList.add('seg-line');
      line.dataset.seg = seg;
      svg.appendChild(line);
    }
    setDigit(svg, value);
    return svg;
  }

  // 值没变就直接返回，避免每秒重复操作 DOM（与翻页钟同策略）
  function setDigit(svg, value) {
    if (svg.dataset.value === value) return;
    svg.dataset.value = value;
    const lit = DIGIT_SEGMENTS[value] || DIGIT_SEGMENTS['0'];
    svg.querySelectorAll('.seg-line').forEach((line) => {
      line.classList.toggle('lit', lit.includes(line.dataset.seg));
    });
  }

  function createColon() {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 124');
    svg.classList.add('sevenseg-colon');
    for (const cy of [38, 86]) {
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', '12');
      circle.setAttribute('cy', String(cy));
      circle.setAttribute('r', '5.5');
      svg.appendChild(circle);
    }
    return svg;
  }

  window.HB_SEVENSEG = { createDigit, setDigit, createColon };
})();
