/* ===== 今日收入仪表盘 - 核心逻辑 ===== */

// 安全获取 DOM 元素
function $(id) { return document.getElementById(id); }

var $currentTime   = $('currentTime');
var $currentDate   = $('currentDate');
var $statusSection = $('statusSection');
var $statusText    = $('statusText');
var $progressBar   = $('progressBar');
var $progressLabel = $('progressLabel');
var $workedTime    = $('workedTime');
var $earnedMoney   = $('earnedMoney');
var $remainingTime = $('remainingTime');
var $remainingLabel = $('remainingLabel');
var $hourlyRate    = $('hourlyRate');
var $secondlyRate  = $('secondlyRate');
var $settingsOverlay = $('settingsOverlay');
var $settingsToggle  = $('settingsToggle');
var $startTime    = $('startTime');
var $endTime      = $('endTime');
var $dailySalary  = $('dailySalary');
var $breakTime    = $('breakTime');
var $saveBtn      = $('saveSettings');
var $cancelBtn    = $('cancelSettings');

// 月薪相关 DOM
var $monthlySalary = $('monthlySalary');
var $dailySalaryRow = $('dailySalaryRow');
var $monthlySalaryRow = $('monthlySalaryRow');
var $salaryModeToggle = $('salaryModeToggle');
var $workModeToggle = $('workModeToggle');
var $customRestRow = $('customRestRow');
var $restDayPicker = $('restDayPicker');
var $holidayToggle = $('holidayToggle');
var $vacationDays = $('vacationDays');
var $makeupDays = $('makeupDays');
var $periodStart = $('periodStart');
var $periodEnd = $('periodEnd');
var $monthlyWorkdays = $('monthlyWorkdays');
var $monthlyIncome = $('monthlyIncome');
var $vacationDatePick = $('vacationDatePick');
var $addVacationDate = $('addVacationDate');
var $makeupDatePick = $('makeupDatePick');
var $addMakeupDate = $('addMakeupDate');
var $vacationChips = $('vacationChips');
var $makeupChips = $('makeupChips');
var $vacationSummary = $('vacationSummary');
var $makeupSummary = $('makeupSummary');
var $toggleVacationPanel = $('toggleVacationPanel');
var $toggleMakeupPanel = $('toggleMakeupPanel');
var $vacationPanel = $('vacationPanel');
var $makeupPanel = $('makeupPanel');

// 默认设置
var DEFAULT_SETTINGS = {
  salaryMode: 'daily',
  dailySalary: 500,
  monthlySalary: 11000,
  startTime: '09:00',
  endTime: '18:00',
  breakMinutes: 60,
  workMode: 'double',
  restDays: [6, 7],
  holidaysOff: true,
  vacationDays: [],
  makeupDays: [],
  periodStart: '',
  periodEnd: '',
};

// 当前设置
var settings = {};
var toastEl = null;
var updateTimer = null;

/* ===== 初始化 ===== */
function init() {
  settings = Object.assign({}, DEFAULT_SETTINGS);
  loadSettings();
  // 默认周期设为当前月
  if (!settings.periodStart) {
    var now = new Date();
    var y = now.getFullYear();
    var m = now.getMonth() + 1;
    var lastDay = new Date(y, m, 0).getDate();
    settings.periodStart = y + '-' + String(m).padStart(2, '0') + '-01';
    settings.periodEnd = y + '-' + String(m).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0');
  }
  // 确保日薪/月薪一致
  syncSalaries();
  populateForm();
  createToast();
  bindEvents();
  updateMonthlySummary();
  updateDisplay();
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(updateDisplay, 1000);
}

/* ===== 设置持久化 ===== */
function loadSettings() {
  try {
    var saved = localStorage.getItem('salary-calc-settings');
    if (saved) {
      var parsed = JSON.parse(saved);
      // 向后兼容旧设置
      var merged = {};
      var key;
      for (key in DEFAULT_SETTINGS) { merged[key] = DEFAULT_SETTINGS[key]; }
      for (key in parsed) { merged[key] = parsed[key]; }
      settings = merged;
    }
  } catch (e) {
    settings = Object.assign({}, DEFAULT_SETTINGS);
  }
}

