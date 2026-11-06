/* ===== Hz / dB — график по точкам из таблицы ===== */

const tableBody = document.getElementById('tableBody');
const addRowBtn = document.getElementById('addRow');
const buildBtn = document.getElementById('build');
const clearBtn = document.getElementById('clearAll');
const swapCheckbox = document.getElementById('swapAxes');
const errorBox = document.getElementById('error');
const chartCard = document.getElementById('chartCard');
const downloadBtn = document.getElementById('download');
const root = document.documentElement;
const name1Input = document.getElementById('name1');
const name2Input = document.getElementById('name2');
const axis1Hint = document.getElementById('axis1');
const axis2Hint = document.getElementById('axis2');
const title1 = document.getElementById('title1');
const title2 = document.getElementById('title2');

let chart = null;
let rowCounter = 0;

/* ---------- Названия колонок и оси ---------- */

const DEFAULT_NAME1 = 'Hz';
const DEFAULT_NAME2 = 'dB';

// текущие названия колонок (с фолбэком на Hz/dB, если поле пустое)
function colNames() {
  return [
    name1Input.value.trim() || DEFAULT_NAME1,
    name2Input.value.trim() || DEFAULT_NAME2
  ];
}

// подписи «(ось X)»/«(ось Y)» в шапке + подписи в автозаполнении + плейсхолдеры
// по умолчанию первая колонка -> ось X, вторая -> ось Y
function updateAxisLabels() {
  const swapped = swapCheckbox.checked;
  const n = colNames();

  axis1Hint.textContent = swapped ? '(ось Y)' : '(ось X)';
  axis2Hint.textContent = swapped ? '(ось X)' : '(ось Y)';

  // заголовок сайта повторяет названия колонок
  title1.textContent = n[0];
  title2.textContent = n[1];
  document.title = `${n[0]} / ${n[1]} — построение графика`;

  // подписи в автозаполнении
  af1Name.textContent = `${n[0]} (${swapped ? 'Y' : 'X'})`;
  af2Name.textContent = `${n[1]} (${swapped ? 'X' : 'Y'})`;

  document.querySelectorAll('.val-hz').forEach(i => { i.placeholder = n[0]; });
  document.querySelectorAll('.val-db').forEach(i => { i.placeholder = n[1]; });
}

/* ---------- Тема ---------- */

function isDark() { return root.getAttribute('data-theme') === 'dark'; }

function chartTheme() {
  const dark = isDark();
  return {
    grid: dark ? '#262930' : '#f0f1f4',
    tick: dark ? '#9aa0aa' : '#6b7078',
    title: dark ? '#e8eaee' : '#17181a',
    pointBg: dark ? '#171a20' : '#ffffff',
    fill: dark ? 'rgba(91, 140, 247, 0.12)' : 'rgba(37, 99, 235, 0.08)'
  };
}

/* ---------- Строки таблицы ---------- */

