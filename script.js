/* ===== Hz / dB — график по точкам из таблицы ===== */

const tableBody = document.getElementById('tableBody');
const addRowBtn = document.getElementById('addRow');
const clearCol2Btn = document.getElementById('clearCol2');
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

  document.querySelectorAll('.val-hz').forEach(i => { i.placeholder = n[0]; });
  document.querySelectorAll('.val-db').forEach(i => { i.placeholder = n[1]; });

  clearCol2Btn.textContent = `Очистить ${n[1]}`;
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
const af1Start = document.getElementById('af1Start');
const af1End = document.getElementById('af1End');
const af1Step = document.getElementById('af1Step');
const afFill = document.getElementById('afFill');
const afError = document.getElementById('afError');

const MAX_ROWS = 500;

function autofill() {
  afError.hidden = true;

  const start = Number(af1Start.value);
  const end = Number(af1End.value);
  const step = Number(af1Step.value);

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

  const n = Math.floor((end - start) / step + 1e-6); // количество шагов
  if (n < 0) {
    afError.textContent = 'Конечное значение должно быть больше начального.';
    afError.hidden = false;
    return;
  }

  // сохраняем значения ВТОРОЙ колонки — они не должны пропасть
  const savedOther = [...tableBody.querySelectorAll('.val-db')].map(i => i.value);

  // последняя строка, где во второй колонке есть данные
  let lastData = -1;
  savedOther.forEach((v, i) => { if (v.trim() !== '') lastData = i; });

  // оставляем: заполненные строки ИЛИ строки с данными во второй колонке,
  // плюс ровно одна пустая строка в конце
  const keep = Math.max(n + 1, lastData + 1);
  const rows = keep + 1;
  if (rows > MAX_ROWS) {
    afError.textContent = `Слишком много строк (максимум ${MAX_ROWS}). Увеличьте шаг.`;
    afError.hidden = false;
    return;
  }

  tableBody.innerHTML = '';
  rowCounter = 0;

  for (let i = 0; i < rows; i++) {
    addRow();
    const tr = tableBody.lastElementChild;
    if (i <= n) tr.querySelector('.val-hz').value = fmt(start + i * step);
    if (savedOther[i] !== undefined) tr.querySelector('.val-db').value = savedOther[i];
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

// очистка второй колонки с подтверждением
clearCol2Btn.addEventListener('click', () => {
  const inputs = [...tableBody.querySelectorAll('.val-db')];
  const filled = inputs.filter(i => i.value.trim() !== '');
  if (!filled.length) return; // колонка и так пуста

  if (confirm(`Удалить все значения из колонки «${colNames()[1]}»? (${filled.length} шт.)`)) {
    inputs.forEach(i => { i.value = ''; });
  }
});

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

/* ---------- Аккаунт: вход / регистрация ---------- */

const USERS_KEY = 'gc_users_v1';
const SESSION_KEY = 'gc_session_v1';
const chartsKey = (login) => `gc_charts_${login}`;
const MAX_SAVED = 50;

const btnLogin = document.getElementById('btnLogin');
const userChip = document.getElementById('userChip');
const userLoginSpan = document.getElementById('userLogin');
const btnCabinet = document.getElementById('btnCabinet');
const btnLogout = document.getElementById('btnLogout');
const saveCabBtn = document.getElementById('saveCab');

const authModal = document.getElementById('authModal');
const authForm = document.getElementById('authForm');
const authLoginInput = document.getElementById('authLogin');
const authPassInput = document.getElementById('authPass');
const authError = document.getElementById('authError');
const authSubmit = document.getElementById('authSubmit');
const authClose = document.getElementById('authClose');
const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');

const cabModal = document.getElementById('cabModal');
const cabClose = document.getElementById('cabClose');
const cabUser = document.getElementById('cabUser');
const cabList = document.getElementById('cabList');

function sha256(str) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then((buf) =>
    [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
  );
}

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; } catch (e) { return []; }
}
function setUsers(list) { localStorage.setItem(USERS_KEY, JSON.stringify(list)); }

function currentLogin() { return localStorage.getItem(SESSION_KEY) || ''; }

function getCharts(login) {
  try { return JSON.parse(localStorage.getItem(chartsKey(login))) || []; } catch (e) { return []; }
}
function setCharts(login, list) { localStorage.setItem(chartsKey(login), JSON.stringify(list)); }

function updateAuthUI() {
  const login = currentLogin();
  btnLogin.hidden = !!login;
  userChip.hidden = !login;
  userLoginSpan.textContent = login;
}

let authMode = 'login';

function openAuth(mode, msg) {
  authMode = mode;
  authError.hidden = true;
  authPassInput.value = '';
  tabLogin.classList.toggle('active', mode === 'login');
  tabRegister.classList.toggle('active', mode === 'register');
  authSubmit.textContent = mode === 'login' ? 'Войти' : 'Создать аккаунт';
  if (msg) { authError.textContent = msg; authError.hidden = false; }
  authModal.hidden = false;
  setTimeout(() => authLoginInput.focus(), 50);
}

function closeModals() {
  authModal.hidden = true;
  cabModal.hidden = true;
}