function saveSettings() {
  try {
    localStorage.setItem('salary-calc-settings', JSON.stringify(settings));
  } catch (e) {}
}

function syncSalaries() {
  var wd = countWorkdaysInPeriod(settings.periodStart, settings.periodEnd);
  if (wd <= 0) wd = 22;
  if (settings.salaryMode === 'daily') {
    settings.monthlySalary = Math.round(settings.dailySalary * wd * 100) / 100;
  } else {
    settings.dailySalary = Math.round(settings.monthlySalary / wd * 100) / 100;
  }
}

function populateForm() {
  if ($startTime)           $startTime.value           = settings.startTime;
  if ($endTime)             $endTime.value             = settings.endTime;
  if ($dailySalary)         $dailySalary.value         = settings.dailySalary;
  if ($monthlySalary)       $monthlySalary.value       = settings.monthlySalary;
  if ($breakTime)           $breakTime.value           = settings.breakMinutes;
  if ($periodStart)        $periodStart.value        = settings.periodStart;
  if ($periodEnd)          $periodEnd.value          = settings.periodEnd;
  renderVacationSummary();
  renderMakeupSummary();
  // 薪资模式
  setActiveSeg($salaryModeToggle, settings.salaryMode);
  toggleSalaryRows();
  // 工作日模式
  setActiveSeg($workModeToggle, settings.workMode);
  if ($customRestRow) $customRestRow.classList.toggle('hidden', settings.workMode !== 'custom');
  // 休息日
  updateRestDayPicker();
  // 法定节假日
  setActiveSeg($holidayToggle, settings.holidaysOff ? 'yes' : 'no');
  updateMonthlySummary();
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
    $settingsOverlay.addEventListener('click', function (e) {
      if (e.target === $settingsOverlay) closeSettings();
    });
  }
  // 取消
  if ($cancelBtn) $cancelBtn.addEventListener('click', closeSettings);

  // 薪资模式切换
  if ($salaryModeToggle) bindSegToggle($salaryModeToggle, function (mode) {
    settings.salaryMode = mode;
    toggleSalaryRows();
    updateMonthlySummary();
  });

  // 工作日模式切换
  if ($workModeToggle) bindSegToggle($workModeToggle, function (mode) {
    settings.workMode = mode;
    if ($customRestRow) $customRestRow.classList.toggle('hidden', mode !== 'custom');
    if (mode === 'double')      settings.restDays = [6, 7];
    else if (mode === 'single') settings.restDays = [7];
    updateRestDayPicker();
    updateMonthlySummary();
  });

  // 休息日选择
  if ($restDayPicker) {
    var wdButtons = $restDayPicker.querySelectorAll('.wd-btn');
    for (var i = 0; i < wdButtons.length; i++) {
      wdButtons[i].addEventListener('click', function () {
        var day = parseInt(this.getAttribute('data-day'));
        this.classList.toggle('active');
        if (this.classList.contains('active')) {
          if (settings.restDays.indexOf(day) < 0) settings.restDays.push(day);
        } else {
          settings.restDays = settings.restDays.filter(function (d) { return d !== day; });
        }
        updateMonthlySummary();
      });
    }
  }

  // 法定节假日
  if ($holidayToggle) bindSegToggle($holidayToggle, function (mode) {
    settings.holidaysOff = (mode === 'yes');
    updateMonthlySummary();
  });

  // 周期 / 日期变化
  if ($periodStart) $periodStart.addEventListener('change', function () {
    settings.periodStart = this.value;
    updateMonthlySummary();
  });
  if ($periodEnd) $periodEnd.addEventListener('change', function () {
    settings.periodEnd = this.value;
    updateMonthlySummary();
  });
  // 休假日期管理面板切换
  if ($toggleVacationPanel && $vacationPanel) $toggleVacationPanel.addEventListener('click', function () {
    var isHidden = $vacationPanel.classList.toggle('hidden');
    this.textContent = isHidden ? '管理' : '收起';
    if (!isHidden) { renderDateChips($vacationChips, settings.vacationDays, 'vacation'); }
  });
  // 补班日期管理面板切换
  if ($toggleMakeupPanel && $makeupPanel) $toggleMakeupPanel.addEventListener('click', function () {
    var isHidden = $makeupPanel.classList.toggle('hidden');
    this.textContent = isHidden ? '管理' : '收起';
    if (!isHidden) { renderDateChips($makeupChips, settings.makeupDays, 'makeup'); }
  });
  // 添加休假日期
  if ($addVacationDate && $vacationDatePick) $addVacationDate.addEventListener('click', function () {
    var d = $vacationDatePick.value;
    if (!d) return;
    if (settings.vacationDays.indexOf(d) < 0) settings.vacationDays.push(d);
    settings.vacationDays.sort();
    renderDateChips($vacationChips, settings.vacationDays, 'vacation');
    renderVacationSummary();
    $vacationDatePick.value = '';
    updateMonthlySummary();
  });
  // 添加补班日期
  if ($addMakeupDate && $makeupDatePick) $addMakeupDate.addEventListener('click', function () {
    var d = $makeupDatePick.value;
    if (!d) return;
    if (settings.makeupDays.indexOf(d) < 0) settings.makeupDays.push(d);
    settings.makeupDays.sort();
    renderDateChips($makeupChips, settings.makeupDays, 'makeup');
    renderMakeupSummary();
    $makeupDatePick.value = '';
    updateMonthlySummary();
  });

  // 保存
  if ($saveBtn) {
    $saveBtn.addEventListener('click', function () {
      if (!$startTime || !$endTime || !$breakTime) return;
      var st = $startTime.value;
      var et = $endTime.value;
      var bm = parseInt($breakTime.value, 10);
      if (!st || !et) { showToast('请设置上下班时间'); return; }
      if (st >= et) { showToast('上班时间必须早于下班时间'); return; }
      if (isNaN(bm) || bm < 0) { showToast('请输入有效的休息时长'); return; }

      // 读取薪资
      var ds = parseFloat($dailySalary.value);
      var ms = parseFloat($monthlySalary ? $monthlySalary.value : '0');
      if (isNaN(ds) || ds < 0) { showToast('请输入有效的日薪'); return; }

      settings.startTime = st;
      settings.endTime = et;
      settings.breakMinutes = bm;
      settings.dailySalary = ds;
      if ($periodStart) settings.periodStart = $periodStart.value;
      if ($periodEnd) settings.periodEnd = $periodEnd.value;

      // 根据模式同步薪资
      syncSalaries();
      // 回填表单
      if ($dailySalary) $dailySalary.value = settings.dailySalary;
      if ($monthlySalary) $monthlySalary.value = settings.monthlySalary;

      updateMonthlySummary();
      saveSettings();
      updateDisplay();
      closeSettings();
      showToast('设置已保存');
    });
  }
}

