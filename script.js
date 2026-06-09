/* ===== 今日收入仪表盘 - 核心逻辑 ===== */

// 安全获取 DOM 元素
function $(id) { return document.getElementById(id); }

const $currentTime   = $('currentTime');
const $currentDate   = $('currentDate');
const $statusSection = $('statusSection');
const $statusText    = $('statusText');
const $progressBar   = $('progressBar');
const $progressLabel = $('progressLabel');
const $workedTime    = $('workedTime');
const $earnedMoney   = $('earnedMoney');
const $remainingTime = $('remainingTime');
const $remainingLabel = $('remainingLabel');
const $settingsOverlay = $('settingsOverlay');
const $settingsToggle  = $('settingsToggle');
const $startTime    = $('startTime');
const $endTime      = $('endTime');
const $dailySalary  = $('dailySalary');
const $breakTime    = $('breakTime');
const $saveBtn      = $('saveSettings');
const $cancelBtn    = $('cancelSettings');

// 默认设置
var DEFAULT_SETTINGS = {
  startTime: '09:00',
  endTime: '18:00',
  dailySalary: 500,
  breakMinutes: 60,
};

// 当前设置
var settings = {};
var toastEl = null;
var updateTimer = null;

/* ===== 初始化 ===== */
function init() {
  // 重置 settings
  settings = Object.assign({}, DEFAULT_SETTINGS);
  loadSettings();
  populateForm();
  createToast();
  bindEvents();
  updateDisplay();
  // 每秒刷新
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(updateDisplay, 1000);
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
  if ($startTime)   $startTime.value   = settings.startTime;
  if ($endTime)     $endTime.value     = settings.endTime;
  if ($dailySalary) $dailySalary.value = settings.dailySalary;
  if ($breakTime)   $breakTime.value   = settings.breakMinutes;
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
  // 设置按钮
  if ($settingsToggle && $settingsOverlay) {
    $settingsToggle.addEventListener('click', function () {
      populateForm();
      $settingsOverlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    // 点击遮罩关闭
    $settingsOverlay.addEventListener('click', function (e) {
      if (e.target === $settingsOverlay) {
        closeSettings();
      }
    });
  }

  // 取消按钮
  if ($cancelBtn) {
    $cancelBtn.addEventListener('click', function () {
      closeSettings();
    });
  }

  // 保存按钮
  if ($saveBtn) {
    $saveBtn.addEventListener('click', function () {
      if (!$startTime || !$endTime || !$dailySalary || !$breakTime) return;

      var startTime    = $startTime.value;
      var endTime      = $endTime.value;
      var dailySalary  = parseFloat($dailySalary.value);
      var breakMinutes = parseInt($breakTime.value, 10);

      if (!startTime || !endTime) {
        showToast('请设置上下班时间');
        return;
      }
      if (startTime >= endTime) {
        showToast('上班时间必须早于下班时间');
        return;
      }
      if (isNaN(dailySalary) || dailySalary < 0) {
        showToast('请输入有效的日薪');
        return;
      }
      if (isNaN(breakMinutes) || breakMinutes < 0) {
        showToast('请输入有效的休息时长');
        return;
      }

      settings = {
        startTime: startTime,
        endTime: endTime,
        dailySalary: dailySalary,
        breakMinutes: breakMinutes,
      };

      saveSettings();
      updateDisplay();
      closeSettings();
      showToast('设置已保存');
    });
  }
}

function closeSettings() {
  if ($settingsOverlay) {
    $settingsOverlay.classList.remove('open');
  }
  document.body.style.overflow = '';
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
  if (totalMinutes <= 0) return '0h 0m';
  const sign = totalMinutes < 0 ? '-' : '';
  const abs = Math.abs(totalMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = Math.floor(abs % 60);
  return `${sign}${hours}h ${minutes}m`;
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
  var data;
  try {
    data = calculateState();
    if (!data) throw new Error('calculateState returned null');
  } catch (e) {
    // 计算失败时使用当前时间作为兜底
    var now = new Date();
    data = {
      now: now, state: 'idle', progress: 0, earned: 0,
      totalPaidMinutes: 0, paidElapsed: 0,
      workStart: now, workEnd: now,
    };
  }

  // 当前时间
  if ($currentTime)  $currentTime.textContent  = formatTime(data.now);
  if ($currentDate)  $currentDate.textContent  = formatDateCN(data.now);

  // 根据状态更新 UI
  updateStatusSection(data);
  updateProgress(data);
  updateStats(data);
}

function updateStatusSection(data) {
  if (!$statusSection || !$statusText) return;
  $statusSection.classList.remove('state-idle', 'state-working', 'state-done');

  switch (data.state) {
    case 'idle': {
      $statusSection.classList.add('state-idle');
      var secToStart = Math.max(0, (data.workStart - data.now) / 1000);
      $statusText.textContent = '今日尚未开始 · ' + formatCountdown(secToStart) + ' 后开始';
      break;
    }
    case 'working': {
      $statusSection.classList.add('state-working');
      $statusText.textContent = '进行中 · 收入实时累计';
      break;
    }
    case 'done': {
      $statusSection.classList.add('state-done');
      $statusText.textContent = '今日已完成';
      break;
    }
    default: {
      $statusText.textContent = '等待中...';
      break;
    }
  }
}

function updateProgress(data) {
  if (!$progressBar || !$progressLabel) return;
  var percent = Math.round(data.progress * 100);
  $progressBar.style.width = percent + '%';
  $progressLabel.textContent = percent + '%';

  if (data.state === 'done') {
    $progressBar.style.background = 'linear-gradient(90deg, #C8963E, #D4A84C)';
  } else if (data.progress > 0.8) {
    $progressBar.style.background = 'linear-gradient(90deg, #4A7066, #5C8A7E)';
  } else {
    $progressBar.style.background = 'linear-gradient(90deg, #3D5A56, #5C8A7E)';
  }
}

function updateStats(data) {
  switch (data.state) {
    case 'idle': {
      if ($workedTime)    $workedTime.textContent    = formatDuration(0);
      if ($earnedMoney)   $earnedMoney.textContent   = formatMoney(0);
      var secToStart = Math.max(0, (data.workStart - data.now) / 1000);
      if ($remainingTime) $remainingTime.textContent = formatCountdown(secToStart);
      if ($remainingLabel) $remainingLabel.textContent = '距离上班';
      break;
    }
    case 'working': {
      if ($workedTime)    $workedTime.textContent    = formatDuration(data.paidElapsed);
      if ($earnedMoney)   $earnedMoney.textContent   = formatMoney(data.earned);
      var secToEnd = Math.max(0, (data.workEnd - data.now) / 1000);
      if ($remainingTime) $remainingTime.textContent = formatCountdown(secToEnd);
      if ($remainingLabel) $remainingLabel.textContent = '剩余时间';
      break;
    }
    case 'done': {
      if ($workedTime)    $workedTime.textContent    = formatDuration(data.totalPaidMinutes);
      if ($earnedMoney)   $earnedMoney.textContent   = formatMoney(settings.dailySalary);
      if ($remainingTime) $remainingTime.textContent = '--';
      if ($remainingLabel) $remainingLabel.textContent = '已完成';
      break;
    }
    default: {
      if ($workedTime)    $workedTime.textContent    = formatDuration(0);
      if ($earnedMoney)   $earnedMoney.textContent   = formatMoney(0);
      if ($remainingTime) $remainingTime.textContent = '--';
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
