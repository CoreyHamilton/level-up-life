// ---- CONFIG ----
const API = 'http://localhost:8000';

// ---- STATE ----
let state = {
  userId: null,
  username: null,
  user: null,
  logs: [],
  todayLog: null,
  ateWell: false,
  drank: false,
  realisticMode: false,
};

const QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
  { text: "The groundwork for all happiness is good health.", author: "Leigh Hunt" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "Progress, not perfection.", author: "Unknown" },
];

// ---- API HELPERS ----
async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

async function apiPut(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

// ---- SCREENS ----
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${id}`).classList.add('active');
}

// ---- LOGIN / REGISTER ----
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('form-register').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('login-error').textContent = '';
}

async function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  if (!username || !password) return showError('Please fill in all fields');

  try {
    const data = await apiPost('/users/login', { username, password });
    state.userId = data.user_id;
    state.username = data.username;
    state.user = {
      start_weight: data.start_weight,
      goal_weight: data.goal_weight,
    };
    saveSession();
    await loadApp();
  } catch (err) {
    showError(err.message);
  }
}

async function handleRegister() {
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const startWeight = parseFloat(document.getElementById('reg-start-weight').value);
  const goalWeight = parseFloat(document.getElementById('reg-goal-weight').value);

  if (!username || !password) return showError('Username and password are required');

  try {
    const data = await apiPost('/users/register', {
      username,
      password,
      start_weight: startWeight || null,
      goal_weight: goalWeight || null,
    });
    state.userId = data.id;
    state.username = data.username;
    state.user = data;
    saveSession();
    await loadApp();
  } catch (err) {
    showError(err.message);
  }
}

function handleLogout() {
  clearSession();
  state = { userId: null, username: null, user: null, logs: [], todayLog: null, ateWell: false, drank: false, realisticMode: false };
  showScreen('login');
}

function showError(msg) {
  document.getElementById('login-error').textContent = msg;
}

// ---- LOAD APP ----
async function loadApp() {
  document.getElementById('header-username').textContent = state.username;
  showScreen('app');
  await loadLogs();
  renderQuote();
  renderAll();
}

async function loadLogs() {
  try {
    state.logs = await apiGet(`/logs/${state.userId}`);
    const today = todayDate();
    state.todayLog = state.logs.find(l => l.date === today) || null;

    if (state.todayLog) {
      document.getElementById('input-steps').value = state.todayLog.steps || '';
      document.getElementById('input-weight').value = state.todayLog.weight || '';
      state.ateWell = state.todayLog.ate_well || false;
      state.drank = state.todayLog.drank_alcohol || false;
      syncToggles();
    }
  } catch (err) {
    console.error('Failed to load logs:', err);
  }
}

// ---- CHECK IN ----
function toggleItem(item) {
  if (item === 'ate-well') state.ateWell = !state.ateWell;
  if (item === 'drank') state.drank = !state.drank;
  if (item === 'realistic') {
    state.realisticMode = !state.realisticMode;
    document.getElementById('realistic-banner').style.display = state.realisticMode ? 'flex' : 'none';
  }
  syncToggles();
}

function syncToggles() {
  document.getElementById('toggle-ate-well').classList.toggle('active', state.ateWell);
  document.getElementById('toggle-drank').classList.toggle('active', state.drank);
  document.getElementById('toggle-realistic').classList.toggle('active', state.realisticMode);
}

async function handleCheckin() {
  const steps = parseInt(document.getElementById('input-steps').value) || null;
  const weight = parseFloat(document.getElementById('input-weight').value) || null;
  const today = todayDate();

  const payload = {
    date: today,
    steps,
    weight,
    ate_well: state.ateWell,
    drank_alcohol: state.drank,
  };

  const btn = document.querySelector('#screen-app .btn-primary');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    if (state.todayLog) {
      state.todayLog = await apiPut(`/logs/${state.userId}/${today}`, payload);
    } else {
      state.todayLog = await apiPost(`/logs/${state.userId}`, payload);
    }

    state.logs = await apiGet(`/logs/${state.userId}`);
    renderAll();

    btn.textContent = '✓ Saved!';
    btn.style.background = 'linear-gradient(135deg, #1a7a4a, #43AA8B)';
    setTimeout(() => {
      btn.textContent = 'Save Check-In';
      btn.style.background = '';
      btn.disabled = false;
    }, 2000);

    if (steps && steps >= 10000) showCelebration();
  } catch (err) {
    btn.textContent = 'Save Check-In';
    btn.disabled = false;
    alert('Failed to save: ' + err.message);
  }
}

// ---- RENDER ALL ----
function renderAll() {
  renderProgress();
  renderAvatar();
  renderStreaks();
  renderWeek();
}

// ---- PROGRESS ----
function renderProgress() {
  const startW = state.user?.start_weight;
  const goalW = state.user?.goal_weight;

  // Get most recent weight from logs
  const weightLogs = state.logs.filter(l => l.weight).sort((a, b) => b.date.localeCompare(a.date));
  const currentW = weightLogs[0]?.weight || startW;

  document.getElementById('stat-start').textContent = startW ? `${startW}` : '--';
  document.getElementById('stat-current').textContent = currentW ? `${currentW}` : '--';
  document.getElementById('stat-goal').textContent = goalW ? `${goalW}` : '--';

  if (startW && goalW && currentW) {
    const total = startW - goalW;
    const progress = startW - currentW;
    const pct = Math.min(100, Math.max(0, Math.round((progress / total) * 100)));
    document.getElementById('progress-bar').style.width = `${pct}%`;
    document.getElementById('progress-pct').textContent = `${pct}%`;
  }
}

// ---- AVATAR ----
function renderAvatar() {
  const startW = state.user?.start_weight;
  const goalW = state.user?.goal_weight;
  const weightLogs = state.logs.filter(l => l.weight).sort((a, b) => b.date.localeCompare(a.date));
  const currentW = weightLogs[0]?.weight || startW;

  let stage = 0;
  if (startW && goalW && currentW) {
    const total = startW - goalW;
    const progress = startW - currentW;
    const pct = progress / total;
    if (pct >= 0.8) stage = 4;
    else if (pct >= 0.6) stage = 3;
    else if (pct >= 0.35) stage = 2;
    else if (pct >= 0.15) stage = 1;
  }

  const labels = ['Day 1 You', 'Getting Started', 'Building Habits', 'Strong & Steady', 'Confident You'];
  document.getElementById('avatar-label').textContent = labels[stage];

  const configs = [
    { body: '#c8a882', belly: true, posture: 'slouch', color: '#b8906a' },
    { body: '#c8a882', belly: true, posture: 'neutral', color: '#b8906a' },
    { body: '#c8a882', belly: false, posture: 'neutral', color: '#b8906a' },
    { body: '#c8a882', belly: false, posture: 'tall', color: '#b8906a' },
    { body: '#c8a882', belly: false, posture: 'tall', color: '#b8906a' },
  ];

  const c = configs[stage];
  const slouch = c.posture === 'slouch';
  const tall = c.posture === 'tall';

  const svg = `
    <ellipse cx="50" cy="${slouch ? 30 : tall ? 24 : 27}" rx="14" ry="15" fill="${c.body}"/>
    <ellipse cx="50" cy="${slouch ? 15 : tall ? 9 : 12}" rx="14" ry="6" fill="#2a1a0e"/>
    <circle cx="44" cy="${slouch ? 28 : tall ? 22 : 25}" r="2" fill="white"/>
    <circle cx="56" cy="${slouch ? 28 : tall ? 22 : 25}" r="2" fill="white"/>
    <circle cx="44.8" cy="${slouch ? 28.8 : tall ? 22.8 : 25.8}" r="1" fill="#111"/>
    <circle cx="56.8" cy="${slouch ? 28.8 : tall ? 22.8 : 25.8}" r="1" fill="#111"/>
    <path d="${tall ? 'M44 34 Q50 40 56 34' : slouch ? 'M44 38 Q50 36 56 38' : 'M44 36 Q50 40 56 36'}"
      stroke="#2a1a0e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    ${c.belly
      ? `<ellipse cx="50" cy="${slouch ? 78 : 75}" rx="${slouch ? 22 : 19}" ry="${slouch ? 26 : 24}" fill="${c.color}"/>`
      : `<rect x="${tall ? '35' : '37'}" y="${tall ? '50' : '53'}" width="${tall ? '30' : '26'}" height="${tall ? '36' : '32'}" rx="9" fill="${c.color}"/>`
    }
    <line x1="${slouch ? 28 : 30}" y1="${slouch ? 68 : tall ? 60 : 62}"
          x2="${slouch ? 14 : tall ? 12 : 14}" y2="${slouch ? 82 : 82}"
          stroke="${c.color}" stroke-width="${c.belly ? '9' : '7'}" stroke-linecap="round"/>
    <line x1="${slouch ? 72 : 70}" y1="${slouch ? 68 : tall ? 60 : 62}"
          x2="${slouch ? 86 : 88}" y2="${slouch ? 82 : 82}"
          stroke="${c.color}" stroke-width="${c.belly ? '9' : '7'}" stroke-linecap="round"/>
    <line x1="43" y1="${slouch ? 104 : tall ? 90 : 94}" x2="38" y2="${slouch ? 130 : tall ? 125 : 128}"
          stroke="${c.color}" stroke-width="9" stroke-linecap="round"/>
    <line x1="57" y1="${slouch ? 104 : tall ? 90 : 94}" x2="62" y2="${slouch ? 130 : tall ? 125 : 128}"
          stroke="${c.color}" stroke-width="9" stroke-linecap="round"/>
    ${stage === 4 ? `<path d="M35 55 L30 45 L40 48 Z" fill="${c.color}" opacity="0.6"/>
      <path d="M65 55 L70 45 L60 48 Z" fill="${c.color}" opacity="0.6"/>` : ''}
  `;

  document.getElementById('avatar-svg').innerHTML = svg;
}

// ---- STREAKS ----
function renderStreaks() {
  const sorted = [...state.logs].sort((a, b) => b.date.localeCompare(a.date));

  // Step streak
  let stepStreak = 0;
  for (const log of sorted) {
    if (log.steps && log.steps >= 10000) stepStreak++;
    else break;
  }

  // Eating streak
  let eatStreak = 0;
  for (const log of sorted) {
    if (log.ate_well) eatStreak++;
    else break;
  }

  // Alcohol-free days this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekLogs = state.logs.filter(l => new Date(l.date) >= weekAgo);
  const alcoholFreeDays = weekLogs.filter(l => !l.drank_alcohol).length;

  document.getElementById('streak-steps').textContent = stepStreak;
  document.getElementById('streak-eating').textContent = eatStreak;
  document.getElementById('streak-alcohol').textContent = alcoholFreeDays;
}

// ---- WEEKLY SUMMARY ----
function renderWeek() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }

  const maxSteps = Math.max(...state.logs.map(l => l.steps || 0), 10000);
  const grid = document.getElementById('week-grid');
  grid.innerHTML = '';

  days.forEach(day => {
    const log = state.logs.find(l => l.date === day);
    const steps = log?.steps || 0;
    const pct = Math.min(100, (steps / maxSteps) * 100);
    const goalMet = steps >= 10000;
    const dayLabel = new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);

    grid.innerHTML += `
      <div class="week-day">
        <div class="week-day-label">${dayLabel}</div>
        <div class="week-bar-bg">
          <div class="week-bar-fill ${goalMet ? 'goal-met' : ''}" style="height:${pct}%"></div>
        </div>
        <div class="week-steps">${steps >= 1000 ? Math.round(steps/1000) + 'k' : steps || '-'}</div>
        <div class="week-dots">
          <div class="week-dot ${log?.ate_well ? 'ate-well' : ''}"></div>
          <div class="week-dot ${log?.drank_alcohol ? 'alcohol' : ''}"></div>
        </div>
      </div>
    `;
  });
}

// ---- QUOTE ----
function renderQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById('quote-text').textContent = `"${q.text}"`;
  document.getElementById('quote-author').textContent = `— ${q.author}`;
}

// ---- CELEBRATION ----
function showCelebration() {
  document.getElementById('celebration').classList.add('active');
}

function closeCelebration() {
  document.getElementById('celebration').classList.remove('active');
}

// ---- UTILS ----
function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---- INIT ----
// Check if we need to load user data after login
// For now user data comes back from login/register response
// We'll extend this when we add a /users/{id} endpoint
async function initUserData() {
  if (state.userId && !state.user) {
    // Minimal user object from login response - weights need to be set at register time
    state.user = { start_weight: null, goal_weight: null };
  }
}

// ---- SESSION PERSISTENCE ----
function saveSession() {
  localStorage.setItem('lul_session', JSON.stringify({
    userId: state.userId,
    username: state.username,
    user: state.user,
  }));
}

function loadSession() {
  const saved = localStorage.getItem('lul_session');
  if (saved) {
    const session = JSON.parse(saved);
    state.userId = session.userId;
    state.username = session.username;
    state.user = session.user;
    return true;
  }
  return false;
}

function clearSession() {
  localStorage.removeItem('lul_session');
}

// ---- INIT ----
async function init() {
  if (loadSession()) {
    await loadApp();
  }
}

init();