function closeSettings() {
  if ($settingsOverlay) $settingsOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

/* ===== UI 工具函数 ===== */
function setActiveSeg(container, activeMode) {
  if (!container) return;
  var btns = container.querySelectorAll('.seg-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', btns[i].getAttribute('data-mode') === activeMode);
  }
}

function bindSegToggle(container, callback) {
  if (!container) return;
  var btns = container.querySelectorAll('.seg-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].addEventListener('click', function () {
      setActiveSeg(container, this.getAttribute('data-mode'));
      callback(this.getAttribute('data-mode'));
    });
  }
}

function toggleSalaryRows() {
  if ($dailySalaryRow) $dailySalaryRow.classList.toggle('hidden', settings.salaryMode !== 'daily');
  if ($monthlySalaryRow) $monthlySalaryRow.classList.toggle('hidden', settings.salaryMode !== 'monthly');
}

function updateRestDayPicker() {
  if (!$restDayPicker) return;
  var btns = $restDayPicker.querySelectorAll('.wd-btn');
  for (var i = 0; i < btns.length; i++) {
    var day = parseInt(btns[i].getAttribute('data-day'));
    btns[i].classList.toggle('active', settings.restDays.indexOf(day) >= 0);
  }
}

function parseDateList(str) {
  if (!str || !str.trim()) return [];
  return str.split(/[,，\s]+/).filter(function (s) { return s.trim(); });
}

