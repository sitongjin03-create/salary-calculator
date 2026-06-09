/* ===== 今日工资实时计算器 - 核心逻辑 ===== */

// DOM 元素
const $currentTime = document.getElementById('currentTime');
const $currentDate = document.getElementById('currentDate');
const $statusSection = document.getElementById('statusSection');
const $statusEmoji = document.getElementById('statusEmoji');
const $statusText = document.getElementById('statusText');
const $progressBar = document.getElementById('progressBar');
const $progressLabel = document.getElementById('progressLabel');
const $workedTime = document.getElementById('workedTime');
const $earnedMoney = document.getElementById('earnedMoney');
const $remainingTime = document.getElementById('remainingTime');
const $remainingLabel = document.getElementById('remainingLabel');
const $mainCard = document.getElementById('mainCard');
const $settingsPanel = document.getElementById('settingsPanel');
const $settingsToggle = document.getElementById('settingsToggle');

// 设置输入元素
const $startTime = document.getElementById('startTime');
const $endTime = document.getElementById('endTime');
const $dailySalary = document.getElementById('dailySalary');
const $breakTime = document.getElementById('breakTime');
const $saveBtn = document.getElementById('saveSettings');

// 默认设置
const DEFAULT_SETTINGS = {
  startTime: '09:00',
  endTime: '18:00',
  dailySalary: 500,
  breakMinutes: 60,
};

// 当前设置（运行时使用）
let settings = { ...DEFAULT_SETTINGS };

// Toast 元素
let toastEl = null;

/* ===== 初始化 ===== */
function init() {
  loadSettings();
  populateForm();
  createToast();
  bindEvents();
  updateDisplay();
  // 每秒刷新
  setInterval(updateDisplay, 1000);
}

/* ===== 设置持久化 ===== */
function loadSettings() {
  try {
    const saved = localStorage.getItem('salary-calc-settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      settings = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    settings = { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    localStorage.setItem('salary-calc-settings', JSON.stringify(settings));
  } catch (e) {
    // localStorage 不可用时静默失败
  }
}

function populateForm() {
  $startTime.value = settings.startTime;
  $endTime.value = settings.endTime;
  $dailySalary.value = settings.dailySalary;
  $breakTime.value = settings.breakMinutes;
}

/* ===== Toast ===== */
function createToast() {
  toastEl = document.createElement('div');
  toastEl.className = 'toast';
  document.body.appendChild(toastEl);
}

let toastTimer = null;
function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2000);
}

/* ===== 事件绑定 ===== */
function bindEvents() {
  // 设置面板开关
  $settingsToggle.addEventListener('click', () => {
    const isOpen = $settingsPanel.classList.toggle('open');
    $settingsToggle.classList.toggle('active', isOpen);
  });

  // 保存设置
  $saveBtn.addEventListener('click', () => {
    const startTime = $startTime.value;
    const endTime = $endTime.value;
    const dailySalary = parseFloat($dailySalary.value);
    const breakMinutes = parseInt($breakTime.value, 10);

    // 验证
    if (!startTime || !endTime) {
      showToast('⚠️ 请设置上下班时间');
      return;
    }

    if (startTime >= endTime) {
      showToast('⚠️ 上班时间必须早于下班时间');
      return;
    }

    if (isNaN(dailySalary) || dailySalary < 0) {
      showToast('⚠️ 请输入有效的日薪');
      return;
    }

    if (isNaN(breakMinutes) || breakMinutes < 0) {
      showToast('⚠️ 请输入有效的休息时长');
      return;
    }

    settings = {
      startTime,
      endTime,
      dailySalary,
      breakMinutes,
    };

    saveSettings();
    updateDisplay();

    // 关闭设置面板
    $settingsPanel.classList.remove('open');
    $settingsToggle.classList.remove('active');
    showToast('✅ 设置已保存');
  });

  // 输入框变化时自动保存（实时生效）
  [$startTime, $endTime, $dailySalary, $breakTime].forEach(el => {
    el.addEventListener('change', () => {
      $saveBtn.click();
    });
  });
}

/* ===== 核心计算逻辑 ===== */
function calculateState() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 解析上下班时间
  const [startH, startM] = settings.startTime.split(':').map(Number);
  const [endH, endM] = settings.endTime.split(':').map(Number);

  const workStart = new Date(today);
  workStart.setHours(startH, startM, 0, 0);

  const workEnd = new Date(today);
  workEnd.setHours(endH, endM, 0, 0);

  // 总工作时间（分钟）
  const totalWorkMinutes = (workEnd - workStart) / 60000;

  // 计薪总分钟数 = 总工作时间 - 休息时间
  const totalPaidMinutes = Math.max(0, totalWorkMinutes - settings.breakMinutes);

  // 已过去的时间（从上班时间算起，分钟）
  const elapsedSinceStart = (now - workStart) / 60000;

  // 计薪已工作时间 = max(0, 已过去时间 - 休息时间)
  // 简化处理：将休息时间视为上班后立即用完
  const paidElapsed = Math.max(0, Math.min(elapsedSinceStart - settings.breakMinutes, totalPaidMinutes));

  // 进度百分比
  const progress = totalPaidMinutes > 0 ? Math.min(1, Math.max(0, paidElapsed / totalPaidMinutes)) : 0;

  // 已赚金额
  const earned = progress * settings.dailySalary;

  // 状态判定
  let state; // 'idle' | 'working' | 'done'
  if (now < workStart) {
    state = 'idle';
  } else if (now >= workEnd) {
    state = 'done';
  } else {
    state = 'working';
  }

  return {
    now,
    today,
    workStart,
    workEnd,
    totalWorkMinutes,
    totalPaidMinutes,
    elapsedSinceStart,
    paidElapsed,
    progress,
    earned,
    state,
  };
}

