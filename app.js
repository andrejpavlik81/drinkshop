// Jednoduché todo (localStorage)
const STORAGE_KEY = 'simple_todos_v1';

let tasks = [];
let filter = 'all'; // all | active | done

const el = {
  form: document.getElementById('new-task-form'),
  input: document.getElementById('new-task-input'),
  list: document.getElementById('task-list'),
  count: document.getElementById('task-count'),
  clearCompleted: document.getElementById('clear-completed'),
  filters: document.querySelectorAll('.filters button')
};

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    tasks = raw ? JSON.parse(raw) : [];
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

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = t.done;
    checkbox.addEventListener('change', () => toggleDone(t.id));

    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = t.text;
    title.contentEditable = false;
    title.addEventListener('dblclick', () => startEdit(t.id, title));

    const actions = document.createElement('div');
    actions.className = 'task-actions';

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Upraviť';
    saveBtn.addEventListener('click', () => startEdit(t.id, title));

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Vymazať';
    delBtn.className = 'delete';
    delBtn.addEventListener('click', () => removeTask(t.id));

    actions.append(saveBtn, delBtn);
    li.append(checkbox, title, actions);
    el.list.appendChild(li);
  }

  el.count.textContent = `${tasks.filter(t => !t.done).length} aktívnych úloh`;
}

function addTask(text) {
  if (!text || !text.trim()) return;
  tasks.unshift({
    id: Date.now().toString(),
    text: text.trim(),
    done: false,
    createdAt: new Date().toISOString()
  });
  save();
  render();
}

function toggleDone(id) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.done = !t.done;
  save();
  render();
}

function removeTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
}

function startEdit(id, titleEl) {
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  titleEl.contentEditable = true;
  titleEl.focus();

  const onBlur = () => {
    titleEl.contentEditable = false;
    t.text = titleEl.textContent.trim() || t.text;
    save();
    render();
    titleEl.removeEventListener('blur', onBlur);
  };
  titleEl.addEventListener('blur', onBlur);
}

function clearCompleted() {
  tasks = tasks.filter(t => !t.done);
  save();
  render();
}

el.form.addEventListener('submit', e => {
  e.preventDefault();
  addTask(el.input.value);
  el.input.value = '';
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