/* ===== 月度工作日计算 ===== */
// 中国法定节假日（2025-2026 主要假期）
var CN_HOLIDAYS_2025 = [
  '2025-01-01','2025-01-28','2025-01-29','2025-01-30','2025-01-31','2025-02-01','2025-02-02','2025-02-03',
  '2025-04-04','2025-04-05','2025-04-06',
  '2025-05-01','2025-05-02','2025-05-03','2025-05-04','2025-05-05',
  '2025-05-31','2025-06-01','2025-06-02',
  '2025-10-01','2025-10-02','2025-10-03','2025-10-04','2025-10-05','2025-10-06','2025-10-07','2025-10-08',
  '2025-10-06'
];
var CN_HOLIDAYS_2026 = [
  '2026-01-01','2026-02-17','2026-02-18','2026-02-19','2026-02-20','2026-02-21','2026-02-22','2026-02-23',
  '2026-04-05','2026-04-06',
  '2026-05-01','2026-05-02','2026-05-03','2026-05-04','2026-05-05',
  '2026-06-19','2026-06-20','2026-06-21',
  '2026-10-01','2026-10-02','2026-10-03','2026-10-04','2026-10-05','2026-10-06','2026-10-07',
  '2026-10-06'
];
var ALL_HOLIDAYS = CN_HOLIDAYS_2025.concat(CN_HOLIDAYS_2026);

function countWorkdaysInPeriod(startStr, endStr) {
  if (!startStr || !endStr) return 22;
  var start = new Date(startStr + 'T00:00:00');
  var end = new Date(endStr + 'T00:00:00');
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 22;
  var count = 0;
  var cur = new Date(start);
  while (cur <= end) {
    var y = cur.getFullYear();
    var m = String(cur.getMonth() + 1).padStart(2, '0');
    var d = String(cur.getDate()).padStart(2, '0');
    var key = y + '-' + m + '-' + d;
    var dayOfWeek = cur.getDay();
    var isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    // Check makeup first (highest priority)
    if (settings.makeupDays.indexOf(key) >= 0) { count++; cur.setDate(cur.getDate() + 1); continue; }
    // Check vacation
    if (settings.vacationDays.indexOf(key) >= 0) { cur.setDate(cur.getDate() + 1); continue; }
    // Check statutory holidays
    if (settings.holidaysOff && ALL_HOLIDAYS.indexOf(key) >= 0) { cur.setDate(cur.getDate() + 1); continue; }
    // Check weekend
    if (settings.restDays.indexOf(isoDay) >= 0) { cur.setDate(cur.getDate() + 1); continue; }
    count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function updateMonthlySummary() {
  var wd = countWorkdaysInPeriod(settings.periodStart, settings.periodEnd);
  syncSalariesQuick(wd);
  if ($monthlyWorkdays) $monthlyWorkdays.textContent = wd + ' 天';
  if ($monthlyIncome) $monthlyIncome.textContent = formatMoney(settings.monthlySalary);
}

function syncSalariesQuick(workdays) {
  if (workdays <= 0) workdays = 22;
  if (settings.salaryMode === 'daily') {
    settings.monthlySalary = Math.round(settings.dailySalary * workdays * 100) / 100;
  } else {
    settings.dailySalary = Math.round(settings.monthlySalary / workdays * 100) / 100;
  }
}

// 日期 Chip 渲染（仅面板内使用）
function renderDateChips(container, dates, type) {
  if (!container) return;
  container.innerHTML = '';
  for (var i = 0; i < dates.length; i++) {
    (function (dateVal) {
      var chip = document.createElement('span');
      chip.className = 'date-chip';
      chip.textContent = dateVal;
      var x = document.createElement('span');
      x.className = 'date-chip-remove';
      x.textContent = '×';
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        if (type === 'vacation') {
          settings.vacationDays = settings.vacationDays.filter(function (dd) { return dd !== dateVal; });
        } else {
          settings.makeupDays = settings.makeupDays.filter(function (dd) { return dd !== dateVal; });
        }
        renderDateChips(container, type === 'vacation' ? settings.vacationDays : settings.makeupDays, type);
        if (type === 'vacation') renderVacationSummary();
        else renderMakeupSummary();
        updateMonthlySummary();
      });
      chip.appendChild(x);
      container.appendChild(chip);
    })(dates[i]);
  }
}

