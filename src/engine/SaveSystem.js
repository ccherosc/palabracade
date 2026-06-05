const SAVE_KEY = 'palabracade_save';

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persist(data) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota exceeded — fail silently.
  }
}

export const SaveSystem = {
  getAll() {
    return load();
  },

  get(key, fallback = null) {
    return load()[key] ?? fallback;
  },

  set(key, value) {
    const data = load();
    data[key] = value;
    persist(data);
  },

  merge(key, partial) {
    const data = load();
    data[key] = { ...(data[key] ?? {}), ...partial };
    persist(data);
  },

  remove(key) {
    const data = load();
    delete data[key];
    persist(data);
  },

  clear() {
    localStorage.removeItem(SAVE_KEY);
  },
};
