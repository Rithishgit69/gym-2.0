/* IndexedDB storage. This remains the offline-first local source of truth.
   Gym 2.0 uses its own database so it never touches the original Gym Routine app's data.
   Stores:
     checkins  {date, ts, month, thumb: Blob, hasFull, fullBytes}
     photos    {date, blob: Blob}            full-size check-in photos
     logs      {key: 'YYYY-MM-DD|slot|exId', date, exId, session, slot, sets: [{w, r}]}
     meta      {k, ...}                        settings, archive state, saved foods, targets
     edits     {month, template, blob, mime, ext, createdAt}   monthly gym edit videos
     meals     {date, breakfast: [item], lunch: [item], dinner: [item]}   item = {id, name, kcal, protein, qty}
     weights   {date, kg, ts}                  daily body weight */
window.DB = (() => {
  let dbp = null;

  function open() {
    if (!dbp) {
      dbp = new Promise((resolve, reject) => {
        const r = indexedDB.open('gym-2.0', 1);
        r.onupgradeneeded = () => {
          const d = r.result;
          const has = (n) => d.objectStoreNames.contains(n);
          if (!has('checkins')) d.createObjectStore('checkins', { keyPath: 'date' });
          if (!has('photos')) d.createObjectStore('photos', { keyPath: 'date' });
          if (!has('logs')) {
            const logs = d.createObjectStore('logs', { keyPath: 'key' });
            logs.createIndex('exId', 'exId');
            logs.createIndex('date', 'date');
          }
          if (!has('meta')) d.createObjectStore('meta', { keyPath: 'k' });
          if (!has('edits')) d.createObjectStore('edits', { keyPath: 'month' });
          if (!has('meals')) d.createObjectStore('meals', { keyPath: 'date' });
          if (!has('weights')) d.createObjectStore('weights', { keyPath: 'date' });
        };
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    }
    return dbp;
  }

  function done(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function store(name, mode = 'readonly') {
    const d = await open();
    return d.transaction(name, mode).objectStore(name);
  }

  // Read-only access to the original Gym Routine database (same origin on GitHub Pages),
  // used once to copy attendance over. Never creates or changes that database.
  async function readLegacy() {
    if (indexedDB.databases) {
      const list = await indexedDB.databases();
      if (!list.some((x) => x.name === 'gym-routine')) return null;
    }
    const d = await new Promise((resolve, reject) => {
      const r = indexedDB.open('gym-routine');
      r.onupgradeneeded = () => { r.transaction.abort(); };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => resolve(null);
      r.onblocked = () => reject(new Error('blocked'));
    });
    if (!d) return null;
    const read = (name) => (d.objectStoreNames.contains(name)
      ? done(d.transaction(name).objectStore(name).getAll()) : Promise.resolve([]));
    const out = { checkins: await read('checkins'), photos: await read('photos'), meta: await read('meta') };
    d.close();
    return out;
  }

  return {
    get: async (s, k) => done((await store(s)).get(k)),
    put: async (s, v) => done((await store(s, 'readwrite')).put(v)),
    del: async (s, k) => done((await store(s, 'readwrite')).delete(k)),
    all: async (s) => done((await store(s)).getAll()),
    byIndex: async (s, idx, key) => done((await store(s)).index(idx).getAll(key)),
    clear: async (s) => done((await store(s, 'readwrite')).clear()),
    async meta(k, fallback = null) {
      const v = await this.get('meta', k);
      return v ? v.v : fallback;
    },
    setMeta: async (k, v) => done((await store('meta', 'readwrite')).put({ k, v })),
    readLegacy
  };
})();
