/* ===== Hz / dB — график по точкам из таблицы ===== */

const tableBody = document.getElementById('tableBody');
const addRowBtn = document.getElementById('addRow');
const buildBtn = document.getElementById('build');
const clearBtn = document.getElementById('clearAll');
const swapCheckbox = document.getElementById('swapAxes');
const errorBox = document.getElementById('error');
const chartCard = document.getElementById('chartCard');
const downloadBtn = document.getElementById('download');

let chart = null;
let rowCounter = 0;

/* ---------- Строки таблицы ---------- */

function addRow() {
  rowCounter++;
  const tr = document.createElement('tr');

  tr.innerHTML = `
    <td class="num">${rowCounter}</td>
    <td><input type="number" step="any" placeholder="Hz" class="val-hz"></td>
    <td><input type="number" step="any" placeholder="dB" class="val-db"></td>
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

  // сортируем по оси X, чтобы линия была аккуратной
  const swapped = swapCheckbox.checked;
  // по умолчанию (как просили): Hz → Y, dB → X
  const pts = points
    .map(p => swapped ? { x: p.hz, y: p.db } : { x: p.db, y: p.hz })
    .sort((a, b) => a.x - b.x);

  const xLabel = swapped ? 'Hz' : 'dB';
  const yLabel = swapped ? 'dB' : 'Hz';

  chartCard.hidden = false;

  if (chart) chart.destroy();

  chart = new Chart(document.getElementById('chart'), {
    type: 'line',
    data: {
      datasets: [{
        label: `${yLabel} / ${xLabel}`,
        data: pts,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        fill: true,
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#2563eb',
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
          title: { display: true, text: xLabel },
          grid: { color: '#f0f1f4' }
        },
        y: {
          type: 'linear',
          title: { display: true, text: yLabel },
          grid: { color: '#f0f1f4' }
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

const afCol = document.getElementById('afCol');
const afStart = document.getElementById('afStart');
const afEnd = document.getElementById('afEnd');
const afStep = document.getElementById('afStep');
const afFill = document.getElementById('afFill');
const afError = document.getElementById('afError');

const MAX_ROWS = 500;

function autofill() {
  afError.hidden = true;

  const start = Number(afStart.value);
  const end = Number(afEnd.value);
  const step = Number(afStep.value);

  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(step)) {
    afError.textContent = 'Все три поля должны быть числами.';
    afError.hidden = false;
    return;
  }
  if (step <= 0) {
    afError.textContent = 'Шаг должен быть больше нуля.';
    afError.hidden = false;
    return;
  }
  if ((end - start) / step + 1 > MAX_ROWS) {
    afError.textContent = `Слишком много строк (максимум ${MAX_ROWS}). Увеличьте шаг.`;
    afError.hidden = false;
    return;
  }

  const col = afCol.value; // 'hz' или 'db'

  const n = Math.floor((end - start) / step + 1e-6); // количество шагов
  if (n < 0) {
    afError.textContent = 'Конечное значение должно быть больше начального.';
    afError.hidden = false;
    return;
  }
  tableBody.innerHTML = '';
  rowCounter = 0;

  for (let i = 0; i <= n; i++) {
    addRow();
    const input = tableBody.lastElementChild.querySelector(col === 'hz' ? '.val-hz' : '.val-db');
    input.value = fmt(start + i * step);
  }

  hideError();
}

afFill.addEventListener('click', autofill);

/* ---------- События ---------- */

addRowBtn.addEventListener('click', addRow);
buildBtn.addEventListener('click', buildChart);
clearBtn.addEventListener('click', clearTable);
downloadBtn.addEventListener('click', downloadPNG);
swapCheckbox.addEventListener('change', () => { if (chart) buildChart(); });

// Enter в поле ввода → строим график
tableBody.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); buildChart(); }
});

// старт: три пустые строки для примера
addRow();
addRow();
addRow();
