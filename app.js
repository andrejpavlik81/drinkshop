// Jednoduché todo (localStorage) s evidenciou zadávateľa, vyriešiteľa, timestampov a štatistikami
const STORAGE_KEY = 'simple_todos_v1';

let tasks = [];
let filter = 'all'; // all | active | done
let chartInstance = null;

const el = {
  form: document.getElementById('new-task-form'),
  input: document.getElementById('new-task-input'),
  creatorInput: document.getElementById('new-task-creator'),
  list: document.getElementById('task-list'),
  count: document.getElementById('task-count'),
  clearCompleted: document.getElementById('clear-completed'),
  filters: document.querySelectorAll('.filters button'),
  // tabs / stats
  tabTasks: document.getElementById('tab-tasks'),
  tabStats: document.getElementById('tab-stats'),
  tasksSection: document.getElementById('tasks-section'),
  statsSection: document.getElementById('stats-section'),
  statsRange: document.getElementById('stats-range'),
  refreshStats: document.getElementById('refresh-stats'),
  chartCanvas: document.getElementById('completed-chart')
};

function defaultTaskShape(t = {}) {
  return {
    id: t.id || Date.now().toString(),
    text: t.text || '',
    done: !!t.done,
    createdAt: t.createdAt || new Date().toISOString(),
    creator: t.creator || '',
    completedBy: t.completedBy || '',
    completedAt: t.completedAt || ''
  };
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    tasks = parsed.map(p => defaultTaskShape(p));
  } catch (e) {
    tasks = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch (e) {
    return iso;
  }
}