function addRow() {
  rowCounter++;
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td class="num">${rowCounter}</td>
    <td><input type="number" step="any" placeholder="${colNames()[0]}" class="val-hz"></td>
    <td><input type="number" step="any" placeholder="${colNames()[1]}" class="val-db"></td>
    <td><button class="btn btn-del" title="Удалить строку" type="button">✕</button></td>
  `;

  tr.querySelector('.btn-del').addEventListener('click', () => {
    tr.remove();
    renumber();
    if (!tableBody.rows.length) addRow();
  });

  tableBody.appendChild(tr);
}

function renumber() {
  [...tableBody.rows].forEach((row, i) => {
    row.querySelector('.num').textContent = i + 1;
  });
}

function clearTable() {
  tableBody.innerHTML = '';
  rowCounter = 0;
  addRow();
  hideError();
  chartCard.hidden = true;
  if (chart) { chart.destroy(); chart = null; }
}

/* ---------- Сбор и проверка данных ---------- */

function collectData() {
  hideError();
  const points = [];

  [...tableBody.rows].forEach((row) => {
    const hzInput = row.querySelector('.val-hz');
    const dbInput = row.querySelector('.val-db');
    hzInput.classList.remove('invalid');
    dbInput.classList.remove('invalid');

    const hzRaw = hzInput.value.trim();
    const dbRaw = dbInput.value.trim();

    // пустая строка целиком — пропускаем
    if (hzRaw === '' && dbRaw === '') return;

    const hz = Number(hzRaw);
    const db = Number(dbRaw);

    if (hzRaw === '' || dbRaw === '' || !Number.isFinite(hz) || !Number.isFinite(db)) {
      if (hzRaw === '' || !Number.isFinite(hz)) hzInput.classList.add('invalid');
      if (dbRaw === '' || !Number.isFinite(db)) dbInput.classList.add('invalid');
      return;
    }

    points.push({ hz, db });
  });

  if (document.querySelector('td input.invalid')) {
    showError('Проверьте выделенные поля: значения должны быть числами.');
    return null;
  }

  if (points.length < 2) {
    showError('Нужно минимум 2 заполненные точки, чтобы построить график.');
    return null;
  }

  return points;
}

function showError(msg) { errorBox.textContent = msg; errorBox.hidden = false; }
function hideError() { errorBox.hidden = true; }

/* ---------- Построение графика ---------- */

function buildChart() {
  const points = collectData();
  if (!points) return;

  // по умолчанию: первая колонка -> ось X, вторая -> ось Y
  const swapped = swapCheckbox.checked;
  const n = colNames();
  const pts = points
    .map(p => swapped ? { x: p.db, y: p.hz } : { x: p.hz, y: p.db })
    .sort((a, b) => a.x - b.x);

  const xLabel = swapped ? n[1] : n[0];
  const yLabel = swapped ? n[0] : n[1];

  chartCard.hidden = false;

  if (chart) chart.destroy();

  const t = chartTheme();
  Chart.defaults.color = t.tick;

  chart = new Chart(document.getElementById('chart'), {
    type: 'line',
    data: {
      datasets: [{
        label: `${yLabel} / ${xLabel}`,
        data: pts,
        borderColor: isDark() ? '#5b8cf7' : '#2563eb',
        backgroundColor: t.fill,
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: t.pointBg,
        pointBorderColor: isDark() ? '#5b8cf7' : '#2563eb',
        pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${xLabel}: ${fmt(ctx.parsed.x)}, ${yLabel}: ${fmt(ctx.parsed.y)}`
          }
        }
      },
      scales: {
        // ВАЖНО: явно числовые оси — иначе ось X «категорийная»
        // и точки теряют координаты (уезжают в 0)
        x: {
          type: 'linear',
          title: { display: true, text: xLabel, color: t.title },
          grid: { color: t.grid },
          ticks: { color: t.tick }
        },
        y: {
          type: 'linear',
          title: { display: true, text: yLabel, color: t.title },
          grid: { color: t.grid },
          ticks: { color: t.tick }
        }
      }
    }
  });

  chartCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function fmt(n) {
  return Number.isInteger(n) ? n : Number(n).toFixed(2);
}

/* ---------- Экспорт PNG ---------- */

function downloadPNG() {
  if (!chart) return;
  const a = document.createElement('a');
  a.href = chart.toBase64Image('image/png', 1);
  a.download = 'graph.png';
  a.click();
}

/* ---------- Автозаполнение ---------- */

const af1Name = document.getElementById('af1Name');
const af2Name = document.getElementById('af2Name');
const af1On = document.getElementById('af1On');
const af1Start = document.getElementById('af1Start');
const af1End = document.getElementById('af1End');
const af1Step = document.getElementById('af1Step');
const af2On = document.getElementById('af2On');
const af2Start = document.getElementById('af2Start');
const af2End = document.getElementById('af2End');
const af2Step = document.getElementById('af2Step');
const af1Rnd = document.getElementById('af1Rnd');
const af2Rnd = document.getElementById('af2Rnd');
const af1StepLabel = document.getElementById('af1StepLabel');
const af2StepLabel = document.getElementById('af2StepLabel');
const af1CountLabel = document.getElementById('af1CountLabel');
const af2CountLabel = document.getElementById('af2CountLabel');
const af1Count = document.getElementById('af1Count');
const af2Count = document.getElementById('af2Count');
const afFill = document.getElementById('afFill');
const afError = document.getElementById('afError');

const MAX_ROWS = 500;

// переключение поля «Шаг» <-> «Строк» при галочке «случайно»
function updateRandomUI() {
  af1StepLabel.classList.toggle('hidden', af1Rnd.checked);
  af1CountLabel.classList.toggle('hidden', !af1Rnd.checked);
  af2StepLabel.classList.toggle('hidden', af2Rnd.checked);
  af2CountLabel.classList.toggle('hidden', !af2Rnd.checked);
}