// 休假摘要渲染
function renderVacationSummary() {
  if (!$vacationSummary) return;
  var n = settings.vacationDays.length;
  $vacationSummary.textContent = n > 0 ? '已选择 ' + n + ' 天休假' : '未设置';
}

// 补班摘要渲染
function renderMakeupSummary() {
  if (!$makeupSummary) return;
  var n = settings.makeupDays.length;
  $makeupSummary.textContent = n > 0 ? '已选择 ' + n + ' 天补班' : '未设置';
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
  var earned = progress * settings.dailySalary;
	  // 时薪 & 秒薪
	  var paidHours = totalPaidMinutes / 60;
	  var hourlyRate = paidHours > 0 ? settings.dailySalary / paidHours : 0;
	  var secondlyRate = totalPaidMinutes > 0 ? settings.dailySalary / (totalPaidMinutes * 60) : 0;

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
    hourlyRate,
    secondlyRate,
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
    var now = new Date();
    data = {
      now: now, state: 'idle', progress: 0, earned: 0,
      hourlyRate: 0, secondlyRate: 0,
      totalPaidMinutes: 0, paidElapsed: 0,
      workStart: now, workEnd: now,
    };
  }

  // Hero: 已收入
  if ($earnedMoney)   $earnedMoney.textContent   = formatMoney(data.earned);
  // Progress
  updateProgress(data);
  // Status
  updateStatusSection(data);
  // Stats grid
  updateStats(data);
  // Meta time
  if ($currentTime)   $currentTime.textContent   = formatTime(data.now);
  if ($currentDate)   $currentDate.textContent   = formatDateCN(data.now);
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
  // 已工作 & 剩余时间
  var remainingText, remainingLabelText;
  switch (data.state) {
    case 'idle': {
      if ($workedTime)    $workedTime.textContent    = formatDuration(0);
      var secToStart = Math.max(0, (data.workStart - data.now) / 1000);
      remainingText = formatCountdown(secToStart);
      remainingLabelText = '距离上班';
      break;
    }
    case 'working': {
      if ($workedTime)    $workedTime.textContent    = formatDuration(data.paidElapsed);
      var secToEnd = Math.max(0, (data.workEnd - data.now) / 1000);
      remainingText = formatCountdown(secToEnd);
      remainingLabelText = '剩余时间';
      break;
    }
    case 'done': {
      if ($workedTime)    $workedTime.textContent    = formatDuration(data.totalPaidMinutes);
      remainingText = '--';
      remainingLabelText = '已完成';
      break;
    }
    default: {
      if ($workedTime)    $workedTime.textContent    = formatDuration(0);
      remainingText = '--';
      remainingLabelText = '';
      break;
    }
  }
  if ($remainingTime)  $remainingTime.textContent  = remainingText;
  if ($remainingLabel) $remainingLabel.textContent = remainingLabelText;

  // 时薪 & 秒薪
  if ($hourlyRate)   $hourlyRate.textContent   = formatMoney(data.hourlyRate || 0) + '/h';
  if ($secondlyRate) $secondlyRate.textContent = (data.secondlyRate || 0).toFixed(4) + '/s';
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