/* ===== 格式化工具 ===== */
function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatDateCN(date) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];
  return `${y}年${m}月${d}日 星期${w}`;
}

function formatDuration(totalMinutes) {
  if (totalMinutes <= 0) return '0小时0分';
  const sign = totalMinutes < 0 ? '-' : '';
  const abs = Math.abs(totalMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = Math.floor(abs % 60);
  return `${sign}${hours}小时${minutes}分`;
}

function formatMoney(amount) {
  return `¥${amount.toFixed(2)}`;
}

function formatCountdown(totalSeconds) {
  if (totalSeconds <= 0) return '--';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) {
    return `${h}小时${m}分${s}秒`;
  }
  return `${m}分${s}秒`;
}

/* ===== 更新显示 ===== */
function updateDisplay() {
  const data = calculateState();

  // 当前时间
  $currentTime.textContent = formatTime(data.now);
  $currentDate.textContent = formatDateCN(data.now);

  // 根据状态更新 UI
  updateStatusSection(data);
  updateProgress(data);
  updateStats(data);
}

function updateStatusSection(data) {
  // 移除旧的状态类
  $statusSection.classList.remove('state-idle', 'state-working', 'state-done');

  switch (data.state) {
    case 'idle': {
      $statusSection.classList.add('state-idle');
      $statusEmoji.textContent = '🌙';
      const secondsUntilStart = Math.max(0, (data.workStart - data.now) / 1000);
      $statusText.textContent = `还未开始赚钱 · ${formatCountdown(secondsUntilStart)}后开始`;
      break;
    }
    case 'working': {
      $statusSection.classList.add('state-working');
      // 根据进度选择不同的 emoji
      if (data.progress < 0.3) {
        $statusEmoji.textContent = '☕';
      } else if (data.progress < 0.6) {
        $statusEmoji.textContent = '💼';
      } else if (data.progress < 0.9) {
        $statusEmoji.textContent = '🔥';
      } else {
        $statusEmoji.textContent = '🏃';
      }
      $statusText.textContent = '打工中...加油！';
      break;
    }
    case 'done': {
      $statusSection.classList.add('state-done');
      $statusEmoji.textContent = '🎉';
      $statusText.textContent = '今日已完成！辛苦啦～';
      break;
    }
  }
}

function updateProgress(data) {
  const percent = Math.round(data.progress * 100);
  $progressBar.style.width = `${percent}%`;
  $progressLabel.textContent = `${percent}%`;

  // 进度条颜色变化
  if (data.state === 'done') {
    $progressBar.style.background = 'linear-gradient(90deg, #FFD54F, #FFB74D)';
  } else if (data.progress > 0.8) {
    $progressBar.style.background = 'linear-gradient(90deg, #81C784, #66BB6A)';
  } else {
    $progressBar.style.background = 'linear-gradient(90deg, var(--pink), var(--blue))';
  }
}

function updateStats(data) {
  switch (data.state) {
    case 'idle': {
      $workedTime.textContent = '0小时0分';
      $earnedMoney.textContent = '¥0.00';
      const secondsUntilStart = Math.max(0, (data.workStart - data.now) / 1000);
      $remainingTime.textContent = formatCountdown(secondsUntilStart);
      $remainingLabel.textContent = '距离上班';
      break;
    }
    case 'working': {
      $workedTime.textContent = formatDuration(data.paidElapsed);
      $earnedMoney.textContent = formatMoney(data.earned);
      const secondsUntilEnd = Math.max(0, (data.workEnd - data.now) / 1000);
      $remainingTime.textContent = formatCountdown(secondsUntilEnd);
      $remainingLabel.textContent = '距离下班';
      break;
    }
    case 'done': {
      // 显示全天数据
      $workedTime.textContent = formatDuration(data.totalPaidMinutes);
      $earnedMoney.textContent = formatMoney(settings.dailySalary);
      $remainingTime.textContent = '--';
      $remainingLabel.textContent = '已完成';
      break;
    }
  }
}

/* ===== 注册 Service Worker ===== */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.log('✅ Service Worker 已注册:', reg.scope);
      })
      .catch(err => {
        console.log('⚠️ Service Worker 注册失败:', err);
      });
  }
}

/* ===== 启动 ===== */
document.addEventListener('DOMContentLoaded', () => {
  init();
  registerSW();
});