// читает параметры одной серии (группа полей), кидает ошибку с понятным текстом
function readSeries(colName, on, rnd, startEl, endEl, stepEl, countEl) {
  if (!on.checked) return { on: false };

  const start = Number(startEl.value);
  const end = Number(endEl.value);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error(`«${colName}»: начальное и конечное значения должны быть числами.`);
  }
  if (end < start) {
    throw new Error(`«${colName}»: конечное значение должно быть больше начального.`);
  }

  if (rnd.checked) {
    // случайный режим: шаг не учитывается
    const count = Number(countEl.value);
    if (!Number.isFinite(count) || count < 1) {
      throw new Error(`«${colName}»: количество строк должно быть числом от 1.`);
    }
    return { on: true, random: true, count: Math.floor(count), start, end };
  }

  const step = Number(stepEl.value);
  if (!Number.isFinite(step)) {
    throw new Error(`«${colName}»: шаг должен быть числом.`);
  }
  if (step <= 0) {
    throw new Error(`«${colName}»: шаг должен быть больше нуля.`);
  }

  const n = Math.floor((end - start) / step + 1e-6); // количество шагов
  return { on: true, random: false, n, start, step };
}

// случайное значение в диапазоне [start; end], округлённое до 2 знаков
function randBetween(start, end) {
  const v = start + Math.random() * (end - start);
  return Math.round(v * 100) / 100;
}

function autofill() {
  afError.hidden = true;

  try {
    const s1 = readSeries(colNames()[0], af1On, af1Rnd, af1Start, af1End, af1Step, af1Count);
    const s2 = readSeries(colNames()[1], af2On, af2Rnd, af2Start, af2End, af2Step, af2Count);

    if (!s1.on && !s2.on) {
      afError.textContent = 'Отметьте галочкой хотя бы одну колонку.';
      afError.hidden = false;
      return;
    }

    const rows = Math.max(
      s1.on ? (s1.random ? s1.count : s1.n + 1) : 0,
      s2.on ? (s2.random ? s2.count : s2.n + 1) : 0
    );
    if (rows > MAX_ROWS) {
      afError.textContent = `Слишком много строк (максимум ${MAX_ROWS}). Увеличьте шаг или уменьшите количество строк.`;
      afError.hidden = false;
      return;
    }

    tableBody.innerHTML = '';
    rowCounter = 0;

    for (let i = 0; i < rows; i++) {
      addRow();
      const tr = tableBody.lastElementChild;
      if (s1.on) {
        const v = s1.random
          ? (i < s1.count ? randBetween(s1.start, s1.end) : null)
          : (i <= s1.n ? s1.start + i * s1.step : null);
        if (v !== null) tr.querySelector('.val-hz').value = fmt(v);
      }
      if (s2.on) {
        const v = s2.random
          ? (i < s2.count ? randBetween(s2.start, s2.end) : null)
          : (i <= s2.n ? s2.start + i * s2.step : null);
        if (v !== null) tr.querySelector('.val-db').value = fmt(v);
      }
    }
  } catch (e) {
    afError.textContent = e.message;
    afError.hidden = false;
    return;
  }

  hideError();
}

// Enter в поле ввода → строим график
tableBody.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); buildChart(); }
});

// Enter в названии колонки — просто снимаем фокус
[name1Input, name2Input].forEach(inp => inp.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); inp.blur(); }
}));

afFill.addEventListener('click', autofill);
af1Rnd.addEventListener('change', updateRandomUI);
af2Rnd.addEventListener('change', updateRandomUI);

/* ---------- События ---------- */

// переключение темы: светлая <-> тёмная с сохранением выбора
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', () => {
  const next = isDark() ? 'light' : 'dark';
  root.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  if (chart) buildChart(); // перерисовать график под тему
});

addRowBtn.addEventListener('click', addRow);
buildBtn.addEventListener('click', buildChart);
clearBtn.addEventListener('click', clearTable);
downloadBtn.addEventListener('click', downloadPNG);
name1Input.addEventListener('input', updateAxisLabels);
name2Input.addEventListener('input', updateAxisLabels);
name1Input.addEventListener('change', () => { if (chart) buildChart(); });
name2Input.addEventListener('change', () => { if (chart) buildChart(); });
swapCheckbox.addEventListener('change', () => {
  updateAxisLabels();
  if (chart) buildChart();
});

// старт: обновить подписи и создать три пустые строки
updateAxisLabels();
addRow();
addRow();
addRow();