function authFail(msg) {
  authError.textContent = msg;
  authError.hidden = false;
}

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.hidden = true;

  const login = authLoginInput.value.trim();
  const pass = authPassInput.value;

  if (login.length < 3 || login.length > 20) return authFail('Логин должен быть от 3 до 20 символов.');
  if (pass.length < 4) return authFail('Пароль должен быть минимум 4 символа.');

  const users = getUsers();
  const existing = users.find(u => u.login.toLowerCase() === login.toLowerCase());

  if (authMode === 'register') {
    if (existing) return authFail('Такой логин уже занят.');
    const salt = [...crypto.getRandomValues(new Uint8Array(8))]
      .map(b => b.toString(16).padStart(2, '0')).join('');
    const hash = await sha256(salt + pass);
    users.push({ login, salt, hash });
    setUsers(users);
    localStorage.setItem(SESSION_KEY, login);
  } else {
    if (!existing) return authFail('Неверный логин или пароль.');
    const hash = await sha256(existing.salt + pass);
    if (hash !== existing.hash) return authFail('Неверный логин или пароль.');
    localStorage.setItem(SESSION_KEY, existing.login);
  }

  updateAuthUI();
  closeModals();
  authForm.reset();
});

btnLogin.addEventListener('click', () => openAuth('login'));
tabLogin.addEventListener('click', () => openAuth('login'));
tabRegister.addEventListener('click', () => openAuth('register'));
authClose.addEventListener('click', closeModals);

btnLogout.addEventListener('click', () => {
  localStorage.removeItem(SESSION_KEY);
  updateAuthUI();
  closeModals();
});

// клик по фону модалки и Esc — закрыть
[authModal, cabModal].forEach(m => m.addEventListener('click', (e) => {
  if (e.target === m) closeModals();
}));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });

/* ---------- Личный кабинет: сохранение графиков ---------- */

function saveChartToCabinet() {
  const login = currentLogin();
  if (!login) { openAuth('login', 'Войдите, чтобы сохранять графики в кабинете.'); return; }

  const rows = [...tableBody.rows]
    .map(tr => ({
      a: tr.querySelector('.val-hz').value.trim(),
      b: tr.querySelector('.val-db').value.trim()
    }))
    .filter(r => r.a !== '' || r.b !== '');

  if (!rows.length) {
    saveCabBtn.textContent = 'Таблица пуста';
    setTimeout(() => { saveCabBtn.textContent = 'Сохранить в кабинет'; }, 1500);
    return;
  }

  const [c1, c2] = colNames();
  const now = new Date();
  const entry = {
    id: 'c' + now.getTime(),
    name: `${c1} / ${c2}`,
    date: now.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
    col1: c1,
    col2: c2,
    swapped: swapCheckbox.checked,
    rows
  };

  const list = getCharts(login);
  list.unshift(entry);
  if (list.length > MAX_SAVED) list.length = MAX_SAVED;
  setCharts(login, list);

  saveCabBtn.textContent = 'Сохранено ✓';
  saveCabBtn.disabled = true;
  setTimeout(() => {
    saveCabBtn.textContent = 'Сохранить в кабинет';
    saveCabBtn.disabled = false;
  }, 1500);
}

function openCabinet() {
  const login = currentLogin();
  if (!login) { openAuth('login', 'Войдите, чтобы открыть кабинет.'); return; }
  cabUser.textContent = `Аккаунт: ${login}`;
  renderCabinet();
  cabModal.hidden = false;
}

function renderCabinet() {
  const login = currentLogin();
  const list = getCharts(login);
  cabList.innerHTML = '';

  if (!list.length) {
    const p = document.createElement('p');
    p.className = 'cab-empty';
    p.textContent = 'Пока нет сохранённых графиков. Постройте график и нажмите «Сохранить в кабинет».';
    cabList.appendChild(p);
    return;
  }

  list.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'cab-item';

    const info = document.createElement('div');
    info.className = 'cab-info';
    const name = document.createElement('div');
    name.className = 'cab-name';
    name.textContent = item.name;
    const date = document.createElement('div');
    date.className = 'cab-date';
    date.textContent = `${item.date} · точек: ${item.rows.length}`;
    info.appendChild(name);
    info.appendChild(date);

    const actions = document.createElement('div');
    actions.className = 'cab-actions';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn btn-ghost btn-sm';
    loadBtn.type = 'button';
    loadBtn.textContent = 'Загрузить';
    loadBtn.addEventListener('click', () => loadChartFromCabinet(item));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn-ghost btn-sm cab-del';
    delBtn.type = 'button';
    delBtn.textContent = 'Удалить';
    delBtn.addEventListener('click', () => {
      if (!confirm(`Удалить график «${item.name}» (${item.date})?`)) return;
      const fresh = getCharts(currentLogin()).filter(c => c.id !== item.id);
      setCharts(currentLogin(), fresh);
      renderCabinet();
    });

    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);

    row.appendChild(info);
    row.appendChild(actions);
    cabList.appendChild(row);
  });
}

function loadChartFromCabinet(item) {
  name1Input.value = item.col1;
  name2Input.value = item.col2;
  swapCheckbox.checked = !!item.swapped;

  tableBody.innerHTML = '';
  rowCounter = 0;
  item.rows.forEach(r => {
    addRow();
    const tr = tableBody.lastElementChild;
    tr.querySelector('.val-hz').value = r.a;
    tr.querySelector('.val-db').value = r.b;
  });
  if (!tableBody.rows.length) addRow();

  updateAxisLabels();
  closeModals();
  buildChart();
}

btnCabinet.addEventListener('click', openCabinet);
cabClose.addEventListener('click', closeModals);
saveCabBtn.addEventListener('click', saveChartToCabinet);

// старт: если «сессия» указывает на удалённый аккаунт — сбрасываем
(function initSession() {
  const login = currentLogin();
  if (login && !getUsers().some(u => u.login === login)) {
    localStorage.removeItem(SESSION_KEY);
  }
  updateAuthUI();
})();