function render() {
  el.list.innerHTML = '';
  const visible = tasks.filter(t => {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  for (const t of visible) {
    const li = document.createElement('li');
    li.className = 'task-item' + (t.done ? ' done' : '');
    li.dataset.id = t.id;

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'flex-start';
    left.style.gap = '12px';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = t.done;
    checkbox.addEventListener('change', () => toggleDone(t.id, checkbox.checked));

    const content = document.createElement('div');
    content.style.flex = '1';

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = t.text || '(bez textu)';
    title.contentEditable = false;
    title.addEventListener('dblclick', () => startEdit(t.id, title));

    const meta = document.createElement('div');
    meta.className = 'meta';
    const creatorText = t.creator ? escapeHtml(t.creator) : '-';
    const createdAtText = formatDate(t.createdAt);
    let metaHtml = `Zadal: ${creatorText} <span class="sep">•</span> Zadané: ${createdAtText}`;
    if (t.done) {
      const who = t.completedBy ? escapeHtml(t.completedBy) : '-';
      const at = t.completedAt ? formatDate(t.completedAt) : '';
      metaHtml += ` <span class="sep">•</span> Vyriešil: ${who}`;
      if (at) metaHtml += ` <span class="sep">•</span> Vyriešené: ${at}`;
    }
    meta.innerHTML = metaHtml;

    content.appendChild(title);
    content.appendChild(meta);

    left.appendChild(checkbox);
    left.appendChild(content);

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Upraviť';
    editBtn.addEventListener('click', () => openEditDialog(t.id));

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Vymazať';
    delBtn.className = 'delete';
    delBtn.addEventListener('click', () => removeTask(t.id));

    actions.append(editBtn, delBtn);

    li.append(left, actions);
    el.list.appendChild(li);
  }

  el.count.textContent = `${tasks.filter(t => !t.done).length} aktívnych úloh`;

  // update chart (keeps chart in sync even if stats tab is not visible)
  updateChart();
}

function escapeHtml(s = '') {
  return s.replaceAll && typeof s.replaceAll === 'function'
    ? s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    : s;
}

function addTask(text, creator) {
  if (!text || !text.trim()) return;
  tasks.unshift(defaultTaskShape({
    id: Date.now().toString(),
    text: text.trim(),
    done: false,
    createdAt: new Date().toISOString(),
    creator: (creator || '').trim()
  }));
  save();
  render();
}

function toggleDone(id, isChecked) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  if (isChecked) {
    // ask who finished the task
    const who = prompt('Kto úlohu vyriešil? (zadaj meno)', t.completedBy || '');
    t.done = true;
    t.completedBy = who ? who.trim() : '';
    t.completedAt = new Date().toISOString();
  } else {
    // uncheck -> clear completed info (but keep createdAt)
    if (!confirm('Označiť ako neza hotové? Informácie o vyriešení sa vymažú.')) {
      // revert checkbox visually
      render();
      return;
    }
    t.done = false;
    t.completedBy = '';
    t.completedAt = '';
  }
  save();
  render();
}

function removeTask(id) {
  if (!confirm('Naozaj vymazať túto úlohu?')) return;
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
}

function openEditDialog(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const newText = prompt('Upraviť text úlohy:', t.text);
  if (newText === null) return; // canceled
  const newCreator = prompt('Kto zadal túto úlohu?', t.creator || '');
  if (newCreator === null) return; // canceled
  t.text = newText.trim() || t.text;
  t.creator = newCreator.trim();
  // ak je úloha označená ako hotová, daj možnosť upraviť aj vyriešeného a čas
  if (t.done) {
    const newCompletedBy = prompt('Kto úlohu vyriešil?', t.completedBy || '');
    if (newCompletedBy !== null) {
      t.completedBy = newCompletedBy.trim();
      if (!t.completedAt) t.completedAt = new Date().toISOString();
    }
  }
  save();
  render();
}

function startEdit(id, titleEl) {
  // podporené cez dvojklik: urob editable a uložiť na blur
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  titleEl.contentEditable = true;
  titleEl.focus();

  const onBlur = () => {
    titleEl.contentEditable = false;
    const newText = titleEl.textContent.trim();
    if (newText) {
      t.text = newText;
      save();
    } else {
      // ak používateľ vymazal text, necháme pôvodný
      titleEl.textContent = t.text;
    }
    render();
    titleEl.removeEventListener('blur', onBlur);
  };
  titleEl.addEventListener('blur', onBlur);
}

function clearCompleted() {
  if (!confirm('Naozaj odstrániť všetky hotové úlohy?')) return;
  tasks = tasks.filter(t => !t.done);
  save();
  render();
}

/* -------------------------
   Stats / Chart functions
   ------------------------- */

// aggregate completed tasks per date (yyyy-mm-dd)
function aggregateCompletedPerDay() {
  const counts = {};
  for (const t of tasks) {
    if (t.completedAt) {
      // convert to local date string YYYY-MM-DD
      const d = new Date(t.completedAt);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts; // { '2026-01-12': 3, ... }
}

// build labels and data for the chart given rangeDays (0 = all)
function buildChartSeries(rangeDays = 14) {
  const counts = aggregateCompletedPerDay();
  const keys = Object.keys(counts).sort(); // sorted dates
  if (rangeDays === 0) {
    // show all dates present in counts
    const labels = keys;
    const data = labels.map(k => counts[k] || 0);
    return { labels, data };
  }
  // create last N days labels
  const labels = [];
  const data = [];
  const today = new Date();
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    labels.push(key);
    data.push(counts[key] || 0);
  }
  return { labels, data };
}

function createOrUpdateChart(rangeDays) {
  const ctx = el.chartCanvas.getContext('2d');
  const series = buildChartSeries(rangeDays);
  // if chart exists, update
  if (chartInstance) {
    chartInstance.data.labels = series.labels;
    chartInstance.data.datasets[0].data = series.data;
    chartInstance.update();
    return;
  }
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: series.labels,
      datasets: [{
        label: 'Vyriešené úlohy',
        data: series.data,
        backgroundColor: 'rgba(43,138,239,0.85)',
        borderColor: 'rgba(43,138,239,0.95)',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 0
          }
        },
        y: {
          beginAtZero: true,
          precision: 0,
          stepSize: 1
        }
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${ctx.formattedValue}`
          }
        }
      }
    }
  });
}

function updateChart() {
  // only update if stats section exists
  if (!el.chartCanvas) return;
  const range = Number(el.statsRange.value || 14);
  createOrUpdateChart(range);
}

/* -------------------------
   Tabs and UI wiring
   ------------------------- */

function showTasksTab() {
  el.tabTasks.classList.add('active');
  el.tabStats.classList.remove('active');
  el.tasksSection.classList.remove('hidden');
  el.statsSection.classList.add('hidden');
}

function showStatsTab() {
  el.tabTasks.classList.remove('active');
  el.tabStats.classList.add('active');
  el.tasksSection.classList.add('hidden');
  el.statsSection.classList.remove('hidden');
  // ensure chart is created/updated when switching
  updateChart();
}

/* -------------------------
   Event listeners / init
   ------------------------- */

el.form.addEventListener('submit', e => {
  e.preventDefault();
  addTask(el.input.value, el.creatorInput.value);
  el.input.value = '';
  el.creatorInput.value = '';
});

el.clearCompleted.addEventListener('click', clearCompleted);

el.filters.forEach(btn => {
  btn.addEventListener('click', () => {
    el.filters.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filter = btn.dataset.filter;
    render();
  });
});

el.tabTasks.addEventListener('click', showTasksTab);
el.tabStats.addEventListener('click', showStatsTab);
el.refreshStats.addEventListener('click', updateChart);
el.statsRange.addEventListener('change', updateChart);

// init
load();
render();