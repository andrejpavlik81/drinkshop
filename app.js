// Jednoduché todo (localStorage) s evidenciou zadávateľa a vyriešiteľa
const STORAGE_KEY = 'simple_todos_v1';

let tasks = [];
let filter = 'all'; // all | active | done

const el = {
  form: document.getElementById('new-task-form'),
  input: document.getElementById('new-task-input'),
  creatorInput: document.getElementById('new-task-creator'),
  list: document.getElementById('task-list'),
  count: document.getElementById('task-count'),
  clearCompleted: document.getElementById('clear-completed'),
  filters: document.querySelectorAll('.filters button')
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
    // ensure backward compatibility: add missing fields
    tasks = parsed.map(p => defaultTaskShape(p));
  } catch (e) {
    tasks = [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
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
    const createdByText = t.creator ? `Zadal: ${escapeHtml(t.creator)}` : 'Zadal: -';
    let completedText = '';
    if (t.done) {
      const who = t.completedBy ? escapeHtml(t.completedBy) : '-';
      const at = t.completedAt ? `, ${new Date(t.completedAt).toLocaleString()}` : '';
      completedText = ` <span class="sep">•</span> Vyriešil: ${who}${at}`;
    }
    meta.innerHTML = `${createdByText}${completedText}`;

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
    // uncheck -> clear completed info
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
  // ak je úloha označená ako hotová, daj možnosť upraviť aj vyriešeného
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

// init
load();
render();