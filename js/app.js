/* Gym 2.0 – main app (vanilla JS, no dependencies). */
(() => {
  'use strict';

  const P = window.PROGRAM;
  const EX = window.EXERCISES;
  const BASE = window.MEDIA_BASE;
  const MEDIA_CACHE = 'g2-media-v1';
  const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner']];
  const DEFAULT_TARGETS = { kcal: 2750, protein: 120 };
  // Install card in Settings (set to false to hide it).
  const SHOW_INSTALL = true;
  const ERASE_AFTER_DAYS = 7;

  // ---------------------------------------------------------------- helpers
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const todayKey = () => keyOf(new Date());
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const fmtDay = (d) => `${DOW[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
  const fmtTime = (ts) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtDate = (ts) => { const d = new Date(ts); return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
  const fmtRest = (s) => (s >= 60 ? (s % 60 ? `${Math.floor(s / 60)}:${pad(s % 60)}` : `${s / 60} min`) : `${s} s`);
  const fmtBytes = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
  const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
  const exName = (id) => P.names[id] || (EX[id] ? titleCase(EX[id].name) : `Exercise ${id}`);
  const mediaUrl = (id, kind) => (EX[id] ? BASE + EX[id][kind] : '');
  const photoUrls = (id) => (EX[id].photos ? EX[id].photos.map((p) => window.PHOTO_BASE + p) : null);
  const videoUrl = (id) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exName(id)} proper form`)}`;
  const OFFLINE_MSG = '<div class="offline">Not saved on this phone yet.<br>Connect to the internet once, or use Settings → Save for offline.</div>';

  // Exercise media: the animation and the real start/finish photo loop, shown together
  function mediaHtml(exId) {
    const photos = photoUrls(exId);
    const anim = `<figure class="media-card"><figcaption>Animation</figcaption>
        <div class="media anim"><img src="${mediaUrl(exId, 'gif')}" alt="${esc(exName(exId))} animation" crossorigin="anonymous" data-role="media"><span class="credit">© Gym visual</span></div></figure>`;
    const photo = photos
      ? `<figure class="media-card"><figcaption>Real photos · start ↔ finish</figcaption>
        <div class="media photo" data-action="media-pause" role="img" aria-label="${esc(exName(exId))}: start and finish positions">
          <img src="${photos[0]}" alt="" crossorigin="anonymous" data-role="media">
          <img class="b" src="${photos[1]}" alt="" crossorigin="anonymous" data-role="media">
          <span class="phase-tag"><i class="s">Start</i><i class="e">Finish</i></span>
          <span class="credit">Photo: free-exercise-db</span></div></figure>`
      : '';
    return `<div class="media-pair${photos ? '' : ' single'}">${anim}${photo}</div>
      <a class="btn block video-btn" href="${videoUrl(exId)}" target="_blank" rel="noopener">${ICON.play}Watch video tutorials</a>
      ${photos ? '<div class="muted small media-hint">Tap the photos to pause the loop.</div>' : ''}`;
  }
  function bindMediaErrors(root) {
    $$('[data-role="media"]', root).forEach((img) => img.addEventListener('error', () => {
      const box = img.closest('.media');
      if (box && !$('.offline', box)) box.insertAdjacentHTML('beforeend', OFFLINE_MSG);
    }, { once: true }));
  }
  const monthKey = (k) => k.slice(0, 7);
  const monthLabel = (m) => { const [y, mo] = m.split('-').map(Number); return `${MONTHS[mo - 1]} ${y}`; };
  const monthEnd = (m) => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo, 0, 23, 59, 59, 999); };
  const round25 = (x) => Math.round(x / 2.5) * 2.5;
  const e1rm = (w, r) => (w > 0 && r > 0 ? w * (1 + r / 30) : 0);

  const ICON = {
    tick: '<svg class="mark" viewBox="0 0 24 24"><path d="M6.5 12.5l3.6 3.6L17.5 8.5"/></svg>',
    cross: '<svg class="mark" viewBox="0 0 24 24"><path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/></svg>',
    camera: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
    chevron: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    swap: '<svg viewBox="0 0 24 24"><path d="M7 7h11l-3-3M17 17H6l3 3"/></svg>',
    film: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z"/></svg>',
    moon: '<svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V3.5M8 7l4-4 4 4M7 10H5.5v10.5h13V10H17"/></svg>',
    addbox: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
    play: '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10 9v6l5-3z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>',
    scale: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8.5 9a5 5 0 0 1 7 0l-2.2 2.6"/></svg>',
    moonMark: '<svg class="mark rest-mark" viewBox="0 0 24 24"><path d="M18 14.2A6.4 6.4 0 1 1 9.8 6a5.2 5.2 0 0 0 8.2 8.2z"/></svg>'
  };

  let toastTimer;
  let toastAction = null;
  function toast(msg, ms = 2400, action = null) {
    const t = $('#toast');
    toastAction = action;
    t.innerHTML = esc(msg) + (action ? ` <button class="toast-btn" data-action="toast-act">${esc(action.label)}</button>` : '');
    t.classList.toggle('has-action', !!action);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove('show'); toastAction = null; }, action ? Math.max(ms, 5000) : ms);
  }

  function vibrate(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (_) { /* ignore */ } }

  // ---------------------------------------------------------------- state
  const state = {
    tab: 'today',
    session: null,
    settings: null,
    checkins: new Map(), // date -> record (with thumb Blob)
    thumbUrls: new Map(), // date -> object URL
    calMonth: null, // Date (1st of month)
    todayLogs: new Map(), // slot -> log record
    installPrompt: null,
    lastCheckinAnim: null,
    editJob: null,
    editTried: new Set(),
    sheetStudio: null,
    studioTpl: null,
    studioSong: null,
    autoEditMonth: null,
    restDays: new Set(), // days marked as rest by hand
    notRest: new Set(), // Sundays the user un-marked as rest
    mealDate: null, // 'YYYY-MM-DD' shown on the Macros tab
    mealEdit: null, // {meal, id} of the item being edited
    weightMonth: null // 'YYYY-MM' shown on the Weight tab
  };

  function thumbUrl(date) {
    const rec = state.checkins.get(date);
    if (!rec || !rec.thumb) return null;
    if (!state.thumbUrls.has(date)) state.thumbUrls.set(date, URL.createObjectURL(rec.thumb));
    return state.thumbUrls.get(date);
  }
  function dropThumbUrl(date) {
    const u = state.thumbUrls.get(date);
    if (u) URL.revokeObjectURL(u);
    state.thumbUrls.delete(date);
  }

  // ---------------------------------------------------------------- program logic
  // Fixed weekly split: the weekday picks the day (Mon–Sat), Sunday is rest.
  const dayKeyOf = (d = new Date()) => P.week[d.getDay()];
  const setsText = (item) => item.setsText || String(item.sets);
  const repText = (item) => `${item.reps[0]}–${item.reps[1]}${item.per ? ` ${item.per}` : ''}`;
  const itemName = (item, exId = item.id) => (exId === item.id && item.label ? item.label : exName(exId));

  function dayInfo() {
    const today = todayKey();
    const lastCheckin = [...state.checkins.keys()].filter((k) => k < today).sort().pop() || null;
    return { current: dayKeyOf(), daysSinceCheckin: lastCheckin ? activeDaysBetween(lastCheckin, today) : null };
  }
  // days between two dates, not counting rest days
  function activeDaysBetween(a, b) {
    let n = 0;
    for (let d = addDays(parseKey(a), 1); keyOf(d) <= b; d = addDays(d, 1)) if (!restKey(keyOf(d))) n++;
    return n;
  }
  // Rest day = marked by hand, or a Sunday (unless the user un-marked it)
  const sundayRest = () => !state.settings || state.settings.sundayRest !== false;
  const restKey = (k) => state.restDays.has(k) || (sundayRest() && parseKey(k).getDay() === 0 && !state.notRest.has(k));
  const isRest = (k) => restKey(k) && !state.checkins.has(k);
  async function setRest(k, on) {
    const sunday = parseKey(k).getDay() === 0;
    if (on) { state.notRest.delete(k); if (!sunday || !sundayRest()) state.restDays.add(k); } else {
      state.restDays.delete(k);
      if (sunday && sundayRest()) state.notRest.add(k);
    }
    await DB.setMeta('restDays', [...state.restDays].sort());
    await DB.setMeta('notRest', [...state.notRest].sort());
  }
  const slotOf = (sessionKey, item) => `${sessionKey}:${item.n}`;
  const setLabel = (item, i) => (item.setLabels && item.setLabels[i] ? `S${i + 1}<small>${item.setLabels[i]}</small>` : `Set ${i + 1}`);

  // ---------------------------------------------------------------- logs
  async function loadTodayLogs() {
    const logs = (await DB.byIndex('logs', 'date', todayKey())).filter((l) => l.slot);
    logs.sort((a, b) => (a.updatedAt || 0) - (b.updatedAt || 0));
    state.todayLogs = new Map();
    for (const l of logs) {
      if (!state.todayLogs.has(l.slot)) state.todayLogs.set(l.slot, []);
      state.todayLogs.get(l.slot).push(l);
    }
  }
  const slotLogs = (slot) => state.todayLogs.get(slot) || [];
  const doneSets = (l) => l.sets.filter((s) => s.r > 0).length;
  async function lastLog(exId, beforeDate = todayKey()) {
    const logs = (await DB.byIndex('logs', 'exId', exId)).filter((l) => l.date < beforeDate && l.sets.some((s) => s.r > 0));
    logs.sort((a, b) => (a.date < b.date ? 1 : -1));
    return logs[0] || null;
  }
  async function exHistory(exId) {
    const logs = (await DB.byIndex('logs', 'exId', exId)).filter((l) => l.sets.some((s) => s.r > 0));
    return logs.sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  function suggestion(item, last) {
    if (!last) return null;
    const done = last.sets.filter((s) => s.r > 0);
    if (!done.length) return null;
    const w = Math.max(...done.map((s) => +s.w || 0));
    const reps = done.map((s) => s.r).join(', ');
    const inc = P.increments[item.inc];
    const allTop = done.length >= item.sets && done.every((s) => s.r >= item.reps[1]);
    if (allTop) {
      const nw = w > 0 ? w + inc.step : w;
      return { w: nw, up: true, text: `Last time every set hit ${item.reps[1]} (${reps}). Go up: ${inc.text}${w > 0 ? `, try ${nw} kg` : ''}.` };
    }
    return { w, up: false, text: `Last time: ${w > 0 ? `${w} kg × ` : ''}${reps}. Same weight, beat the reps.` };
  }

  // ---------------------------------------------------------------- render: shell
  function setHeader(title, sub) {
    $('#title').textContent = title;
    $('#subtitle').textContent = sub || '';
    const done = state.checkins.has(todayKey());
    const btn = $('#top-checkin');
    btn.classList.toggle('done', done);
    btn.innerHTML = done ? ICON.check : ICON.camera;
    btn.setAttribute('aria-label', done ? 'Checked in today' : 'Check in');
  }

  async function render() {
    $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === state.tab));
    const v = $('#view');
    if (state.tab === 'today') await renderToday(v);
    else if (state.tab === 'calendar') await renderCalendar(v);
    else if (state.tab === 'macros') await renderMacros(v);
    else if (state.tab === 'weight') await renderWeight(v);
    else if (state.tab === 'progress') await renderProgress(v);
    else await renderSettings(v);
  }

  function go(tab, opts = {}) {
    state.tab = tab;
    window.scrollTo(0, 0);
    if (opts.anim) state.lastCheckinAnim = opts.anim;
    render();
  }

  // ---------------------------------------------------------------- render: today
  async function renderToday(v) {
    const now = new Date();
    const rt = dayInfo();
    if (!state.sessionPicked) state.session = rt.current || 'mon';
    const sKey = state.session;
    const S = P.days[sKey];
    await loadTodayLogs();

    const sunday = !rt.current;
    setHeader(fmtDay(now), sunday ? 'Sunday · rest day' : `${P.days[rt.current].name} · ${P.days[rt.current].title}`);

    const ci = state.checkins.get(todayKey());
    const isRoutine = sKey === rt.current;

    let totalSets = 0; let setsDone = 0; let doneEx = 0;
    const rows = [];
    let group = null;
    for (const item of S.items) {
      if (item.group !== group) {
        group = item.group;
        rows.push(`<div class="group-h"><span>${esc(group)}</span></div>`);
      }
      const planned = item.sets;
      const logs = slotLogs(slotOf(sKey, item));
      const logged = logs.reduce((n, l) => n + doneSets(l), 0);
      const exId = logs.length ? logs[logs.length - 1].exId : item.id;
      totalSets += planned; setsDone += Math.min(logged, planned);
      const complete = logged >= planned;
      if (complete) doneEx++;
      rows.push(`<button class="ex ${complete ? 'done' : ''} ${item.main ? 'main' : ''}" data-action="open-ex" data-slot="${item.n}" data-ex="${exId}">
        <span class="ex-num">${item.n}</span>
        <img class="thumb" src="${mediaUrl(exId, 'img')}" alt="" loading="lazy" crossorigin="anonymous">
        <span>
          ${item.main ? '<span class="tag">Main lift</span>' : ''}
          <div class="name">${esc(itemName(item, exId))}${exId !== item.id ? ' <span class="muted small">(swap)</span>' : ''}</div>
          <div class="meta">${setsText(item)} × ${repText(item)} · rest ${fmtRest(item.rest)}</div>
        </span>
        <span class="state">${complete ? `<span class="done-badge">${ICON.check}</span>` : miniRing(logged, planned)}</span>
      </button>`);
    }
    const pct = totalSets ? Math.round((setsDone / totalSets) * 100) : 0;

    const gap = !ci && !isRest(todayKey()) && rt.daysSinceCheckin !== null && rt.daysSinceCheckin >= 2
      ? `<div class="warn-line">No check-in for ${rt.daysSinceCheckin} days. Your routine is waiting.</div>` : '';
    const restToday = isRest(todayKey());
    const checkin = ci
      ? `<div class="checked-row">
          ${thumbUrl(todayKey()) ? `<button class="photo-btn" data-action="photo" data-date="${todayKey()}" aria-label="View today's photo"><img src="${thumbUrl(todayKey())}" alt=""></button>` : ''}
          <div class="grow"><b>Checked in</b><div class="muted small">${fmtTime(ci.ts)} · attendance marked</div></div>
          <button class="btn small ghost" data-action="goto" data-tab="calendar">Calendar</button></div>`
      : restToday
        ? `<div class="rest-row"><span class="rest-ic">${ICON.moon}</span>
            <div class="grow"><b>Rest day</b><div class="muted small">Doesn't count as absent. Sleep 8 h, hit your calories, walk 6–8k steps.</div></div></div>
          <div class="row" style="margin-top:10px;gap:8px"><button class="btn small ghost" data-action="rest-off" data-date="${todayKey()}">Not a rest day</button>
            <button class="btn small" style="flex:1" data-action="checkin">${ICON.camera}Train anyway</button></div>`
        : `<div class="row" style="gap:8px"><button class="btn primary" style="flex:1" data-action="checkin">${ICON.camera}Check in</button>
            <button class="btn ghost" data-action="rest-on" data-date="${todayKey()}">${ICON.moon}Rest day</button></div>`;

    const eyebrow = isRoutine ? 'Today’s workout' : sunday ? 'Sunday is rest · preview' : `Preview · today is ${P.days[rt.current].name}`;
    const hero = `<section class="hero">
        <div class="hero-top"><span class="eyebrow">${eyebrow}</span><span class="pill ok">${S.name}</span></div>
        <div class="hero-main">
          <div><h1 class="hero-title">${esc(S.title)}</h1>
            <div class="hero-meta"><span>${S.items.length} exercises</span><span>${totalSets} sets</span><span>${S.items.length > 6 ? '~70' : '~60'} min</span></div>
          </div>
          ${bigRing(pct, `${setsDone}/${totalSets} sets`)}
        </div>
        ${gap}
        ${checkin}
      </section>`;

    const tabs = P.order.map((k) => `<button class="${k === sKey ? 'active' : ''}${k === rt.current ? ' today' : ''}" data-action="session" data-s="${k}" aria-label="${P.days[k].name}: ${P.days[k].title}">
        <b>${P.days[k].short}</b><span>${P.days[k].tag.split(' · ').join('<br>')}</span></button>`).join('');

    const main = S.items.find((i) => i.main);
    const warm = await warmupHtml(S, main);
    const editCard = await editCardHtml();

    v.innerHTML = `
      ${installBannerHtml()}
      ${editCard}
      <div class="days" role="tablist" aria-label="Training days">${tabs}</div>
      ${hero}
      ${warm}
      <div class="list-head"><b>Exercises</b><span class="muted small">${doneEx}/${S.items.length} done</span></div>
      <div class="ex-list">${rows.join('')}</div>
      <p class="muted small" style="margin-top:14px">Tap an exercise for the animation, real photos, video tutorials, how-to, common mistakes and the set logger. Rest 60–90 s on isolation sets, 2–3 min on presses. Hit the top of the rep range on every set, then add weight.</p>`;
    afterTodayRender();
  }

  function bigRing(pct, label) {
    const r = 40; const c = 2 * Math.PI * r;
    return `<div class="ring" aria-label="${pct}% done"><svg viewBox="0 0 96 96"><circle class="track" cx="48" cy="48" r="${r}"/>
      <circle class="fill" cx="48" cy="48" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}"/></svg>
      <div class="label"><div><b>${pct}%</b><span>${label}</span></div></div></div>`;
  }
  function miniRing(done, total) {
    const r = 15; const c = 2 * Math.PI * r; const f = total ? Math.min(1, done / total) : 0;
    return `<span class="mini-ring"><svg viewBox="0 0 36 36"><circle class="track" cx="18" cy="18" r="${r}"/>
      <circle class="fill" cx="18" cy="18" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - f)).toFixed(1)}"/></svg><span>${done}/${total}</span></span>`;
  }

  // ---------------------------------------------------------------- monthly gym edit
  const editUrls = new Map();
  const prevMonthKey = () => { const d = new Date(); return keyOf(new Date(d.getFullYear(), d.getMonth() - 1, 1)).slice(0, 7); };
  const monthCheckins = (mo) => [...state.checkins.values()].filter((r) => r.month === mo).sort((a, b) => (a.date < b.date ? -1 : 1));
  const canEdit = (mo) => monthCheckins(mo).length >= 3;
  const defaultTemplate = (mo) => GymEdit.ORDER[(Number(mo.slice(5)) - 1) % GymEdit.ORDER.length];
  async function editUrl(mo) {
    if (editUrls.has(mo)) return editUrls.get(mo);
    const rec = await DB.get('edits', mo);
    if (!rec) return null;
    const u = URL.createObjectURL(rec.blob);
    editUrls.set(mo, u);
    return u;
  }
  function dropEditUrl(mo) { const u = editUrls.get(mo); if (u) URL.revokeObjectURL(u); editUrls.delete(mo); }

  async function collectCheckins(mo) {
    const out = [];
    for (const r of monthCheckins(mo)) {
      const full = r.hasFull ? await DB.get('photos', r.date) : null;
      const blob = full ? full.blob : r.thumb;
      if (blob) out.push({ key: r.date, blob });
    }
    return out;
  }
  function monthEditStats(mo) {
    const [y, m] = mo.split('-').map(Number);
    const today = todayKey();
    const st = monthStats(y, m - 1);
    const days = new Date(y, m, 0).getDate();
    const status = {};
    let best = 0; let run = 0;
    for (let d = 1; d <= days; d++) {
      const k = keyOf(new Date(y, m - 1, d));
      status[d] = dayStatus(k, today);
      if (state.checkins.has(k)) { run++; best = Math.max(best, run); } else if (k <= today && !restKey(k)) run = 0;
    }
    return { sessions: monthCheckins(mo).length, pct: st.due ? Math.round((st.done / st.due) * 100) : 100, best, status };
  }

  function editProgressHtml(job) {
    return `<div class="muted small js-edit-stage">${esc(job.stage || '')}</div>
      <div class="edit-live js-edit-live"></div>
      <div class="edit-progress"><span class="js-edit-bar" style="width:${Math.round((job.progress || 0) * 100)}%"></span></div>
      ${job.status === 'needs-tap' ? `<button class="btn primary block" style="margin-top:12px" data-action="edit-go">Tap to create the edit</button>` : '<div class="muted small" style="margin-top:8px">Keep the app open, it records in real time (30 s).</div>'}`;
  }
  function editResultHtml(mo, url, rec) {
    return `<video class="edit-video" src="${url}" controls playsinline loop preload="metadata"></video>
      <div class="edit-actions">
        <button class="btn primary small" data-action="edit-download" data-month="${mo}">${ICON.download}Download</button>
        ${navigator.share ? `<button class="btn small" data-action="edit-share" data-month="${mo}">Share</button>` : ''}
        <button class="btn small ghost" data-action="studio" data-month="${mo}">Other styles</button>
      </div>
      <div class="muted small" style="text-align:center;margin-top:8px">${esc(GymEdit.TEMPLATES[rec.template] ? GymEdit.TEMPLATES[rec.template].name : '')} · ${rec.music === 'song' ? 'your song' : 'original phonk beat'} · ${rec.ext.toUpperCase()} · ${fmtBytes(rec.blob.size)}</div>`;
  }

  // Home card: last month's edit (auto-created once the month is over)
  async function editCardHtml() {
    state.autoEditMonth = null;
    if (!window.GymEdit) return '';
    const job = state.editJob;
    if (job && !(state.sheetStudio === job.month)) {
      return `<section class="edit-card"><span class="eyebrow lime">Monthly gym edit</span><h3>${monthLabel(job.month)}</h3>${editProgressHtml(job)}</section>`;
    }
    const mo = prevMonthKey();
    if (await DB.meta(`editHidden:${mo}`, false)) return '';
    const rec = await DB.get('edits', mo);
    if (rec) {
      const url = await editUrl(mo);
      return `<section class="edit-card"><div class="row between"><span class="eyebrow lime">Your monthly gym edit</span>
        <button class="icon-btn" style="width:34px;height:34px" data-action="edit-hide" data-month="${mo}" aria-label="Hide">✕</button></div>
        <h3>${monthLabel(mo)}</h3>${editResultHtml(mo, url, rec)}</section>`;
    }
    if (canEdit(mo) && GymEdit.supported()) {
      state.autoEditMonth = mo;
      return `<section class="edit-card"><span class="eyebrow lime">Monthly gym edit</span><h3>${monthLabel(mo)}</h3>
        <div class="muted small">${monthCheckins(mo).length} check-in photos found. Creating your 30-second edit…</div></section>`;
    }
    return '';
  }

  function afterTodayRender() {
    placeEditCanvas();
    const mo = state.autoEditMonth;
    if (!state.editJob && mo && !state.editTried.has(mo)) {
      state.editTried.add(mo);
      startEditJob({ month: mo, template: defaultTemplate(mo), auto: true });
    }
  }
  function placeEditCanvas() {
    const job = state.editJob;
    if (!job) return;
    const slots = $$('.js-edit-live');
    const slot = slots[slots.length - 1];
    if (slot && !slot.contains(job.canvas)) slot.appendChild(job.canvas);
  }
  function updateEditProgress() {
    const job = state.editJob;
    if (!job) return;
    $$('.js-edit-bar').forEach((b) => { b.style.width = `${Math.round(job.progress * 100)}%`; });
    $$('.js-edit-stage').forEach((e) => { e.textContent = job.progress > 0 ? `${job.stage} ${Math.round(job.progress * 30)} / 30 s` : job.stage; });
  }
  function refreshEditViews() {
    if (state.sheetStudio) openEditStudio(state.sheetStudio);
    else if (state.tab === 'today' || state.tab === 'calendar') render();
    setTimeout(placeEditCanvas, 50);
  }

  async function startEditJob({ month, template, song = null, auto = false }) {
    if (state.editJob) { toast('An edit is already being made'); return; }
    if (!GymEdit.supported()) { toast('This browser cannot make videos. Update Chrome and try again.'); return; }
    const canvas = document.createElement('canvas');
    canvas.className = 'edit-canvas';
    const job = { month, template, song, auto, canvas, progress: 0, stage: 'Starting…', status: 'starting' };
    state.editJob = job;
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state !== 'running') {
      try { await Promise.race([ac.resume(), new Promise((r) => setTimeout(r, 400))]); } catch (_) { /* needs a tap */ }
    }
    if (ac.state !== 'running') {
      job.status = 'needs-tap'; job.stage = 'Ready when you are.'; job.ac = ac;
      refreshEditViews();
      return;
    }
    refreshEditViews();
    runEditJob(job, ac);
  }

  async function runEditJob(job, ac) {
    job.status = 'running';
    try {
      const checkins = await collectCheckins(job.month);
      const res = await GymEdit.render({
        template: job.template, month: job.month, checkins, stats: monthEditStats(job.month), song: job.song,
        canvas: job.canvas, audioContext: ac,
        onProgress: (p) => { job.progress = p; updateEditProgress(); },
        onStage: (st) => { job.stage = st; updateEditProgress(); placeEditCanvas(); }
      });
      await DB.put('edits', { month: job.month, template: job.template, music: job.song ? 'song' : 'beat', blob: res.blob, mime: res.mime, ext: res.ext, createdAt: Date.now() });
      await DB.setMeta(`editHidden:${job.month}`, false);
      dropEditUrl(job.month);
      state.editJob = null;
      vibrate([80, 60, 120]);
      toast(`${monthLabel(job.month)} gym edit is ready`);
    } catch (e) {
      state.editJob = null;
      if (e && e.message === 'interrupted') {
        state.editTried.delete(job.month);
        toast('Edit paused because the app was closed. It will restart when you come back.');
      } else {
        toast(`Couldn't make the edit: ${(e && e.message) || e}`);
      }
    } finally {
      ac.close().catch(() => {});
      refreshEditViews();
    }
  }

  // Edit studio (sheet): watch, choose a style or your own song, re-create
  async function openEditStudio(mo, push = true) {
    const sheet = $('#sheet');
    sheetCtx = null;
    state.sheetStudio = mo;
    state.studioTpl = state.studioTpl || defaultTemplate(mo);
    $('#sheet-title').innerHTML = `Gym edit<small>${monthLabel(mo)} · ${monthCheckins(mo).length} check-in photos</small>`;
    const job = state.editJob;
    const rec = await DB.get('edits', mo);
    let html = '';
    if (job && job.month === mo) {
      html += `<div class="edit-card">${editProgressHtml(job)}</div>`;
    } else if (rec) {
      html += `<div class="edit-card">${editResultHtml(mo, await editUrl(mo), rec)}
        <div style="text-align:center;margin-top:10px"><button class="btn small danger" data-action="edit-delete" data-month="${mo}">Delete this edit</button></div></div>`;
    }
    const enough = canEdit(mo);
    html += `<div class="section-h">${rec ? 'Make another version' : 'Make your edit'}</div>
      <div class="tpl-grid">${GymEdit.ORDER.map((k) => {
        const tpl = GymEdit.TEMPLATES[k];
        return `<button class="tpl ${state.studioTpl === k ? 'active' : ''}" data-action="tpl" data-t="${k}"><span class="bpm">${tpl.bpm} BPM · 30 S</span><b>${tpl.name}</b><p>${esc(tpl.desc)}</p></button>`;
      }).join('')}</div>
      <div class="section-h">Music</div>
      <div class="music-opts">
        <label><input type="radio" name="music" value="beat" ${state.studioSong ? '' : 'checked'}> <b>Original phonk beat</b><div class="muted small">Made by the app for this style. Copyright-free.</div></label>
        <label><input type="radio" name="music" value="song" ${state.studioSong ? 'checked' : ''}> <b>My own song</b><div class="muted small" id="song-name">${state.studioSong ? esc(state.studioSong.name) : 'Pick an audio file from your phone'}</div>
          <input type="file" accept="audio/*" id="song-file" hidden></label>
      </div>
      <button class="btn primary block" style="margin-top:16px" data-action="edit-create" data-month="${mo}" ${enough && !job ? '' : 'disabled'}>Create 30-second edit</button>
      <p class="muted small">${enough ? 'Keep the app open while it records (about 30 seconds). Everything happens on your phone.' : 'You need at least 3 check-in photos in this month.'}
      ${state.studioSong ? ' Your own song is used only on this phone; don’t post edits with songs you don’t have rights to.' : ''}</p>`;
    $('#sheet-body').innerHTML = html;
    if (sheet.hidden) {
      sheet.hidden = false;
      sheet.classList.remove('closing');
      document.body.style.overflow = 'hidden';
      document.body.classList.add('sheet-open');
      if (push) pushOverlay(closeSheet);
    }
    placeEditCanvas();
  }

  async function downloadEdit(mo) {
    const rec = await DB.get('edits', mo);
    if (!rec) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(rec.blob);
    a.download = `gym-edit-${mo}.${rec.ext}`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  async function shareEdit(mo) {
    const rec = await DB.get('edits', mo);
    if (!rec) return;
    const file = new File([rec.blob], `gym-edit-${mo}.${rec.ext}`, { type: rec.mime });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: `${monthLabel(mo)} gym edit` });
      else downloadEdit(mo);
    } catch (_) { /* share cancelled */ }
  }

  async function warmupHtml(S, main) {
    const general = P.warmups[S.warm];
    const last = await lastLog(main.id);
    const sug = suggestion(main, last);
    const work = sug && sug.w > 0 ? sug.w : null;
    const bar = main.inc === 'barbell';
    const steps = [[0.5, 8], [0.7, 5], [0.85, 3]];
    const cells = bar ? [['Bar', '× 10', '20 kg']] : [];
    for (const [pct, reps] of steps) {
      if (work) {
        const w = bar ? Math.max(20, round25(work * pct)) : round25(work * pct);
        if (w > (bar ? 20 : 0) && w < work) cells.push([`${w} kg`, `× ${reps}`, `${Math.round(pct * 100)}%`]);
      } else cells.push([`${Math.round(pct * 100)}%`, `× ${reps}`, 'of work weight']);
    }
    cells.push([work ? `${work} kg` : 'Work', 'sets', 'start']);
    const ramp = `<div class="muted small" style="margin-top:10px">Ramp-up sets for ${esc(itemName(main))}${work ? '' : ' (log one session to get exact weights)'}:</div>
      <div class="ramp">${cells.map((c) => `<div><b>${c[0]}</b><span>${c[1]} · ${c[2]}</span></div>`).join('')}</div>`;
    return `<details class="card warm"><summary>Warm-up (8–10 min) ${ICON.chevron}</summary>
      <div class="warm-body"><div class="small">${general}</div>${ramp}</div></details>`;
  }

  // ---------------------------------------------------------------- exercise sheet
  let sheetCtx = null;

  async function openExercise(exId, ctx = null, push = true) {
    sheetCtx = { exId, ctx };
    state.sheetStudio = null;
    const sheet = $('#sheet');
    const item = ctx && ctx.item;
    const isSwap = item && exId !== item.id;
    const S = ctx ? P.days[ctx.sessionKey] : null;
    const x = EX[exId];
    const notes = P.notes[exId] || { cues: [], mistakes: [] };

    $('#sheet-title').innerHTML = `${esc(item ? itemName(item, exId) : exName(exId))}<small>${
      item ? `${S.name} · ${esc(item.group)} · exercise ${item.n}${item.main ? ' · main lift' : ''}${isSwap ? ` · swap for ${esc(itemName(item))}` : ''}` : esc(titleCase(x.bodyPart))
    }</small>`;

    let presc = '';
    let logger = '';
    if (item) {
      const planned = item.sets;
      presc = `<div class="presc">
        <div><b>${setsText(item)}</b><span>Sets</span></div>
        <div><b>${item.reps[0]}–${item.reps[1]}</b><span>Reps${item.per ? ' ' + item.per.replace('per ', '/') : ''}</span></div>
        <div><b>${fmtRest(item.rest)}</b><span>Rest</span></div></div>
        ${item.note && !isSwap ? `<div class="hint">${esc(item.note)}</div>` : ''}`;
      const last = await lastLog(exId);
      const sug = suggestion(item, last);
      const slot = slotOf(ctx.sessionKey, item);
      const today = slotLogs(slot).find((l) => l.exId === exId);
      const todaySets = today ? today.sets : [];
      const n = Math.max(planned, todaySets.length);
      let rows = '';
      for (let i = 0; i < n; i++) {
        const s = todaySets[i];
        const done = s && s.r > 0;
        const w = s ? s.w : (sug ? sug.w : '');
        rows += `<div class="set ${done ? 'done' : ''}" data-i="${i}"${done ? ` data-w="${esc(s.w)}" data-r="${esc(s.r)}"` : ''}>
          <label>${setLabel(item, i)}</label>
          <div><input type="number" inputmode="decimal" step="0.5" min="0" placeholder="0" value="${w === 0 || w ? esc(w) : ''}" aria-label="Weight set ${i + 1}"><div class="unit">kg</div></div>
          <div><input type="number" inputmode="numeric" min="0" placeholder="${item.reps[0]}–${item.reps[1]}" value="${done ? esc(s.r) : ''}" aria-label="Reps set ${i + 1}"><div class="unit">reps</div></div>
          <button class="tick" data-action="set-done" aria-label="${done ? 'Uncheck' : 'Save'} set ${i + 1}">${ICON.check}</button></div>`;
      }
      logger = `<div class="section-h">Log your sets</div>
        ${sug ? `<div class="hint ${sug.up ? 'up' : ''}">${esc(sug.text)}</div>` : `<div class="hint">First time: pick a weight you can lift for ${item.reps[0]} clean reps with 1–2 reps left in the tank.</div>`}
        ${item.inc === 'bodyweight' ? '<div class="muted small" style="margin:-4px 0 8px">Bodyweight: enter 0 kg, added weight as +kg, or assistance as a minus number.</div>' : ''}
        <div class="set-head"><span></span><span>Weight</span><span>Reps</span><span>Done</span></div>
        <div class="sets" id="sets">${rows}</div>
        <div class="row between" style="margin-top:8px;align-items:center">
          <button class="btn small ghost" style="white-space:nowrap;flex:none" data-action="add-set">+ Add set</button>
          <span class="muted small" style="text-align:right">Wrong tap? Tap ✓ again to undo.</span></div>`;
    }

    const hist = (await exHistory(exId)).filter((l) => l.date < todayKey()).slice(0, 5);
    const histHtml = hist.length
      ? `<div class="hist">${hist.map((l) => `<div><span>${fmtDay(parseKey(l.date))}</span><span>${l.sets.filter((s) => s.r > 0).map((s) => `${s.w ? s.w + '×' : ''}${s.r}`).join(' · ')}</span></div>`).join('')}</div>`
      : '<div class="muted small">No sets logged yet.</div>';

    const swaps = item ? [item.id, ...item.swap].filter((id) => id !== exId) : [];
    const swapHtml = swaps.length
      ? `<div class="section-h">${isSwap ? 'Other options' : 'Machine busy? Swap to'}</div><div class="stack">${swaps.map((id) => `
          <button class="swap" data-action="swap" data-ex="${id}"><img src="${mediaUrl(id, 'img')}" alt="" loading="lazy" crossorigin="anonymous">
          <span><b>${esc(exName(id))}</b><div class="muted small">${id === item.id ? 'Original exercise' : esc(titleCase(EX[id].equipment))}</div></span>${ICON.swap}</button>`).join('')}</div>`
      : '';

    $('#sheet-body').innerHTML = `
      <div id="media-slot">${mediaHtml(exId)}</div>
      ${presc}
      ${logger}
      <div class="section-h">How to do it</div>
      <ol class="steps">${x.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      ${notes.cues.length ? `<div class="section-h">Key cues</div><ul class="cues">${notes.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      ${notes.mistakes.length ? `<div class="section-h">Common mistakes</div><ul class="mistakes">${notes.mistakes.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      <div class="section-h">Muscles</div>
      <dl class="kv"><dt>Target</dt><dd>${esc(x.target)}</dd><dt>Also works</dt><dd>${esc(x.secondary.join(', ') || '—')}</dd><dt>Equipment</dt><dd>${esc(x.equipment)}</dd></dl>
      ${swapHtml}
      <div class="section-h">Previous sessions</div>${histHtml}
      <p class="muted small" style="margin-top:18px">Instructions: exercises-dataset (MIT). Photos: free-exercise-db (public domain). Animation © Gym visual, gymvisual.com. Dataset ID #${exId}.</p>`;

    bindMediaErrors(sheet);

    if (sheet.hidden) {
      sheet.hidden = false;
      sheet.classList.remove('closing');
      document.body.style.overflow = 'hidden';
      document.body.classList.add('sheet-open');
      if (push) pushOverlay(closeSheet);
    }
    $('#sheet-body').scrollTop = 0;
  }

  function closeSheet() {
    const sheet = $('#sheet');
    if (sheet.hidden) return;
    sheet.classList.add('closing');
    setTimeout(() => {
      sheet.hidden = true;
      sheet.classList.remove('closing');
      document.body.style.overflow = '';
      document.body.classList.remove('sheet-open');
      sheetCtx = null;
      const wasStudio = state.sheetStudio;
      state.sheetStudio = null;
      if (state.tab === 'today' || state.tab === 'progress' || (wasStudio && state.tab === 'calendar')) render();
    }, 200);
  }

  async function saveSet(row) {
    const { exId, ctx } = sheetCtx;
    const item = ctx.item;
    const i = +row.dataset.i;
    const [wIn, rIn] = $$('input', row);
    const w = wIn.value === '' ? 0 : +wIn.value;
    const r = +rIn.value;
    if (!r || r < 1) { rIn.focus(); toast('Enter the reps you did'); return; }
    const slot = slotOf(ctx.sessionKey, item);
    const date = todayKey();
    if (!state.todayLogs.has(slot)) state.todayLogs.set(slot, []);
    const list = state.todayLogs.get(slot);
    let log = list.find((l) => l.exId === exId);
    if (!log) {
      log = { key: `${date}|${slot}|${exId}`, date, exId, session: ctx.sessionKey, slot, sets: [] };
      list.push(log);
    }
    log.sets[i] = { w, r };
    for (let k = 0; k < log.sets.length; k++) if (!log.sets[k]) log.sets[k] = { w: 0, r: 0 };
    log.updatedAt = Date.now();
    list.sort((a, b) => a.updatedAt - b.updatedAt);
    await DB.put('logs', log);
    const wasDone = row.classList.contains('done');
    row.classList.add('done');
    row.dataset.w = String(w);
    row.dataset.r = String(r);
    $('.tick', row).setAttribute('aria-label', `Uncheck set ${i + 1}`);
    vibrate(30);
    if (wasDone) { toast(`Set ${i + 1} updated: ${w ? `${w} kg × ` : ''}${r}`); return; }

    // prefill the next set's weight
    const next = row.nextElementSibling;
    if (next && !next.classList.contains('done')) {
      const nw = $('input', next);
      if (nw.value === '') nw.value = w;
      setTimeout(() => next.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50);
    }
    if (document.activeElement) document.activeElement.blur();
    const planned = item.sets;
    const doneCount = list.reduce((n, l) => n + doneSets(l), 0);
    if (item.superset && item.rest === 0) {
      toast(`Now do ${item.superset} (superset), then rest`);
    } else if (doneCount >= planned) {
      toast(`${exName(exId)} done`);
      startTimer(item.rest, 'Rest, then next exercise');
    } else {
      startTimer(item.rest, `Rest before set ${doneCount + 1}`);
    }
  }

  // Tap ✓ on a saved set: undo it (or save the correction if the numbers were edited)
  function toggleSet(row) {
    if (!row.classList.contains('done')) return saveSet(row);
    const [wIn, rIn] = $$('input', row);
    const w = wIn.value === '' ? '0' : String(+wIn.value);
    const r = String(+rIn.value);
    const edited = w !== String(+(row.dataset.w || 0)) || r !== String(+(row.dataset.r || 0));
    if (edited && +r > 0) return saveSet(row);
    return uncheckSet(row);
  }

  async function uncheckSet(row) {
    const { exId, ctx } = sheetCtx;
    const i = +row.dataset.i;
    const list = state.todayLogs.get(slotOf(ctx.sessionKey, ctx.item)) || [];
    const log = list.find((l) => l.exId === exId);
    if (log && log.sets[i]) {
      log.sets[i] = { w: log.sets[i].w, r: 0 };
      while (log.sets.length && !(log.sets[log.sets.length - 1].r > 0)) log.sets.pop();
      if (!log.sets.length) {
        await DB.del('logs', log.key);
        list.splice(list.indexOf(log), 1);
      } else {
        log.updatedAt = Date.now();
        await DB.put('logs', log);
      }
    }
    row.classList.remove('done');
    $$('input', row)[1].value = '';
    delete row.dataset.r;
    $('.tick', row).setAttribute('aria-label', `Save set ${i + 1}`);
    if (!$('#timer').hidden) { $('#timer').hidden = true; clearTimeout(timer.raf); }
    vibrate(20);
    toast(`Set ${i + 1} unchecked`);
  }

  async function deleteLog(key) {
    const log = await DB.get('logs', key);
    if (!log) return;
    if (!(await askConfirm(`Remove ${exName(log.exId)}?`, `From ${fmtDay(parseKey(log.date))}. Its sets will be deleted from your progress.`, 'Remove'))) return;
    await DB.del('logs', key);
    state.progressOpen = log.date;
    toast('Removed');
    render();
  }

  // ---------------------------------------------------------------- rest timer
  const timer = { end: 0, total: 0, raf: null, label: '' };
  let audioCtx = null;
  function beep() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.22, 0.44].forEach((t) => {
        const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(audioCtx.destination);
        g.gain.setValueAtTime(0.0001, audioCtx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + t + 0.18);
        o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + 0.2);
      });
    } catch (_) { /* audio not available */ }
  }
  function startTimer(seconds, label) {
    if (!seconds) return;
    timer.total = seconds * 1000;
    timer.end = Date.now() + timer.total;
    timer.label = label;
    timer.fired = false;
    const el = $('#timer');
    el.hidden = false;
    el.classList.remove('over');
    $('#timer-label').textContent = label;
    tick();
  }
  function tick() {
    clearTimeout(timer.raf);
    const left = timer.end - Date.now();
    const el = $('#timer');
    if (el.hidden) return;
    if (left <= 0) {
      $('#timer-time').textContent = 'Go!';
      $('#timer-label').textContent = 'Rest over';
      $('#timer-fill').style.width = '0%';
      el.classList.add('over');
      if (!timer.fired) { timer.fired = true; vibrate([250, 120, 250]); beep(); }
      timer.raf = setTimeout(() => { el.hidden = true; }, 6000);
      return;
    }
    const s = Math.ceil(left / 1000);
    $('#timer-time').textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`;
    $('#timer-fill').style.width = `${(left / timer.total) * 100}%`;
    timer.raf = setTimeout(tick, 250);
  }

  // ---------------------------------------------------------------- overlays & back button
  const overlays = [];
  function pushOverlay(closeFn) {
    overlays.push(closeFn);
    history.pushState({ ov: overlays.length }, '');
  }
  window.addEventListener('popstate', () => {
    const fn = overlays.pop();
    if (fn) fn();
  });
  function closeTop() {
    if (overlays.length) history.back();
  }

  // ---------------------------------------------------------------- camera check-in
  const savedFacing = (() => { try { return localStorage.getItem('camFacing'); } catch (_) { return null; } })();
  const cam = { stream: null, facing: savedFacing === 'environment' ? 'environment' : 'user', actual: null, full: null, thumb: null, previewUrl: null, req: 0 };

  async function openCamera() {
    const existing = state.checkins.get(todayKey());
    if (existing && !(await askConfirm('Replace today’s photo?', `You already checked in today at ${fmtTime(existing.ts)}.`, 'Replace photo'))) return;
    const el = $('#camera');
    el.hidden = false;
    document.body.style.overflow = 'hidden';
    pushOverlay(closeCamera);
    showLive();
    await startStream();
  }
  function camMessage(msg) {
    const m = $('#cam-msg');
    m.hidden = !msg;
    m.textContent = msg || '';
  }
  const pause = (ms) => new Promise((r) => setTimeout(r, ms));

  // Ask for a specific camera. Many Android phones ignore a plain facingMode hint,
  // so try an exact facingMode first, then pick the camera by its label, then fall back.
  async function openFacing(facing) {
    const md = navigator.mediaDevices;
    const base = { width: { ideal: 1920 }, height: { ideal: 1920 } };
    const tryGet = async (video) => md.getUserMedia({ video: { ...base, ...video }, audio: false });
    try {
      return await tryGet({ facingMode: { exact: facing } });
    } catch (e) {
      if (e && e.name === 'NotAllowedError') throw e;
    }
    try {
      const cams = (await md.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      const want = facing === 'environment' ? /back|rear|environment|world|main/i : /front|user|face|selfie/i;
      let dev = cams.find((d) => want.test(d.label));
      if (!dev && cams.length > 1) dev = facing === 'environment' ? cams[cams.length - 1] : cams[0];
      if (dev) return await tryGet({ deviceId: { exact: dev.deviceId } });
    } catch (e) {
      if (e && e.name === 'NotAllowedError') throw e;
    }
    return tryGet({ facingMode: facing });
  }

  async function startStream() {
    const req = ++cam.req;
    stopStream();
    camMessage('');
    updateFlipLabel();
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      camMessage('Camera not available. Open the app over HTTPS (the installed app or your GitHub Pages link).');
      return;
    }
    await pause(150); // let the previous camera release (needed on some phones)
    try {
      const stream = await openFacing(cam.facing);
      if (req !== cam.req) { stream.getTracks().forEach((t) => t.stop()); return; } // a newer request won
      cam.stream = stream;
      const settings = stream.getVideoTracks()[0].getSettings ? stream.getVideoTracks()[0].getSettings() : {};
      cam.actual = settings.facingMode || cam.facing;
      const v = $('#cam-video');
      v.srcObject = stream;
      v.classList.toggle('mirror', cam.actual === 'user');
      await v.play().catch(() => {});
      if (settings.facingMode && settings.facingMode !== cam.facing) {
        toast(cam.facing === 'environment' ? 'This phone only allowed the front camera' : 'This phone only allowed the back camera');
      }
    } catch (e) {
      if (req !== cam.req) return;
      camMessage(e && e.name === 'NotAllowedError'
        ? 'Camera permission is blocked. Allow the camera for this app in Chrome site settings, then try again.'
        : 'Could not start the camera. Close other apps using it and try again.');
    }
  }
  function flipCamera() {
    cam.facing = cam.facing === 'user' ? 'environment' : 'user';
    try { localStorage.setItem('camFacing', cam.facing); } catch (_) { /* private mode */ }
    startStream();
  }
  function updateFlipLabel() {
    const l = $('#cam-flip-label');
    if (l) l.textContent = cam.facing === 'user' ? 'Back' : 'Front';
  }
  function stopStream() {
    if (cam.stream) cam.stream.getTracks().forEach((t) => t.stop());
    cam.stream = null;
    const v = $('#cam-video');
    if (v) v.srcObject = null;
  }
  function showLive() {
    $('#cam-video').hidden = false;
    $('#cam-preview').hidden = true;
    $('#cam-live').hidden = false;
    $('#cam-confirm').hidden = true;
    $('#cam-hint').textContent = 'Take a photo of yourself in the gym';
  }
  function closeCamera() {
    stopStream();
    if (cam.previewUrl) URL.revokeObjectURL(cam.previewUrl);
    cam.previewUrl = null; cam.full = null; cam.thumb = null;
    $('#camera').hidden = true;
    document.body.style.overflow = '';
  }

  function drawStamp(ctx, w, h, when) {
    const bar = Math.round(h * 0.11);
    const g = ctx.createLinearGradient(0, h - bar * 1.6, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h - bar * 1.6, w, bar * 1.6);
    const fs = Math.max(14, Math.round(h * 0.032));
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${fs}px system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('GYM CHECK-IN', Math.round(w * 0.04), h - Math.round(bar * 0.55));
    ctx.font = `500 ${Math.round(fs * 0.85)}px system-ui, sans-serif`;
    const d = new Date(when);
    ctx.fillText(`${DOW_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${fmtTime(when)}`, Math.round(w * 0.04), h - Math.round(bar * 0.18));
  }

  function canvasBlob(canvas, q) {
    return new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));
  }

  async function shoot() {
    const v = $('#cam-video');
    if (!cam.stream || !v.videoWidth) { toast('Camera is not ready yet'); return; }
    const when = Date.now();
    const vw = v.videoWidth; const vh = v.videoHeight;
    const scale = Math.min(1, 1600 / Math.max(vw, vh));
    const w = Math.round(vw * scale); const h = Math.round(vh * scale);
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    if ((cam.actual || cam.facing) === 'user') { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(v, 0, 0, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawStamp(ctx, w, h, when);
    const full = await canvasBlob(c, 0.82);

    const ts = document.createElement('canvas');
    const tScale = 320 / Math.max(w, h);
    ts.width = Math.round(w * tScale); ts.height = Math.round(h * tScale);
    ts.getContext('2d').drawImage(c, 0, 0, ts.width, ts.height);
    const thumb = await canvasBlob(ts, 0.72);

    cam.full = full; cam.thumb = thumb; cam.when = when;
    stopStream();
    const flash = document.createElement('div'); flash.className = 'flash'; document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 400);
    vibrate(40);
    if (cam.previewUrl) URL.revokeObjectURL(cam.previewUrl);
    cam.previewUrl = URL.createObjectURL(full);
    const p = $('#cam-preview');
    p.src = cam.previewUrl;
    p.hidden = false;
    $('#cam-video').hidden = true;
    $('#cam-live').hidden = true;
    $('#cam-confirm').hidden = false;
    $('#cam-hint').textContent = 'Happy with this photo?';
  }

  async function useCheckin() {
    if (!cam.full) return;
    const { full, thumb, when } = cam;
    const date = keyOf(new Date(when));
    const rec = { date, ts: when, month: monthKey(date), thumb, hasFull: true, fullBytes: full.size };
    await DB.put('photos', { date, blob: full });
    await DB.put('checkins', rec);
    dropThumbUrl(date);
    state.checkins.set(date, rec);
    if (restKey(date)) await setRest(date, false);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    closeTop(); // closes the camera
    state.attView = 'calendar';
    const d = new Date(when);
    state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    vibrate([60, 60, 120]);
    go('calendar', { anim: date });
  }

  // ---------------------------------------------------------------- attendance logic
  // Every day counts: checked in = done, past day without a check-in = missed.
  function dayStatus(k, today) {
    if (state.checkins.has(k)) return 'done';
    if (restKey(k)) return 'rest';
    if (k > today) return 'future';
    if (k === today) return 'due';
    if (k < state.settings.trackStart) return 'none';
    return 'missed';
  }

  function streaks() {
    const today = todayKey();
    const start = parseKey(state.settings.trackStart);
    let best = 0; let run = 0;
    for (let d = new Date(start); keyOf(d) <= today; d = addDays(d, 1)) {
      const k = keyOf(d);
      if (state.checkins.has(k)) { run++; best = Math.max(best, run); } else if (k !== today && !restKey(k)) run = 0;
    }
    return { current: run, best };
  }

  function monthStats(y, m) {
    const today = todayKey();
    let due = 0; let done = 0; let rest = 0;
    const days = new Date(y, m + 1, 0).getDate();
    for (let i = 1; i <= days; i++) {
      const k = keyOf(new Date(y, m, i));
      if (k > today || k < state.settings.trackStart) continue;
      if (isRest(k)) { rest++; continue; }
      if (k === today && !state.checkins.has(k)) continue;
      due++;
      if (state.checkins.has(k)) done++;
    }
    return { due, done, rest };
  }

  // ---------------------------------------------------------------- render: calendar
  async function renderCalendar(v) {
    if (state.attView === 'photos') return renderPhotos(v);
    const today = todayKey();
    if (!state.calMonth) { const n = new Date(); state.calMonth = new Date(n.getFullYear(), n.getMonth(), 1); }
    const y = state.calMonth.getFullYear(); const m = state.calMonth.getMonth();
    const st = monthStats(y, m);
    const sk = streaks();
    const anim = state.lastCheckinAnim;
    state.lastCheckinAnim = null;
    setHeader('Attendance', `${state.checkins.size} check-in${state.checkins.size === 1 ? '' : 's'} · check in any day`);

    const first = new Date(y, m, 1);
    const lead = (first.getDay() + 6) % 7; // Monday first
    const days = new Date(y, m + 1, 0).getDate();
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<div class="cell blank"></div>';
    let idx = 0;
    for (let i = 1; i <= days; i++) {
      const d = new Date(y, m, i); const k = keyOf(d);
      const s = dayStatus(k, today);
      const mark = s === 'done' ? ICON.tick : s === 'missed' ? ICON.cross : s === 'rest' ? ICON.moonMark : '';
      const stamp = anim === k ? ' stamp' : '';
      const extra = anim === k ? `;--stamp-delay:${idx * 22 + 450}ms` : '';
      cells += `<button class="cell ${s}${k === today ? ' today' : ''}${stamp}" style="--i:${idx++}${extra}" data-action="day" data-date="${k}" aria-label="${fmtDay(d)}: ${s}">
        <span class="n">${i}</span>${mark}</button>`;
    }
    const pct = st.due ? Math.round((st.done / st.due) * 100) : 0;
    const ci = state.checkins.get(today);

    let banner = '';
    if (anim) {
      banner = `<div class="banner row" style="gap:12px">${thumbUrl(anim) ? `<button class="photo-btn" data-action="photo" data-date="${anim}"><img src="${thumbUrl(anim)}" alt=""></button>` : ''}
        <div><b>Checked in!</b> ${fmtDay(parseKey(anim))} is marked. Streak: ${sk.current} day${sk.current === 1 ? '' : 's'}.
        <div><button class="link" data-action="photo" data-date="${anim}">View photo</button></div></div></div>`;
    }
    const pending = await pendingArchiveMonths();
    if (!anim && pending.length) banner = `<div class="banner warn"><b>${monthLabel(pending[0])} photos are ready.</b> <button class="link" data-action="att-view" data-view="photos">Open Photos</button> to download the ZIP.</div>`;

    v.innerHTML = `
      ${attTabs()}
      ${banner}
      ${ci ? '' : `<button class="btn primary block" style="margin-bottom:12px" data-action="checkin">${ICON.camera}Check in with a gym photo</button>`}
      <div class="stats">
        <div class="stat"><b>${st.done}/${st.due}</b><span>${MONTHS[m].slice(0, 3)} days${st.due ? ` · ${pct}%` : ''}</span></div>
        <div class="stat"><b>${sk.current}</b><span>Day streak</span></div>
        <div class="stat"><b>${sk.best}</b><span>Best streak</span></div>
      </div>
      <div class="card">
        <div class="cal-nav">
          <button class="icon-btn" data-action="cal-prev" aria-label="Previous month">${ICON.left}</button>
          <h2>${MONTHS[m]} ${y}</h2>
          <button class="icon-btn" data-action="cal-next" aria-label="Next month">${ICON.right}</button>
        </div>
        <div class="cal-week">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((c) => `<div>${c}</div>`).join('')}</div>
        <div class="cal-grid ${anim ? 'cascade' : ''}" id="cal-grid">${cells}</div>
        <div class="legend"><span><i class="l-done"></i>Checked in</span><span><i class="l-rest"></i>Rest</span><span><i class="l-missed"></i>Missed</span><span><i class="l-today"></i>Today</span></div>
        <div class="muted small">${st.rest ? `${st.rest} rest day${st.rest === 1 ? '' : 's'} this month (not counted as absent). ` : ''}Tap any day to see its photo or mark it as a rest day.</div>
      </div>
      <button class="btn block" data-action="att-view" data-view="photos">View all photos (${state.checkins.size})</button>`;

    if (anim) {
      const cell = v.querySelector(`.cell[data-date="${anim}"]`);
      if (cell) setTimeout(() => vibrate(50), (+cell.style.getPropertyValue('--i') || 0) * 22 + 650);
    }
  }

  function attTabs() {
    const v = state.attView || 'calendar';
    return `<div class="seg two"><button class="${v === 'calendar' ? 'active' : ''}" data-action="att-view" data-view="calendar">Calendar</button>
      <button class="${v === 'photos' ? 'active' : ''}" data-action="att-view" data-view="photos">Photos (${state.checkins.size})</button></div>`;
  }

  async function renderPhotos(v) {
    setHeader('Attendance', `${state.checkins.size} photo${state.checkins.size === 1 ? '' : 's'} · newest first`);
    const byMonth = new Map();
    for (const r of state.checkins.values()) {
      if (!byMonth.has(r.month)) byMonth.set(r.month, []);
      byMonth.get(r.month).push(r);
    }
    let html = attTabs();
    if (!byMonth.size) {
      html += `<div class="card empty">No check-in photos yet.<br><br><button class="btn primary" data-action="checkin">${ICON.camera}Check in with a gym photo</button></div>`;
      v.innerHTML = html;
      return;
    }
    for (const mo of [...byMonth.keys()].sort().reverse()) {
      const list = byMonth.get(mo).sort((a, b) => (a.date < b.date ? 1 : -1));
      const hasEdit = !!(await DB.get('edits', mo));
      html += `<div class="month-head"><div><b>${monthLabel(mo)}</b> <span class="muted small">· ${list.length} photo${list.length === 1 ? '' : 's'}</span></div>
        ${window.GymEdit && list.length >= 3 ? `<button class="btn small ${hasEdit ? 'primary' : ''}" data-action="studio" data-month="${mo}">${ICON.film}${hasEdit ? 'Watch edit' : 'Gym edit'}</button>` : ''}</div>
        <div class="photo-grid">${list.map((r) => {
          const d = parseKey(r.date);
          const u = thumbUrl(r.date);
          return `<button class="ph" data-action="photo" data-date="${r.date}" aria-label="Photo ${fmtDay(d)}">
            ${u ? `<img src="${u}" alt="" loading="lazy">` : '<span class="ph-none">No photo</span>'}
            <span class="ph-cap"><b>${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}</b> ${DOW[d.getDay()]} · ${fmtTime(r.ts)}</span></button>`;
        }).join('')}</div>
        <div class="card archive-card">${await archiveRow(mo, byMonth.get(mo))}</div>`;
    }
    html += `<p class="muted small">Photos never leave this phone. Once a finished month is downloaded, its full-size photos are erased ${ERASE_AFTER_DAYS} days later. Small thumbnails and all attendance marks are kept.</p>`;
    v.innerHTML = html;
    placeEditCanvas();
  }

  async function pendingArchiveMonths() {
    const cur = monthKey(todayKey());
    const months = [...new Set([...state.checkins.values()].map((r) => r.month))].filter((mo) => mo < cur);
    const out = [];
    for (const mo of months) {
      const a = await DB.meta(`archive:${mo}`, {});
      const hasFull = [...state.checkins.values()].some((r) => r.month === mo && r.hasFull);
      if (hasFull && !(a.downloadedAt && a.downloadedAt > monthEnd(mo).getTime())) out.push(mo);
    }
    return out.sort();
  }

  async function archiveRow(mo, list) {
    const cur = monthKey(todayKey());
    {
      const full = list.filter((r) => r.hasFull);
      const bytes = full.reduce((s, r) => s + (r.fullBytes || 0), 0);
      const a = await DB.meta(`archive:${mo}`, {});
      const finished = mo < cur;
      const validDl = a.downloadedAt && a.downloadedAt > monthEnd(mo).getTime();
      let status;
      let acts = `<button class="btn small" data-action="zip" data-month="${mo}">${ICON.download}${a.downloadedAt ? 'Download again' : 'Download ZIP'}</button>`;
      if (!full.length) {
        status = a.erasedAt ? `Full-size photos erased ${fmtDate(a.erasedAt)}. Thumbnails kept.` : 'Thumbnails only.';
        acts = `<button class="btn small ghost" data-action="zip" data-month="${mo}">${ICON.download}Thumbnails ZIP</button>`;
      } else if (!finished) {
        status = `In progress · ${a.downloadedAt ? `downloaded ${fmtDate(a.downloadedAt)} (download again after the month ends to enable clean-up)` : 'you can download it any time'}`;
      } else if (validDl) {
        const eraseOn = a.downloadedAt + ERASE_AFTER_DAYS * 86400000;
        status = `Downloaded ${fmtDate(a.downloadedAt)} · full-size photos erase on ${fmtDate(eraseOn)}`;
        acts += `<button class="btn small danger" data-action="erase" data-month="${mo}">Erase full-size now</button>`;
      } else {
        status = '<span style="color:var(--warn)">Not downloaded yet</span>';
      }
      return `<div class="month-row"><div><b>Download ${monthLabel(mo)}</b><div class="muted small">${list.length} photo${list.length === 1 ? '' : 's'}${full.length ? ` · ${fmtBytes(bytes)}` : ''} + attendance sheet</div><div class="small" style="margin-top:4px">${status}</div></div>
        <div class="acts">${acts}</div></div>`;
    }
  }

  async function downloadMonth(mo) {
    toast('Preparing ZIP…');
    const list = [...state.checkins.values()].filter((r) => r.month === mo).sort((a, b) => (a.date < b.date ? -1 : 1));
    const files = [];
    for (const r of list) {
      const d = new Date(r.ts);
      const base = `${r.date}_${DOW[d.getDay()]}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
      const full = r.hasFull ? await DB.get('photos', r.date) : null;
      if (full) files.push({ name: `${base}.jpg`, data: full.blob, date: d });
      else if (r.thumb) files.push({ name: `${base}_thumb.jpg`, data: r.thumb, date: d });
    }
    // attendance sheet for the month
    const [y, m] = mo.split('-').map(Number);
    const today = todayKey();
    let csv = 'date,weekday,status,check_in_time\n';
    for (let i = 1; i <= new Date(y, m, 0).getDate(); i++) {
      const d = new Date(y, m - 1, i); const k = keyOf(d);
      const rec = state.checkins.get(k);
      csv += `${k},${DOW[d.getDay()]},${dayStatus(k, today)},${rec ? fmtTime(rec.ts) : ''}\n`;
    }
    files.push({ name: `attendance-${mo}.csv`, data: csv, date: new Date() });
    const edit = await DB.get('edits', mo);
    if (edit) files.push({ name: `gym-edit-${mo}.${edit.ext}`, data: edit.blob, date: new Date(edit.createdAt) });
    const blob = await Zip.build(files);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gym-checkins-${mo}.zip`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    const prev = await DB.meta(`archive:${mo}`, {});
    await DB.setMeta(`archive:${mo}`, { ...prev, downloadedAt: Date.now() });
    const nPhotos = files.filter((f) => f.name.endsWith('.jpg')).length;
    toast(`Downloaded ${nPhotos} photo${nPhotos === 1 ? '' : 's'}${edit ? ' + gym edit' : ''} (${fmtBytes(blob.size)})`);
    if (state.tab === 'calendar') render();
  }

  async function eraseMonth(mo, silent = false) {
    const list = [...state.checkins.values()].filter((r) => r.month === mo && r.hasFull);
    for (const r of list) {
      await DB.del('photos', r.date);
      r.hasFull = false; r.fullBytes = 0;
      await DB.put('checkins', r);
    }
    const prev = await DB.meta(`archive:${mo}`, {});
    await DB.setMeta(`archive:${mo}`, { ...prev, erasedAt: Date.now() });
    if (!silent) { toast(`Erased full-size photos for ${monthLabel(mo)}`); render(); }
  }

  async function autoCleanup() {
    const cur = monthKey(todayKey());
    const months = [...new Set([...state.checkins.values()].filter((r) => r.hasFull).map((r) => r.month))].filter((mo) => mo < cur);
    for (const mo of months) {
      const a = await DB.meta(`archive:${mo}`, {});
      if (a.downloadedAt && a.downloadedAt > monthEnd(mo).getTime() && Date.now() > a.downloadedAt + ERASE_AFTER_DAYS * 86400000) {
        await eraseMonth(mo, true);
      }
    }
  }

  function openDay(k) {
    if (state.checkins.has(k)) { openPhoto(k); return; }
    const today = todayKey();
    const s = dayStatus(k, today);
    const title = `${DOW_LONG[parseKey(k).getDay()]}, ${parseKey(k).getDate()} ${MONTHS[parseKey(k).getMonth()]}`;
    if (s === 'none') { toast(`${fmtDay(parseKey(k))}: before tracking started`); return; }
    const acts = [];
    if (s === 'rest') {
      if (k === today) acts.push({ label: 'Train anyway: check in', action: 'checkin', cls: 'primary' });
      acts.push({ label: 'Remove rest day', action: 'rest-off', date: k, cls: '' });
    } else {
      if (k === today) acts.push({ label: 'Check in with a gym photo', action: 'checkin', cls: 'primary' });
      acts.push({ label: 'Mark as rest day', action: 'rest-on', date: k, cls: k === today ? '' : 'primary' });
    }
    const sub = {
      rest: 'Rest day. Not counted as absent and doesn\u2019t break your streak.',
      missed: 'No check-in. If this was a planned rest day, mark it so it doesn\u2019t count as absent.',
      due: 'Not checked in yet.',
      future: 'Plan ahead: mark it as a rest day now.'
    }[s];
    openActionSheet(title, sub, acts);
  }

  function openActionSheet(title, sub, actions) {
    const el = $('#asheet');
    $('#asheet-title').textContent = title;
    $('#asheet-sub').textContent = sub || '';
    $('#asheet-actions').innerHTML = actions.map((a) => `<button class="btn block ${a.cls || ''}" data-action="${a.action}" ${a.date ? `data-date="${a.date}"` : ''} data-asheet="1">${a.action.startsWith('rest') ? ICON.moon : a.action === 'checkin' ? ICON.camera : ''}${esc(a.label)}</button>`).join('')
      + '<button class="btn block ghost" data-action="asheet-close">Cancel</button>';
    el.hidden = false;
    pushOverlay(closeActionSheet);
  }
  function closeActionSheet() {
    $('#asheet').hidden = true;
    if (confirmResolve) { const r = confirmResolve; confirmResolve = null; r(confirmAnswer); }
  }

  // In-app "are you sure?" sheet. The browser's own confirm dialog is blocked in some installed
  // apps and embedded browsers (it answers "no" at once), so deletes never went through.
  let confirmResolve = null;
  let confirmAnswer = false;
  function askConfirm(title, sub, okLabel = 'Delete') {
    if (confirmResolve) confirmResolve(false);
    return new Promise((resolve) => {
      confirmAnswer = false;
      openFormSheet(title, sub, `<button class="btn danger-solid block" data-action="confirm-yes">${ICON.trash}${esc(okLabel)}</button>
        <button class="btn ghost block" data-action="confirm-no">Cancel</button>`);
      confirmResolve = resolve;
    });
  }

  // Full-screen photo viewer, browsable date-wise (newest first)
  const viewer = { list: [], i: 0, url: null };
  async function showPhoto() {
    const k = viewer.list[viewer.i];
    const rec = state.checkins.get(k);
    if (viewer.url) { URL.revokeObjectURL(viewer.url); viewer.url = null; }
    const full = rec.hasFull ? await DB.get('photos', k) : null;
    if (full) viewer.url = URL.createObjectURL(full.blob);
    $('#viewer-img').src = viewer.url || thumbUrl(k) || '';
    const d = parseKey(k);
    $('#viewer-cap').innerHTML = `<b>${DOW_LONG[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}</b><br>
      <span class="small">Checked in ${fmtTime(rec.ts)} · ${viewer.i + 1} of ${viewer.list.length}${full ? '' : ' · thumbnail only'}</span>`;
    $('#viewer-actions').innerHTML = `${full ? `<button class="btn light ghost" data-action="photo-save" data-date="${k}">${ICON.download}Save</button>` : ''}
      <button class="btn danger" data-action="delete-checkin" data-date="${k}">Delete</button>`;
    $('#viewer-prev').disabled = viewer.i >= viewer.list.length - 1;
    $('#viewer-next').disabled = viewer.i <= 0;
  }
  async function openPhoto(k) {
    viewer.list = [...state.checkins.keys()].sort().reverse();
    viewer.i = Math.max(0, viewer.list.indexOf(k));
    const el = $('#viewer');
    if (el.hidden) {
      el.hidden = false;
      document.body.style.overflow = 'hidden';
      pushOverlay(closeViewer);
    }
    await showPhoto();
  }
  function stepPhoto(dir) {
    const n = viewer.i + dir; // +1 = older, -1 = newer
    if (n < 0 || n >= viewer.list.length) return;
    viewer.i = n;
    showPhoto();
  }
  function closeViewer() {
    if (viewer.url) URL.revokeObjectURL(viewer.url);
    viewer.url = null;
    $('#viewer').hidden = true;
    document.body.style.overflow = '';
  }
  async function savePhoto(k) {
    const rec = state.checkins.get(k);
    const full = await DB.get('photos', k);
    if (!full) return;
    const d = new Date(rec.ts);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(full.blob);
    a.download = `gym-checkin-${k}_${pad(d.getHours())}-${pad(d.getMinutes())}.jpg`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  }
  async function deleteCheckin(k) {
    if (!(await askConfirm('Delete this check-in?', 'The photo is deleted and the day will show as missed.'))) return;
    await DB.del('checkins', k);
    await DB.del('photos', k);
    state.checkins.delete(k);
    dropThumbUrl(k);
    closeTop();
    toast('Check-in deleted');
    render();
  }

  // ---------------------------------------------------------------- render: progress
  function sparkline(values) {
    if (values.length < 2) return '';
    const min = Math.min(...values); const max = Math.max(...values);
    const W = 300; const H = 60; const span = max - min || 1;
    const pts = values.map((v, i) => [(i / (values.length - 1)) * (W - 8) + 4, H - 6 - ((v - min) / span) * (H - 12)]);
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="M${pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join('L')}"/>${pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="2.5"/>`).join('')}</svg>`;
  }

  async function renderProgress(v) {
    setHeader('Progress', 'Your logged sets and best lifts');
    const logs = (await DB.all('logs')).filter((l) => l.sets.some((s) => s.r > 0));
    const byDate = new Map();
    for (const l of logs) {
      if (!byDate.has(l.date)) byDate.set(l.date, []);
      byDate.get(l.date).push(l);
    }
    const weekAgo = keyOf(addDays(new Date(), -6));
    const setsWeek = logs.filter((l) => l.date >= weekAgo).reduce((s, l) => s + l.sets.filter((x) => x.r > 0).length, 0);
    const now = new Date();
    const st = monthStats(now.getFullYear(), now.getMonth());

    const recent = [...byDate.keys()].sort().reverse().slice(0, 12).map((dk) => {
      const ls = byDate.get(dk);
      const names = [...new Set(ls.map((l) => l.session))].map((k) => (P.days[k] ? `${P.days[k].short} · ${P.days[k].title}` : '')).filter(Boolean).join(' + ');
      const sets = ls.reduce((s, l) => s + l.sets.filter((x) => x.r > 0).length, 0);
      return `<details class="card" style="padding:0"${state.progressOpen === dk ? ' open' : ''}><summary style="padding:12px 14px;list-style:none;display:flex;justify-content:space-between;gap:10px"><span><b>${fmtDay(parseKey(dk))}</b> <span class="muted small">· ${esc(names)}</span></span><span class="muted small">${ls.length} exercise${ls.length === 1 ? '' : 's'} · ${sets} set${sets === 1 ? '' : 's'}</span></summary>
        <div class="hist" style="padding:0 14px 10px">${ls.map((l) => `<div><span>${esc(exName(l.exId))}</span><span class="row" style="gap:8px">${l.sets.filter((s) => s.r > 0).map((s) => `${s.w ? s.w + '×' : ''}${s.r}`).join(' · ')}
          <button class="mini-del" data-action="del-log" data-key="${esc(l.key)}" aria-label="Remove ${esc(exName(l.exId))} from this day">✕</button></span></div>`).join('')}
          <div class="muted small" style="border:0;padding-top:8px">Logged something by mistake? Tap ✕ to remove it.</div></div></details>`;
    }).join('');

    const lifts = [];
    const seen = new Map(); // exercise id -> days it appears on
    for (const key of P.order) for (const item of P.days[key].items) {
      if (!seen.has(item.id)) seen.set(item.id, { item, days: [] });
      seen.get(item.id).days.push(P.days[key].short);
    }
    for (const [, { item, days }] of seen) {
      {
        const h = logs.filter((l) => l.exId === item.id).sort((a, b) => (a.date < b.date ? -1 : 1));
        const best = h.map((l) => Math.max(...l.sets.map((s) => e1rm(+s.w, +s.r)))).filter((x) => x > 0);
        const last = h[h.length - 1];
        lifts.push(`<button class="swap" data-action="info-ex" data-ex="${item.id}"><img src="${mediaUrl(item.id, 'img')}" alt="" loading="lazy" crossorigin="anonymous">
          <span><b>${esc(itemName(item))}</b><div class="muted small">${days.join(', ')}${last ? ` · last ${fmtDay(parseKey(last.date))}: ${last.sets.filter((s) => s.r > 0).map((s) => `${s.w ? s.w + '×' : ''}${s.r}`).join(' · ')}` : ' · not logged yet'}</div>
          ${best.length > 1 ? sparkline(best) : ''}</span>
          <span class="muted small">${best.length ? `${Math.round(Math.max(...best))} kg<br>e1RM` : ''}</span></button>`);
      }
    }

    v.innerHTML = `
      <div class="stats">
        <div class="stat"><b>${byDate.size}</b><span>Sessions logged</span></div>
        <div class="stat"><b>${setsWeek}</b><span>Sets, last 7 days</span></div>
        <div class="stat"><b>${st.done}/${st.due}</b><span>Check-ins this month</span></div>
      </div>
      <div class="section-h">Recent sessions</div>
      ${recent || '<div class="card empty">No sets logged yet. Open an exercise on the Workout tab and tap ✓ after each set.</div>'}
      <div class="section-h">Exercises (e1RM = estimated 1-rep max)</div>
      <div class="stack">${lifts.join('')}</div>`;
  }

  // ---------------------------------------------------------------- render: macros
  const num = (x) => Math.round(+x || 0);
  const fmtNum = (x) => num(x).toLocaleString('en-IN');
  const itemKcal = (it) => (+it.kcal || 0) * (+it.qty || 1);
  const itemProtein = (it) => (+it.protein || 0) * (+it.qty || 1);
  const sumMeal = (list) => ({ kcal: list.reduce((n, it) => n + itemKcal(it), 0), protein: list.reduce((n, it) => n + itemProtein(it), 0) });
  const emptyDay = (date) => ({ date, breakfast: [], lunch: [], dinner: [] });
  async function mealDay(date) { return (await DB.get('meals', date)) || emptyDay(date); }
  function dayTotals(rec) {
    const t = { kcal: 0, protein: 0, meals: 0 };
    for (const [m] of MEALS) {
      const x = sumMeal(rec[m] || []);
      t.kcal += x.kcal; t.protein += x.protein;
      if ((rec[m] || []).length) t.meals++;
    }
    return t;
  }
  function meter(label, val, target, unit) {
    const pct = target ? Math.min(100, (val / target) * 100) : 0;
    const left = target - val;
    const over = left < 0;
    return `<div class="meter${over ? ' over' : ''}">
      <div class="row between"><span class="eyebrow">${label}</span><span class="small"><b>${fmtNum(val)}</b> / ${fmtNum(target)} ${unit}</span></div>
      <div class="bar"><span style="width:${pct}%"></span></div>
      <div class="small ${over ? 'warn-text' : 'muted'}">${over ? `Over by ${fmtNum(-left)} ${unit}` : `${fmtNum(left)} ${unit} left`}</div></div>`;
  }

  async function renderMacros(v) {
    const today = todayKey();
    const date = state.mealDate || today;
    const d = parseKey(date);
    setHeader('Macros', date === today ? 'Today’s food' : fmtDay(d));
    const targets = await DB.meta('targets', DEFAULT_TARGETS);
    const rec = await mealDay(date);
    const tot = dayTotals(rec);
    const complete = tot.meals === MEALS.length;
    const kcalLeft = targets.kcal - tot.kcal;

    const mealCards = MEALS.map(([m, label]) => {
      const list = rec[m] || [];
      const sub = sumMeal(list);
      const items = list.map((it) => `<div class="food">
          <button class="food-main" data-action="food-edit" data-meal="${m}" data-id="${esc(it.id)}">
            <b>${esc(it.name)}</b><span class="muted small">${+it.qty !== 1 ? `${+it.qty} × ` : ''}${fmtNum(it.kcal)} kcal · ${+(+it.protein).toFixed(1)} g</span></button>
          <span class="food-tot"><b>${fmtNum(itemKcal(it))}</b><span>${+itemProtein(it).toFixed(1)} g P</span></span>
          <button class="mini-del" data-action="food-del" data-meal="${m}" data-id="${esc(it.id)}" aria-label="Remove ${esc(it.name)}">✕</button></div>`).join('');
      return `<section class="card meal${list.length ? ' has' : ''}">
        <div class="meal-head"><div><span class="meal-name">${label}</span>${list.length ? `<span class="meal-ok">${ICON.check}</span>` : ''}</div>
          <div class="meal-sum">${list.length ? `<b>${fmtNum(sub.kcal)}</b> kcal · <b>${+sub.protein.toFixed(1)}</b> g protein` : '<span class="muted">Not added yet</span>'}</div></div>
        ${items ? `<div class="foods">${items}</div>` : ''}
        <button class="btn small ghost block" style="margin-top:10px" data-action="food-add" data-meal="${m}">${ICON.plus}Add ${label.toLowerCase()} item</button>
      </section>`;
    }).join('');

    const pctK = targets.kcal ? Math.round((tot.kcal / targets.kcal) * 100) : 0;
    const pctP = targets.protein ? Math.round((tot.protein / targets.protein) * 100) : 0;
    const missing = MEALS.filter(([m]) => !(rec[m] || []).length).map(([, l]) => l);
    const summary = complete
      ? `<section class="card day-done"><span class="eyebrow accent">Day complete</span>
          <h3>${fmtDay(d)} total</h3>
          <div class="stats"><div class="stat"><b>${fmtNum(tot.kcal)}</b><span>kcal · ${pctK}%</span></div>
            <div class="stat"><b>${+tot.protein.toFixed(1)}</b><span>g protein · ${pctP}%</span></div>
            <div class="stat"><b>${kcalLeft >= 0 ? fmtNum(kcalLeft) : `+${fmtNum(-kcalLeft)}`}</b><span>${kcalLeft >= 0 ? 'kcal short' : 'kcal over'}</span></div></div>
          <div class="split">${MEALS.map(([m, l]) => { const x = sumMeal(rec[m]); return `<div style="flex:${Math.max(1, x.kcal)}"><span>${l}</span><b>${fmtNum(x.kcal)}</b></div>`; }).join('')}</div>
          <div class="small" style="margin-top:10px">${kcalLeft > 150 ? `You were ${fmtNum(kcalLeft)} kcal under target. For a bulk, add a snack-sized portion to one meal tomorrow.` : kcalLeft < -250 ? 'Well over target today. Fine once in a while; keep tomorrow on plan.' : 'On target. Nice.'} ${tot.protein < targets.protein ? `Protein was ${+(targets.protein - tot.protein).toFixed(1)} g short.` : 'Protein target hit.'}</div>
        </section>`
      : `<div class="muted small center" style="margin:6px 0 14px">Add ${missing.join(', ').replace(/, ([^,]*)$/, ' and $1')} to finish the day and see the full day report.</div>`;

    // last 7 days with entries
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const k = keyOf(addDays(d, -i));
      const r = await DB.get('meals', k);
      if (r) days.push([k, dayTotals(r)]);
    }
    const avgK = days.length ? days.reduce((n, [, t]) => n + t.kcal, 0) / days.length : 0;
    const avgP = days.length ? days.reduce((n, [, t]) => n + t.protein, 0) / days.length : 0;
    const hit = days.filter(([, t]) => t.kcal >= targets.kcal * 0.95).length;
    const history = days.length
      ? `<div class="section-h">Previous 7 days</div>
        <div class="stats"><div class="stat"><b>${fmtNum(avgK)}</b><span>Avg kcal</span></div><div class="stat"><b>${+avgP.toFixed(0)}</b><span>Avg protein g</span></div><div class="stat"><b>${hit}/${days.length}</b><span>Days on target</span></div></div>
        <div class="card hist">${days.map(([k, t]) => `<div><button class="link plain" data-action="meal-date" data-date="${k}">${fmtDay(parseKey(k))}</button><span>${fmtNum(t.kcal)} kcal · ${+t.protein.toFixed(0)} g${t.meals < 3 ? ` <span class="muted">(${t.meals}/3)</span>` : ''}</span></div>`).join('')}</div>`
      : '';

    v.innerHTML = `
      <section class="hero macros-hero">
        <div class="hero-top"><span class="eyebrow">Daily target</span><button class="btn small ghost" data-action="targets-edit">Edit target</button></div>
        <div class="hero-main"><div>
          <div class="big-num">${fmtNum(Math.abs(kcalLeft))}<small>kcal ${kcalLeft >= 0 ? 'left' : 'over'}</small></div>
          <div class="muted small">${fmtNum(targets.kcal)} target − ${fmtNum(tot.kcal)} eaten</div></div>
          ${bigRing(Math.min(100, pctK), 'of kcal')}</div>
        ${meter('Calories', tot.kcal, targets.kcal, 'kcal')}
        ${meter('Protein', tot.protein, targets.protein, 'g')}
      </section>
      <div class="date-nav">
        <button class="icon-btn" data-action="meal-prev" aria-label="Previous day">${ICON.left}</button>
        <div><b>${date === today ? 'Today' : DOW_LONG[d.getDay()]}</b><span class="muted small">${d.getDate()} ${MONTHS[d.getMonth()]}</span></div>
        <button class="icon-btn" data-action="meal-next" aria-label="Next day" ${date >= today ? 'disabled' : ''}>${ICON.right}</button>
      </div>
      ${mealCards}
      ${summary}
      ${history}`;
  }

  function openFormSheet(title, sub, html) {
    $('#asheet-title').textContent = title;
    $('#asheet-sub').textContent = sub || '';
    $('#asheet-actions').innerHTML = html;
    if ($('#asheet').hidden) { $('#asheet').hidden = false; pushOverlay(closeActionSheet); }
    const first = $('#asheet-actions input:not([type=hidden])');
    if (first && !first.value) setTimeout(() => first.focus(), 250);
  }

  async function openFoodForm(meal, id = null) {
    const rec = await mealDay(state.mealDate || todayKey());
    const it = id ? (rec[meal] || []).find((x) => x.id === id) : null;
    state.mealEdit = { meal, id };
    const foods = (await DB.meta('foods', [])).slice().sort((a, b) => (b.used || 0) - (a.used || 0));
    const label = MEALS.find(([m]) => m === meal)[1];
    const chips = !it && foods.length
      ? `<div class="food-chips-box"><div class="eyebrow" style="margin-bottom:6px">Saved foods · tap to fill, ✕ to remove</div>
        <div class="chips food-chips">${foods.map((f, i) => `<span class="chip-wrap" data-i="${i}"><button type="button" class="chip" data-action="food-pick" data-i="${i}">${esc(f.name)}<small>${fmtNum(f.kcal)} kcal · ${+(+f.protein).toFixed(1)} g</small></button><button type="button" class="chip-del" data-action="food-forget" data-i="${i}" aria-label="Remove ${esc(f.name)} from saved foods">✕</button></span>`).join('')}</div></div>`
      : '';
    state.foodPick = foods;
    openFormSheet(it ? `Edit ${label.toLowerCase()} item` : `Add to ${label.toLowerCase()}`, 'Calories and protein are per serving. Quantity multiplies them.', `
      ${chips}
      <form class="form" id="food-form" autocomplete="off">
        <label class="in wide"><span>Food</span><input name="name" maxlength="60" required placeholder="e.g. Mess chicken curry" value="${it ? esc(it.name) : ''}"></label>
        <label class="in"><span>Calories</span><input name="kcal" type="number" inputmode="decimal" min="0" step="any" required placeholder="kcal" value="${it ? esc(it.kcal) : ''}"></label>
        <label class="in"><span>Protein (g)</span><input name="protein" type="number" inputmode="decimal" min="0" step="any" required placeholder="g" value="${it ? esc(it.protein) : ''}"></label>
        <label class="in"><span>Quantity</span><input name="qty" type="number" inputmode="decimal" min="0.25" step="any" value="${it ? esc(it.qty) : 1}"></label>
        <div class="in total" id="food-total"></div>
        <button class="btn primary block wide" type="submit">${it ? 'Save changes' : `${ICON.plus}Add to ${label.toLowerCase()}`}</button>
        <button class="btn ghost block wide" type="button" data-action="asheet-close">Cancel</button>
      </form>`);
    updateFoodTotal();
  }
  function updateFoodTotal() {
    const f = $('#food-form');
    if (!f) return;
    const q = +f.qty.value || 1;
    $('#food-total').innerHTML = `<span>Total</span><b>${fmtNum((+f.kcal.value || 0) * q)} kcal · ${+((+f.protein.value || 0) * q).toFixed(1)} g</b>`;
  }

  async function saveFood(form) {
    const { meal, id } = state.mealEdit;
    const date = state.mealDate || todayKey();
    const rec = await mealDay(date);
    const name = form.name.value.trim();
    const item = { id: id || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, name, kcal: +form.kcal.value || 0, protein: +form.protein.value || 0, qty: +form.qty.value || 1 };
    rec[meal] = rec[meal] || [];
    const i = rec[meal].findIndex((x) => x.id === item.id);
    if (i >= 0) rec[meal][i] = item; else rec[meal].push(item);
    await DB.put('meals', rec);
    // remember the food (per-serving values) for next time
    const foods = await DB.meta('foods', []);
    const j = foods.findIndex((f) => f.name.toLowerCase() === name.toLowerCase());
    const f = { name, kcal: item.kcal, protein: item.protein, used: (j >= 0 ? foods[j].used || 0 : 0) + 1 };
    if (j >= 0) foods[j] = f; else foods.push(f);
    await DB.setMeta('foods', foods);
    closeTop();
    vibrate(20);
    const t = dayTotals(rec);
    toast(t.meals === MEALS.length && !id ? 'All 3 meals added. Day report is ready below.' : `${name} added`);
    render();
  }

  async function deleteFood(meal, id) {
    const rec = await mealDay(state.mealDate || todayKey());
    const it = (rec[meal] || []).find((x) => x.id === id);
    if (!it) return;
    const before = JSON.parse(JSON.stringify(rec));
    rec[meal] = rec[meal].filter((x) => x.id !== id);
    if (MEALS.every(([m]) => !(rec[m] || []).length)) await DB.del('meals', rec.date); else await DB.put('meals', rec);
    vibrate(20);
    toast(`${it.name} removed`, 5000, { label: 'Undo', fn: async () => { await DB.put('meals', before); render(); } });
    render();
  }

  // Remove a food from the saved list (the chips); meals already logged keep it
  async function forgetFood(i) {
    const f = state.foodPick && state.foodPick[i];
    if (!f) return;
    const foods = (await DB.meta('foods', [])).filter((x) => x.name.toLowerCase() !== f.name.toLowerCase());
    await DB.setMeta('foods', foods);
    state.foodPick = state.foodPick.filter((_, j) => j !== i);
    const wrap = $(`.chip-wrap[data-i="${i}"]`);
    if (wrap) wrap.remove();
    $$('.chip-wrap').forEach((w, j) => { w.dataset.i = j; $$('[data-i]', w).forEach((b) => { b.dataset.i = j; }); });
    if (!state.foodPick.length) { const c = $('.food-chips-box'); if (c) c.remove(); }
    toast(`${f.name} removed from saved foods`, 5000, { label: 'Undo', fn: async () => {
      const list = await DB.meta('foods', []); list.push(f); await DB.setMeta('foods', list);
      toast(`${f.name} is back in saved foods`);
    } });
  }

  async function openTargetsForm() {
    const t = await DB.meta('targets', DEFAULT_TARGETS);
    openFormSheet('Daily target', 'Your bulking plan: 2,750 kcal and 120 g protein. Change it any time.', `
      <form class="form" id="targets-form">
        <label class="in"><span>Calories (kcal)</span><input name="kcal" type="number" inputmode="numeric" min="500" max="10000" required value="${t.kcal}"></label>
        <label class="in"><span>Protein (g)</span><input name="protein" type="number" inputmode="numeric" min="10" max="500" required value="${t.protein}"></label>
        <button class="btn primary block wide" type="submit">Save target</button>
        <button class="btn ghost block wide" type="button" data-action="asheet-close">Cancel</button>
      </form>`);
  }

  // ---------------------------------------------------------------- render: weight
  const fmtKg = (x) => `${(+x).toFixed(1)}`;
  const signed = (x) => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${Math.abs(x).toFixed(1)}`;

  function weightChart(entries, goal) {
    if (entries.length < 2) return '';
    // scale to this month's weights; the target line only shows when it's in range
    const vals = entries.map((e) => e.kg);
    const min = Math.min(...vals) - 0.4; const max = Math.max(...vals) + 0.4;
    const W = 320; const H = 120;
    const [y0, m0] = entries[0].date.split('-').map(Number);
    const days = new Date(y0, m0, 0).getDate();
    const x = (k) => 8 + ((parseKey(k).getDate() - 1) / (days - 1)) * (W - 16);
    const y = (kg) => H - 10 - ((kg - min) / (max - min)) * (H - 20);
    const pts = entries.map((e) => [x(e.date), y(e.kg)]);
    return `<svg class="wchart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="Weight this month">
      ${goal && goal >= min && goal <= max ? `<line class="goal" x1="0" x2="${W}" y1="${y(goal).toFixed(1)}" y2="${y(goal).toFixed(1)}"/>` : ''}
      <path d="M${pts.map((p) => p.map((n) => n.toFixed(1)).join(',')).join('L')}"/>
      ${pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3"/>`).join('')}</svg>`;
  }

  function weightReport(mo, all, goal) {
    const entries = all.filter((e) => e.date.startsWith(mo));
    if (!entries.length) return null;
    const prev = all.filter((e) => e.date < `${mo}-01`).pop() || null;
    let gain = 0; let loss = 0; let same = 0;
    let ref = prev;
    const rows = entries.map((e) => {
      const diff = ref ? e.kg - ref.kg : null;
      if (diff !== null) { if (diff > 0.05) gain++; else if (diff < -0.05) loss++; else same++; }
      ref = e;
      return { ...e, diff };
    });
    const first = entries[0]; const last = entries[entries.length - 1];
    const kgs = entries.map((e) => e.kg);
    return {
      mo, rows, gain, loss, same,
      start: prev ? prev.kg : first.kg, end: last.kg,
      change: last.kg - (prev ? prev.kg : first.kg),
      avg: kgs.reduce((a, b) => a + b, 0) / kgs.length,
      min: Math.min(...kgs), max: Math.max(...kgs),
      logged: entries.length,
      days: new Date(+mo.slice(0, 4), +mo.slice(5), 0).getDate(),
      complete: mo < monthKey(todayKey()),
      goal
    };
  }

  async function renderWeight(v) {
    const today = todayKey();
    const curMo = monthKey(today);
    const mo = state.weightMonth || curMo;
    const all = (await DB.all('weights')).sort((a, b) => (a.date < b.date ? -1 : 1));
    const goalRec = await DB.meta('weightGoal', null);
    const goal = goalRec ? goalRec.kg : null;
    const latest = all[all.length - 1] || null;
    const todays = all.find((e) => e.date === today);
    setHeader('Weight', latest ? `Latest ${fmtKg(latest.kg)} kg · ${fmtDay(parseKey(latest.date))}` : 'Log your weight every morning');

    // goal card
    let goalHtml;
    if (goal) {
      const start = goalRec.start ?? (all[0] ? all[0].kg : null);
      const cur = latest ? latest.kg : start;
      const up = goal >= (start ?? goal);
      const togo = goal - (cur ?? goal);
      const span = Math.abs(goal - (start ?? goal));
      const doneKg = start === null ? 0 : (up ? cur - start : start - cur);
      const pct = span ? Math.max(0, Math.min(100, Math.round((doneKg / span) * 100))) : (Math.abs(togo) < 0.05 ? 100 : 0);
      const reached = up ? cur >= goal : cur <= goal;
      goalHtml = `<div class="hero-main"><div>
          <div class="big-num">${reached ? 'Done' : `${Math.abs(togo).toFixed(1)}`}<small>${reached ? 'target reached' : `kg to ${up ? 'gain' : 'lose'}`}</small></div>
          <div class="muted small">Start ${start !== null ? `${fmtKg(start)} kg` : '—'} → now ${cur !== null ? `${fmtKg(cur)} kg` : '—'} → target <b>${fmtKg(goal)} kg</b></div></div>
          ${bigRing(pct, 'of goal')}</div>
        <div class="muted small">${doneKg > 0 ? `${doneKg.toFixed(1)} kg ${up ? 'gained' : 'lost'} so far.` : 'Log your weight daily to track progress.'}${reached ? ' Set a new target when you’re ready.' : ''}</div>`;
    } else {
      goalHtml = '<div class="muted small" style="margin:8px 0 4px">Set the weight you want to reach. The app counts how far you’ve come and how much is left.</div>';
    }

    const rep = weightReport(mo, all, goal);
    const [y, m] = mo.split('-').map(Number);
    const goodDiff = (diff) => (goal === null || diff === null || Math.abs(diff) < 0.05 ? '' : (goal >= (goalRec.start ?? all[0]?.kg ?? goal)) === diff > 0 ? 'good' : 'bad');
    let report = `<div class="card empty">No weigh-ins in ${MONTHS[m - 1]} ${y}.</div>`;
    if (rep) {
      report = `<section class="card wreport${rep.complete ? ' complete' : ''}">
        <div class="row between"><div><span class="eyebrow ${rep.complete ? 'accent' : ''}">${rep.complete ? 'Month report · complete' : 'Month so far'}</span>
          <h3>${MONTHS[m - 1]} ${y}</h3></div>
          <div class="change ${goodDiff(rep.change)}"><b>${signed(rep.change)}</b><span>kg this month</span></div></div>
        ${weightChart(rep.rows, goal)}
        <div class="stats four">
          <div class="stat"><b>${rep.gain}</b><span>Up days</span></div>
          <div class="stat"><b>${rep.loss}</b><span>Down days</span></div>
          <div class="stat"><b>${rep.same}</b><span>Same</span></div>
          <div class="stat"><b>${rep.logged}</b><span>of ${rep.days} logged</span></div>
        </div>
        <dl class="kv">
          <dt>Start → end</dt><dd>${fmtKg(rep.start)} → ${fmtKg(rep.end)} kg</dd>
          <dt>Average</dt><dd>${fmtKg(rep.avg)} kg</dd>
          <dt>Lowest / highest</dt><dd>${fmtKg(rep.min)} / ${fmtKg(rep.max)} kg</dd>
          ${goal ? `<dt>Target</dt><dd>${fmtKg(goal)} kg · ${Math.abs(goal - rep.end) < 0.05 ? 'reached' : `${Math.abs(goal - rep.end).toFixed(1)} kg to go at month end`}</dd>` : ''}
        </dl>
        ${rep.complete ? `<div class="small" style="margin-top:10px">${rep.change > 0.05 ? `You gained ${rep.change.toFixed(1)} kg in ${MONTHS[m - 1]}.` : rep.change < -0.05 ? `You lost ${(-rep.change).toFixed(1)} kg in ${MONTHS[m - 1]}.` : `Your weight held steady in ${MONTHS[m - 1]}.`} A lean bulk is about +1–2 kg a month.</div>` : `<div class="muted small" style="margin-top:10px">The full report locks in after ${new Date(y, m, 0).getDate()} ${MONTHS[m - 1].slice(0, 3)}.</div>`}
        <div class="section-h" style="margin-top:16px">Daily log</div>
        <div class="hist">${rep.rows.slice().reverse().map((e) => `<div><button class="link plain" data-action="weight-edit" data-date="${e.date}">${fmtDay(parseKey(e.date))}</button>
          <span><b>${fmtKg(e.kg)} kg</b> ${e.diff === null ? '<span class="muted small">first</span>' : `<span class="delta ${goodDiff(e.diff)}">${signed(e.diff)}</span>`}</span></div>`).join('')}</div>
      </section>`;
    }

    // banner: last month's report is ready
    const prevMo = prevMonthKey();
    const prevRep = mo === curMo && parseKey(today).getDate() <= 7 ? weightReport(prevMo, all, goal) : null;
    const banner = prevRep ? `<div class="banner"><b>${monthLabel(prevMo)} report is ready:</b> ${signed(prevRep.change)} kg, ${prevRep.gain} days up, ${prevRep.loss} down. <button class="link" data-action="weight-month" data-month="${prevMo}">Open report</button></div>` : '';

    // all months
    const months = [...new Set(all.map((e) => monthKey(e.date)))].sort().reverse();
    const monthsHtml = months.length > 1 ? `<div class="section-h">All months</div><div class="card hist">${months.map((x) => {
      const r = weightReport(x, all, goal);
      return `<div><button class="link plain" data-action="weight-month" data-month="${x}">${monthLabel(x)}</button><span><span class="delta ${goodDiff(r.change)}">${signed(r.change)} kg</span> <span class="muted small">· ${r.gain}↑ ${r.loss}↓</span></span></div>`;
    }).join('')}</div>` : '';

    v.innerHTML = `
      <section class="hero weight-hero">
        <div class="hero-top"><span class="eyebrow">Target weight${goal ? ` · ${fmtKg(goal)} kg` : ''}</span><button class="btn small ghost" data-action="goal-edit">${goal ? 'Change' : 'Set target'}</button></div>
        ${goalHtml}
      </section>
      <section class="card today-weight">
        ${todays
          ? `<div class="row between"><div><span class="eyebrow">Today</span><div class="big-num sm">${fmtKg(todays.kg)}<small>kg</small></div></div>
              <button class="btn small ghost" data-action="weight-edit" data-date="${today}">Edit</button></div>`
          : `<form class="weigh" id="weigh-form"><label><span class="eyebrow">Today’s weight</span>
              <input name="kg" type="number" inputmode="decimal" min="20" max="300" step="0.1" required placeholder="${latest ? fmtKg(latest.kg) : '0.0'}"></label>
              <span class="unit">kg</span><button class="btn primary" type="submit">Save</button></form>
            <div class="muted small" style="margin-top:8px">Weigh in the morning, after the toilet, before food, same scale.</div>`}
      </section>
      ${banner}
      <div class="cal-nav">
        <button class="icon-btn" data-action="wmonth-prev" aria-label="Previous month">${ICON.left}</button>
        <h2>${MONTHS[m - 1]} ${y}</h2>
        <button class="icon-btn" data-action="wmonth-next" aria-label="Next month" ${mo >= curMo ? 'disabled' : ''}>${ICON.right}</button>
      </div>
      ${report}
      ${monthsHtml}`;
  }

  async function saveWeight(date, kg) {
    if (!(kg >= 20 && kg <= 300)) { toast('Enter your weight in kg'); return false; }
    await DB.put('weights', { date, kg: Math.round(kg * 10) / 10, ts: Date.now() });
    const goal = await DB.meta('weightGoal', null);
    if (goal && goal.start == null) await DB.setMeta('weightGoal', { ...goal, start: Math.round(kg * 10) / 10 });
    vibrate(20);
    toast(`${fmtDay(parseKey(date))}: ${fmtKg(kg)} kg saved`);
    return true;
  }

  async function openWeightForm(date) {
    const rec = await DB.get('weights', date);
    openFormSheet(fmtDay(parseKey(date)), 'Fix a typo or delete this weigh-in.', `
      <form class="form" id="weight-form" data-date="${date}">
        <label class="in wide"><span>Weight (kg)</span><input name="kg" type="number" inputmode="decimal" min="20" max="300" step="0.1" required value="${rec ? rec.kg : ''}"></label>
        <button class="btn primary block wide" type="submit">Save</button>
        ${rec ? `<button class="btn danger block wide" type="button" data-action="weight-del" data-date="${date}">${ICON.trash}Delete</button>` : ''}
        <button class="btn ghost block wide" type="button" data-action="asheet-close">Cancel</button>
      </form>`);
  }

  async function openGoalForm() {
    const g = await DB.meta('weightGoal', null);
    const all = (await DB.all('weights')).sort((a, b) => (a.date < b.date ? -1 : 1));
    const latest = all[all.length - 1];
    openFormSheet('Target weight', 'Progress is counted from your starting weight to the target.', `
      <form class="form" id="goal-form">
        <label class="in"><span>Target (kg)</span><input name="goal" type="number" inputmode="decimal" min="20" max="300" step="0.1" required value="${g ? g.kg : ''}"></label>
        <label class="in"><span>Starting weight (kg)</span><input name="start" type="number" inputmode="decimal" min="20" max="300" step="0.1" placeholder="latest" value="${g && g.start != null ? g.start : latest ? latest.kg : ''}"></label>
        <button class="btn primary block wide" type="submit">Save target</button>
        ${g ? '<button class="btn danger block wide" type="button" data-action="goal-del">Remove target</button>' : ''}
        <button class="btn ghost block wide" type="button" data-action="asheet-close">Cancel</button>
      </form>`);
  }

  // ---------------------------------------------------------------- install
  // Android/desktop Chrome: real install prompt. iPhone/iPad: Apple allows no prompt,
  // so the button shows the exact Share → Add to Home Screen steps for the browser in use.
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  function installBannerHtml() {
    if (!SHOW_INSTALL || isStandalone()) return '';
    try { if (localStorage.getItem('installHidden')) return ''; } catch (_) { /* private mode */ }
    return `<section class="install-banner"><img src="icons/icon-192.png" alt="" width="44" height="44">
      <div class="grow"><b>Install Gym 2.0</b><div class="muted small">Full-screen, works offline</div></div>
      <button class="btn small primary" data-action="install">Install</button>
      <button class="icon-btn" data-action="install-hide" aria-label="Hide">✕</button></section>`;
  }
  async function installApp() {
    if (state.installPrompt) {
      const p = state.installPrompt;
      state.installPrompt = null;
      p.prompt();
      const choice = await p.userChoice.catch(() => null);
      if (choice && choice.outcome === 'accepted') toast('Installing Gym 2.0…');
      render();
      return;
    }
    openInstallGuide();
  }
  function openInstallGuide() {
    const ua = navigator.userAgent;
    const step = (n, html) => `<li class="istep"><span class="istep-n">${n}</span><div>${html}</div></li>`;
    const share = `<span class="ikey">${ICON.share}</span>`;
    const addHome = `<span class="ikey">${ICON.addbox}</span>`;
    let title; let sub; let steps; let extra = '';
    if (isIOS()) {
      title = 'Install on iPhone';
      if (/CriOS|FxiOS|EdgiOS/.test(ua)) {
        sub = /CriOS/.test(ua) ? 'In Chrome on iPhone:' : 'In this browser:';
        steps = step(1, `Tap the Share button ${share} at the top right, next to the address bar.`)
          + step(2, `Scroll down and tap <b>Add to Home Screen</b> ${addHome}`)
          + step(3, 'Tap <b>Add</b>. Gym 2.0 appears on your home screen.');
        extra = `<div class="muted small" style="margin:10px 2px 0">Don't see "Add to Home Screen"? Update iOS, or open this page in Safari.</div>
          <button class="btn ghost block" style="margin-top:8px" data-action="copy-link">Copy link for Safari</button>`;
      } else {
        sub = 'Apple only allows installing from the Share menu:';
        steps = step(1, `Tap the Share button ${share} in the bar at the bottom of the screen.`)
          + step(2, `Scroll down and tap <b>Add to Home Screen</b> ${addHome}`)
          + step(3, 'Tap <b>Add</b> at the top right. Gym 2.0 appears on your home screen.');
      }
    } else {
      title = 'Install the app';
      sub = 'Your browser didn\u2019t offer one-tap install yet, so use its menu:';
      steps = step(1, 'Tap the <b>⋮</b> menu at the top right.')
        + step(2, 'Tap <b>Install app</b> or <b>Add to Home screen</b>.')
        + step(3, 'Tap <b>Install</b>. Gym 2.0 appears on your home screen.');
    }
    openFormSheet(title, sub, `<ol class="isteps">${steps}</ol>${extra}
      <button class="btn primary block" style="margin-top:12px" data-action="asheet-close">Got it</button>`);
  }
  window.addEventListener('appinstalled', () => { state.installPrompt = null; toast('Gym 2.0 installed'); render(); });

  // ---------------------------------------------------------------- render: settings
  const allMediaUrls = () => Object.keys(EX).flatMap((id) => [mediaUrl(id, 'gif'), mediaUrl(id, 'img'), ...(photoUrls(id) || [])]);

  async function mediaStatus() {
    if (!('caches' in window)) return { have: 0, total: allMediaUrls().length };
    const c = await caches.open(MEDIA_CACHE);
    let have = 0;
    for (const u of allMediaUrls()) if (await c.match(u, { ignoreVary: true })) have++;
    return { have, total: allMediaUrls().length };
  }

  async function renderSettings(v) {
    setHeader('Settings', 'Program, offline, photos, backup');
    const ms = await mediaStatus();
    let storage = '';
    if (navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      const persisted = navigator.storage.persisted ? await navigator.storage.persisted() : false;
      storage = `<div class="field"><span>Storage used</span><b>${fmtBytes(e.usage || 0)}</b></div>
        <div class="field"><span>Protected from auto-clear</span><b>${persisted ? 'Yes' : 'Not yet (after first check-in)'}</b></div>`;
    }
    const standalone = isStandalone();
    v.innerHTML = `
      ${SHOW_INSTALL ? `<div class="card">
        <div class="card-title">Install on your phone</div>
        ${standalone ? '<div class="muted small">Installed. You\'re using the app version.</div>'
          : `<div class="muted small" style="margin-bottom:10px">Adds Gym 2.0 to your home screen. It opens full-screen and works offline.</div>
            <button class="btn primary block" data-action="install">${ICON.download}Install app</button>`}
      </div>
      <div class="section-h">Program</div>` : ''}
      ${SHOW_INSTALL ? '' : '<div class="section-h" style="margin-top:4px">Program</div>'}
      <div class="card">
        <div class="field"><span>Track attendance from</span><input type="date" id="set-track" value="${state.settings.trackStart}"></div>
        <div class="field"><span>Split</span><b>Mon–Sat, 6 days</b></div>
        <label class="field"><span>Sundays are rest days<div class="muted small">Not counted as absent</div></span><input type="checkbox" class="switch" id="set-sunday" ${sundayRest() ? 'checked' : ''}></label>
      </div>
      <div class="section-h">Offline photos &amp; animations</div>
      <div class="card">
        <div class="small">With mobile data, photos and animations load from GitHub. Without data, the app uses the copy saved on this phone.</div>
        <div class="field"><span>Saved on this phone</span><b id="media-count">${ms.have}/${ms.total} files</b></div>
        <div class="bar"><span id="media-bar" style="width:${(ms.have / ms.total) * 100}%"></span></div>
        <div class="row" style="margin-top:12px;gap:8px">
          <button class="btn primary" data-action="save-media" ${ms.have === ms.total ? 'disabled' : ''}>${ms.have === ms.total ? 'All saved' : 'Save all (≈ 11 MB)'}</button>
          ${ms.have ? '<button class="btn ghost" data-action="clear-media">Remove</button>' : ''}
        </div>
      </div>
      <div class="section-h">Photos &amp; storage</div>
      <div class="card">
        ${storage}
        <div class="small muted" style="margin-top:8px">Check-in photos are saved only on this phone. Each month can be downloaded as a ZIP from the Attendance tab. ${ERASE_AFTER_DAYS} days after you download a finished month, its full-size photos are erased to free space. Thumbnails and attendance stay.</div>
      </div>
      <div class="section-h">Bring over old attendance</div>
      <div class="card">
        <div class="small muted">Copies check-ins, photos and rest days from the original Gym Routine app on this phone into Gym 2.0. The old app is not changed.</div>
        <button class="btn block" style="margin-top:10px" data-action="import-v1">Import from Gym Routine</button>
      </div>
      <div class="section-h">Backup</div>
      <div class="card">
        <div class="small muted">Exports attendance, set logs, food logs, weigh-ins and settings as a JSON file (without photos). Use it when you change phones.</div>
        <div class="row" style="margin-top:10px;gap:8px">
          <button class="btn" data-action="export">${ICON.download}Export</button>
          <label class="btn ghost" style="cursor:pointer">Import<input type="file" accept="application/json,.json" id="import-file" hidden></label>
        </div>
      </div>
      <div class="section-h">Danger zone</div>
      <div class="card"><button class="btn danger block" data-action="reset">Erase all data on this phone</button></div>
      <div class="section-h">About</div>
      <div class="card small muted">
        Exercise data: <b>hasaneyldrm/exercises-dataset</b> (MIT). Photos: <b>yuhonas/free-exercise-db</b> (public domain). Animations © <b>Gym visual</b> (gymvisual.com), loaded from the dataset repo and not redistributed.<br><br>
        Program: 6 days a week (Mon–Sat), Sunday rest. Shoulders + Legs, Chest + Triceps, Back + Biceps, each twice a week. Progression: when every set reaches the top of the rep range, add weight next session.
      </div>`;
  }

  async function saveMedia() {
    const btn = $('[data-action="save-media"]');
    btn.disabled = true;
    const c = await caches.open(MEDIA_CACHE);
    const urls = allMediaUrls();
    const queue = [...urls];
    let have = 0; let failed = 0;
    const worker = async () => {
      while (queue.length) {
        const u = queue.shift();
        try {
          if (!(await c.match(u, { ignoreVary: true }))) {
            const r = await fetch(u, { mode: 'cors' });
            if (!r.ok) throw new Error(r.status);
            await c.put(u, r);
          }
          have++;
        } catch (_) { failed++; }
        const count = $('#media-count');
        if (count) {
          count.textContent = `${have}/${urls.length} files`;
          $('#media-bar').style.width = `${(have / urls.length) * 100}%`;
          btn.textContent = `Saving… ${have}/${urls.length}`;
        }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    toast(failed ? `Saved ${have}. ${failed} failed (check your connection).` : 'All photos and animations saved for offline use');
    render();
  }

  async function exportData() {
    const data = {
      app: 'gym-2.0', version: 1, exportedAt: new Date().toISOString(),
      settings: state.settings,
      checkins: [...state.checkins.values()].map(({ thumb, ...r }) => r),
      restDays: [...state.restDays],
      notRest: [...state.notRest],
      logs: await DB.all('logs'),
      meals: await DB.all('meals'),
      weights: await DB.all('weights'),
      foods: await DB.meta('foods', []),
      targets: await DB.meta('targets', DEFAULT_TARGETS),
      weightGoal: await DB.meta('weightGoal', null)
    };
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gym-2.0-backup-${todayKey()}.json`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
  }

  async function addRestDays(list) {
    list.forEach((k) => state.restDays.add(k));
    await DB.setMeta('restDays', [...state.restDays].sort());
  }

  async function importData(file) {
    try {
      const data = JSON.parse(await file.text());
      const v2 = data.app === 'gym-2.0';
      if (!v2 && data.app !== 'gym-routine') throw new Error('not a backup');
      let n = 0;
      for (const r of data.checkins || []) {
        if (!state.checkins.has(r.date)) {
          const rec = { ...r, thumb: null, hasFull: false, fullBytes: 0 };
          await DB.put('checkins', rec);
          state.checkins.set(r.date, rec);
          n++;
        }
      }
      if (Array.isArray(data.restDays)) await addRestDays(data.restDays);
      if (v2) {
        for (const l of data.logs || []) await DB.put('logs', l);
        for (const m of data.meals || []) await DB.put('meals', m);
        for (const w of data.weights || []) await DB.put('weights', w);
        if (Array.isArray(data.foods)) await DB.setMeta('foods', data.foods);
        if (data.targets) await DB.setMeta('targets', data.targets);
        if (data.weightGoal) await DB.setMeta('weightGoal', data.weightGoal);
        if (Array.isArray(data.notRest)) { data.notRest.forEach((k) => state.notRest.add(k)); await DB.setMeta('notRest', [...state.notRest].sort()); }
        if (data.settings) { state.settings = { ...state.settings, ...data.settings }; await DB.setMeta('settings', state.settings); }
        toast(`Imported ${data.logs?.length || 0} logs, ${n} check-ins, ${data.meals?.length || 0} food days, ${data.weights?.length || 0} weigh-ins`);
      } else {
        toast(`Imported ${n} check-ins from Gym Routine`);
      }
      render();
    } catch (e) {
      toast('That file is not a Gym 2.0 or Gym Routine backup');
    }
  }

  // Copy attendance from the original app's database on this phone (read-only)
  async function importV1() {
    let old;
    try { old = await DB.readLegacy(); } catch (_) { old = null; }
    if (!old || !old.checkins.length) { toast('No Gym Routine attendance found on this phone'); return; }
    const photos = new Map(old.photos.map((p) => [p.date, p.blob]));
    let n = 0;
    for (const r of old.checkins) {
      if (state.checkins.has(r.date)) continue;
      const full = photos.get(r.date);
      const rec = { date: r.date, ts: r.ts, month: r.month || monthKey(r.date), thumb: r.thumb || null, hasFull: !!full, fullBytes: full ? full.size : 0 };
      if (full) await DB.put('photos', { date: r.date, blob: full });
      await DB.put('checkins', rec);
      state.checkins.set(r.date, rec);
      n++;
    }
    const meta = new Map(old.meta.map((m) => [m.k, m.v]));
    if (Array.isArray(meta.get('restDays'))) await addRestDays(meta.get('restDays'));
    const s = meta.get('settings');
    if (s && s.trackStart && s.trackStart < state.settings.trackStart) {
      state.settings.trackStart = s.trackStart;
      await DB.setMeta('settings', state.settings);
    }
    toast(n ? `Copied ${n} check-in${n === 1 ? '' : 's'} from Gym Routine` : 'Everything was already copied');
    render();
  }

  // ---------------------------------------------------------------- events
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-action], [data-tab]');
    if (!t) return;
    if (t.classList.contains('tab')) { go(t.dataset.tab); return; }
    const a = t.dataset.action;
    switch (a) {
      case 'goto': go(t.dataset.tab); break;
      case 'checkin': if (t.dataset.asheet) closeTop(); setTimeout(openCamera, t.dataset.asheet ? 120 : 0); break;
      case 'session': state.session = t.dataset.s; state.sessionPicked = true; render(); break;
      case 'media-mode': {
        setMediaMode(t.dataset.mode);
        const slot = $('#media-slot');
        if (slot && sheetCtx) { slot.innerHTML = mediaHtml(sheetCtx.exId); bindMediaErrors(slot); }
        break;
      }
      case 'media-pause': t.classList.toggle('paused'); break;
      case 'studio': openEditStudio(t.dataset.month, !state.sheetStudio && $('#sheet').hidden); break;
      case 'tpl': state.studioTpl = t.dataset.t; $$('.tpl').forEach((x) => x.classList.toggle('active', x === t)); break;
      case 'edit-create': {
        const song = $('input[name="music"]:checked') && $('input[name="music"]:checked').value === 'song' ? state.studioSong : null;
        if ($('input[name="music"]:checked') && $('input[name="music"]:checked').value === 'song' && !song) { toast('Pick a song file first'); $('#song-file').click(); break; }
        startEditJob({ month: t.dataset.month, template: state.studioTpl, song });
        break;
      }
      case 'edit-go': {
        const job = state.editJob;
        if (job && job.ac) { await job.ac.resume(); refreshEditViews(); runEditJob(job, job.ac); }
        break;
      }
      case 'edit-download': downloadEdit(t.dataset.month); break;
      case 'edit-share': shareEdit(t.dataset.month); break;
      case 'edit-hide': await DB.setMeta(`editHidden:${t.dataset.month}`, true); toast('Hidden. Find it anytime in Attendance → Photos.'); render(); break;
      case 'edit-delete':
        if (await askConfirm('Delete this gym edit video?', '', 'Delete video')) { await DB.del('edits', t.dataset.month); dropEditUrl(t.dataset.month); openEditStudio(t.dataset.month, false); }
        break;
      case 'att-view': state.attView = t.dataset.view; window.scrollTo(0, 0); render(); break;
      case 'photo': openPhoto(t.dataset.date); break;
      case 'asheet-close': closeTop(); break;
      case 'confirm-yes': confirmAnswer = true; closeTop(); break;
      case 'confirm-no': closeTop(); break;
      case 'toast-act': { const act = toastAction; toastAction = null; $('#toast').classList.remove('show'); if (act) act.fn(); break; }
      case 'food-forget': forgetFood(+t.dataset.i); break;
      case 'rest-on': {
        const k = t.dataset.date;
        if (t.dataset.asheet) closeTop();
        await setRest(k, true);
        vibrate(20);
        toast(`${fmtDay(parseKey(k))} marked as a rest day`);
        render();
        break;
      }
      case 'rest-off': {
        const k = t.dataset.date;
        if (t.dataset.asheet) closeTop();
        await setRest(k, false);
        toast('Rest day removed');
        render();
        break;
      }
      case 'photo-save': savePhoto(t.dataset.date); break;
      case 'viewer-prev': stepPhoto(1); break;
      case 'viewer-next': stepPhoto(-1); break;
      case 'open-ex': {
        const S = P.days[state.session];
        const item = S.items.find((i) => i.n === t.dataset.slot);
        openExercise(t.dataset.ex, { sessionKey: state.session, item });
        break;
      }
      case 'info-ex': openExercise(t.dataset.ex, null); break;
      case 'swap': openExercise(t.dataset.ex, sheetCtx && sheetCtx.ctx, false); break;
      case 'sheet-close': closeTop(); break;
      case 'set-done': toggleSet(t.closest('.set')); break;
      case 'del-log': deleteLog(t.dataset.key); break;
      case 'add-set': {
        const list = $('#sets');
        const last = list.lastElementChild;
        const clone = last.cloneNode(true);
        const i = list.children.length;
        clone.dataset.i = i;
        clone.classList.remove('done');
        $('label', clone).textContent = `Set ${i + 1}`;
        $$('input', clone)[0].value = $$('input', last)[0].value;
        $$('input', clone)[1].value = '';
        list.appendChild(clone);
        break;
      }
      case 'timer-add': timer.end += 30000; timer.total += 30000; timer.fired = false; $('#timer').classList.remove('over'); tick(); break;
      case 'timer-skip': $('#timer').hidden = true; clearTimeout(timer.raf); break;
      case 'cam-close': closeTop(); break;
      case 'cam-flip': flipCamera(); break;
      case 'cam-shoot': shoot(); break;
      case 'cam-retake': showLive(); startStream(); break;
      case 'cam-use': t.disabled = true; await useCheckin(); t.disabled = false; break;
      case 'cal-prev': state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() - 1, 1); render(); break;
      case 'cal-next': state.calMonth = new Date(state.calMonth.getFullYear(), state.calMonth.getMonth() + 1, 1); render(); break;
      case 'day': openDay(t.dataset.date); break;
      case 'viewer-close': closeTop(); break;
      case 'delete-checkin': deleteCheckin(t.dataset.date); break;
      case 'zip': downloadMonth(t.dataset.month); break;
      case 'erase':
        if (await askConfirm(`Erase full-size ${monthLabel(t.dataset.month)} photos?`, 'Make sure the ZIP is saved. Thumbnails and attendance stay.', 'Erase photos')) eraseMonth(t.dataset.month);
        break;
      case 'save-media': saveMedia(); break;
      case 'clear-media': await caches.delete(MEDIA_CACHE); toast('Offline copy removed'); render(); break;
      case 'install': installApp(); break;
      case 'install-hide':
        try { localStorage.setItem('installHidden', '1'); } catch (_) { /* private mode */ }
        render(); break;
      case 'copy-link':
        try { await navigator.clipboard.writeText(location.origin + location.pathname); toast('Link copied. Paste it in Safari.'); } catch (_) { toast(location.origin + location.pathname); }
        break;
      case 'meal-prev': state.mealDate = keyOf(addDays(parseKey(state.mealDate || todayKey()), -1)); render(); break;
      case 'meal-next': {
        const n = keyOf(addDays(parseKey(state.mealDate || todayKey()), 1));
        state.mealDate = n >= todayKey() ? null : n; render(); break;
      }
      case 'meal-date': state.mealDate = t.dataset.date; window.scrollTo(0, 0); render(); break;
      case 'food-add': openFoodForm(t.dataset.meal); break;
      case 'food-edit': openFoodForm(t.dataset.meal, t.dataset.id); break;
      case 'food-del': deleteFood(t.dataset.meal, t.dataset.id); break;
      case 'food-pick': {
        const f = state.foodPick[+t.dataset.i]; const form = $('#food-form');
        if (f && form) { form.name.value = f.name; form.kcal.value = f.kcal; form.protein.value = f.protein; form.qty.value = 1; updateFoodTotal(); form.qty.focus(); form.qty.select(); }
        break;
      }
      case 'targets-edit': openTargetsForm(); break;
      case 'goal-edit': openGoalForm(); break;
      case 'goal-del':
        if (await askConfirm('Remove your target weight?', 'Your weigh-ins are kept.', 'Remove target')) { await DB.del('meta', 'weightGoal'); toast('Target removed'); render(); }
        break;
      case 'weight-edit': openWeightForm(t.dataset.date); break;
      case 'weight-del':
        if (await askConfirm(`Delete ${fmtDay(parseKey(t.dataset.date))} weigh-in?`, '', 'Delete weigh-in')) { await DB.del('weights', t.dataset.date); toast('Weigh-in deleted'); render(); }
        break;
      case 'weight-month': state.weightMonth = t.dataset.month; window.scrollTo(0, 0); render(); break;
      case 'wmonth-prev': case 'wmonth-next': {
        const [yy, mm] = (state.weightMonth || monthKey(todayKey())).split('-').map(Number);
        const nm = keyOf(new Date(yy, mm - 1 + (a === 'wmonth-next' ? 1 : -1), 1)).slice(0, 7);
        state.weightMonth = nm >= monthKey(todayKey()) ? null : nm; render(); break;
      }
      case 'export': exportData(); break;
      case 'import-v1': importV1(); break;
      case 'reset':
        if (await askConfirm('Erase everything?', 'All check-ins, photos, set logs, food logs, weigh-ins and settings in Gym 2.0 on this phone. This cannot be undone. Download your photo ZIPs first.', 'Erase all data')) {
          for (const s of ['checkins', 'photos', 'logs', 'meta', 'edits', 'meals', 'weights']) await DB.clear(s);
          location.reload();
        }
        break;
      default: break;
    }
  });

  $('#top-checkin').addEventListener('click', () => {
    if (state.checkins.has(todayKey())) go('calendar');
    else openCamera();
  });

  document.addEventListener('change', async (e) => {
    if (e.target.id === 'set-sunday') {
      state.settings.sundayRest = e.target.checked; await DB.setMeta('settings', state.settings); toast(e.target.checked ? 'Sundays count as rest days' : 'Sundays count as normal days'); render();
    } else if (e.target.id === 'set-track' && e.target.value) {
      state.settings.trackStart = e.target.value; await DB.setMeta('settings', state.settings); toast('Attendance start updated'); render();
    } else if (e.target.id === 'song-file' && e.target.files[0]) {
      state.studioSong = e.target.files[0];
      const n = $('#song-name'); if (n) n.textContent = state.studioSong.name;
      const r = $('input[name="music"][value="song"]'); if (r) r.checked = true;
    } else if (e.target.name === 'music' && e.target.value === 'song' && !state.studioSong) {
      $('#song-file').click();
    } else if (e.target.id === 'import-file' && e.target.files[0]) {
      const file = e.target.files[0];
      e.target.value = ''; // so picking the same file again still triggers an import
      importData(file);
    }
  });

  document.addEventListener('submit', async (e) => {
    const f = e.target;
    e.preventDefault();
    if (f.id === 'food-form') saveFood(f);
    else if (f.id === 'targets-form') {
      await DB.setMeta('targets', { kcal: +f.kcal.value, protein: +f.protein.value });
      closeTop(); toast('Daily target saved'); render();
    } else if (f.id === 'weigh-form') {
      if (await saveWeight(todayKey(), +f.kg.value)) render();
    } else if (f.id === 'weight-form') {
      if (await saveWeight(f.dataset.date, +f.kg.value)) { closeTop(); render(); }
    } else if (f.id === 'goal-form') {
      const kg = +f.goal.value; const start = f.start.value === '' ? null : +f.start.value;
      if (!(kg >= 20 && kg <= 300)) { toast('Enter the target in kg'); return; }
      await DB.setMeta('weightGoal', { kg, start, setAt: todayKey() });
      closeTop(); toast(`Target set: ${fmtKg(kg)} kg`); render();
    }
  });
  document.addEventListener('input', (e) => { if (e.target.closest('#food-form')) updateFoodTotal(); });

  // Save a set with the keyboard's "go"/enter key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest && e.target.closest('.set')) {
      e.preventDefault();
      saveSet(e.target.closest('.set'));
    }
  });

  // Swipe between photos in the viewer
  let touchX = null;
  $('#viewer').addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  $('#viewer').addEventListener('touchend', (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    touchX = null;
    if (Math.abs(dx) > 50) stepPhoto(dx > 0 ? 1 : -1); // swipe right = older, left = newer
  });
  document.addEventListener('keydown', (e) => {
    if ($('#viewer').hidden) return;
    if (e.key === 'ArrowLeft') stepPhoto(1);
    if (e.key === 'ArrowRight') stepPhoto(-1);
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    state.installPrompt = e;
    if (state.tab === 'settings' || state.tab === 'today') render();
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (!$('#timer').hidden) tick();
      if (state.tab === 'calendar' || state.tab === 'today') render(); // date may have changed
    }
  });

  // ---------------------------------------------------------------- boot
  async function boot() {
    let s = await DB.meta('settings');
    if (!s) {
      const t = todayKey();
      s = { trackStart: t, sundayRest: true };
      await DB.setMeta('settings', s);
    }
    state.settings = await DB.meta('settings', s);
    for (const r of await DB.all('checkins')) state.checkins.set(r.date, r);
    (await DB.meta('restDays', [])).forEach((k) => state.restDays.add(k));
    (await DB.meta('notRest', [])).forEach((k) => state.notRest.add(k));
    await autoCleanup();
    await render();
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'checkin') {
      history.replaceState(null, '', location.pathname);
      if (!state.checkins.has(todayKey())) openCamera();
    }
    const devNoSw = location.hostname === 'localhost' && !params.has('sw');
    if ('serviceWorker' in navigator && location.protocol !== 'file:' && !devNoSw) {
      const hadController = !!navigator.serviceWorker.controller;
      let reloading = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // a new version was installed: reload once so the update shows immediately
        if (hadController && !reloading && $('#camera').hidden) { reloading = true; location.reload(); }
      });
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
        .then((registration) => registration.update())
        .catch(() => {});
    }
  }
  boot().catch((err) => {
    console.error(err);
    $('#view').innerHTML = `<div class="card">Something went wrong while loading: ${esc(err.message || err)}</div>`;
  });
})();
