// All the views: checklist, roadmap, missables, next-up planner, settings,
// and the guide detail pane. Built with plain DOM calls so trophy text is
// never pasted into HTML.
import { stateToJson, stateFromJson } from './store.js';

export const STAGES = [
  {
    n: 1,
    title: 'Story',
    blurb:
      'Play the story in order: the opening mission, Chapters 1–4 and the final mission, plus the named story missions.',
  },
  {
    n: 2,
    title: 'Side characters',
    blurb:
      'Finish the final missions for Andy, Kenton, Billy, Randy and Tyrone, the stranger strands, and Bret’s hunt.',
  },
  {
    n: 3,
    title: 'Activities & skills',
    blurb:
      'Races, stunts, the shooting range, fishing, arcade, meditation, cards — everything you do while playing.',
  },
  {
    n: 4,
    title: 'Collectibles & exploration',
    blurb:
      'Vehicles, card sets, garages, the Scooter Bros app, exploring all 52 areas of Leonida, and each gang’s operations.',
  },
  {
    n: 5,
    title: 'Money & cleanup',
    blurb:
      'Launder the marked bills, spend across the shops, reach 100% completion — then the platinum pops.',
  },
];

const KIND_LABELS = { story: 'Story', activities: 'Activities', collectibles: 'Collectibles' };

export function isHidden(trophy, state) {
  return trophy.hidden && state.spoilers && !state.earned.includes(trophy.id);
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function gradeDot(grade) {
  const dot = el('span', 'dot ' + grade);
  dot.title = grade;
  return dot;
}

function chipsFor(trophy, state) {
  const wrap = el('div', 'chips');
  const grade = el('span', 'chip');
  grade.append(gradeDot(trophy.grade), document.createTextNode(trophy.grade));
  wrap.append(grade);
  wrap.append(el('span', 'chip', KIND_LABELS[trophy.kind] || trophy.kind));
  if (trophy.psnTarget !== null && trophy.psnTarget !== undefined) {
    const label =
      trophy.psnTarget >= 1000
        ? 'PSN counts to ' + trophy.psnTarget.toLocaleString('en-US')
        : 'PSN counts to ' + trophy.psnTarget;
    wrap.append(el('span', 'chip', label));
  }
  if (trophy.missable) {
    wrap.append(el('span', 'chip missable', 'Missable'));
  }
  if (state.notes[trophy.id]) {
    const note = el('span', 'chip', '✎ note');
    note.title = 'You wrote a note on this trophy';
    wrap.append(note);
  }
  return wrap;
}

function guideParts(trophy) {
  const marker = 'Sources:';
  const idx = trophy.guide.indexOf(marker);
  if (idx === -1) return { advice: trophy.guide, sources: '' };
  return {
    advice: trophy.guide.slice(0, idx).trim(),
    sources: trophy.guide.slice(idx).trim(),
  };
}

// One checklist row. `app` carries the data, the state, and the actions.
export function trophyRow(trophy, app) {
  const { state } = app;
  const earned = state.earned.includes(trophy.id);
  const hidden = isHidden(trophy, state);
  const row = el('article', 'trophy' + (earned ? ' earned' : '') + (hidden ? ' hidden-row' : ''));
  row.dataset.id = String(trophy.id);

  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned;
  box.setAttribute('aria-label', 'Mark ' + (hidden ? 'hidden story trophy' : trophy.name) + ' earned');
  box.addEventListener('change', () => app.toggleEarned(trophy.id));
  row.append(box);

  const body = el('div', 'body');
  body.append(el('div', 't-name', hidden ? 'Hidden story trophy' : trophy.name));
  body.append(
    el(
      'div',
      't-desc',
      hidden ? 'A story trophy — earn it to reveal its name.' : trophy.description,
    ),
  );
  if (!hidden) {
    const { advice } = guideParts(trophy);
    body.append(el('div', 't-guide', advice));
    body.append(chipsFor(trophy, state));
  } else {
    const wrap = el('div', 'chips');
    wrap.append(el('span', 'chip', 'Story'));
    wrap.append(el('span', 'chip missable', 'Hidden until earned'));
    body.append(wrap);
  }
  row.append(body);

  const btn = el('button', 'guide-btn', 'Guide');
  btn.type = 'button';
  btn.addEventListener('click', () => app.openTrophy(trophy.id));
  row.append(btn);
  return row;
}

function viewHead(title, sub) {
  const head = el('div', 'view-head');
  head.append(el('h2', null, title));
  if (sub) head.append(el('p', null, sub));
  return head;
}

function filteredTrophies(app) {
  const { trophies, state, filters } = app;
  const q = filters.q.trim().toLowerCase();
  return trophies.filter((t) => {
    if (filters.kind !== 'all' && t.kind !== filters.kind) return false;
    if (filters.grade !== 'all' && t.grade !== filters.grade) return false;
    if (filters.earnedOnly && !state.earned.includes(t.id)) return false;
    if (q) {
      const hidden = isHidden(t, state);
      const hay = hidden
        ? 'hidden story trophy'
        : (t.name + ' ' + t.description + ' ' + t.guide).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function renderChecklist(root, app) {
  root.replaceChildren();
  root.append(
    viewHead(
      'Checklist',
      'All 55 official trophies. Tick one off when you earn it — your progress is saved in this browser.',
    ),
  );
  const list = filteredTrophies(app);
  const { state, trophies } = app;
  root.append(
    el(
      'p',
      'count-line',
      `Showing ${list.length} of ${trophies.length} trophies · ${state.earned.length} earned`,
    ),
  );
  if (list.length === 0) {
    root.append(el('p', 'empty', 'Nothing matches those filters. Clear the search or widen the filters.'));
    return;
  }
  for (const t of list) root.append(trophyRow(t, app));
}

export function renderRoadmap(root, app) {
  const { trophies, state } = app;
  root.replaceChildren();
  root.append(
    viewHead(
      'Roadmap to the platinum',
      'Five stages, in the order to play them. Stage 1 is the story; the platinum pops at the end of stage 5.',
    ),
  );
  for (const stage of STAGES) {
    const members = trophies.filter((t) => t.roadmap === stage.n);
    const done = members.filter((t) => state.earned.includes(t.id)).length;
    const card = el('section', 'stage');
    const head = el('div', 'stage-head');
    const titleBox = el('div');
    titleBox.append(el('h3', null, `Stage ${stage.n} — ${stage.title}`));
    titleBox.append(el('p', null, stage.blurb));
    head.append(titleBox);
    head.append(el('b', null, `${done} / ${members.length}`));
    card.append(head);
    const bar = el('div', 'bar');
    const fill = el('div', 'bar-fill');
    fill.style.width = members.length ? `${Math.round((done / members.length) * 100)}%` : '0%';
    bar.append(fill);
    card.append(bar);
    const names = members.map((t) =>
      isHidden(t, state) ? 'Hidden story trophy' : t.name,
    );
    const listLine = el('p', 'stage-list');
    listLine.append(document.createTextNode('Trophies: '));
    names.forEach((name, i) => {
      const t = members[i];
      const span = el('span');
      if (state.earned.includes(t.id)) {
        const s = el('s');
        s.textContent = name;
        span.append(s);
      } else {
        span.textContent = name;
      }
      listLine.append(span);
      if (i < names.length - 1) listLine.append(document.createTextNode(' · '));
    });
    card.append(listLine);
    root.append(card);
  }
}

export function renderMissables(root, app) {
  const { trophies, state } = app;
  root.replaceChildren();
  root.append(
    viewHead(
      'Missables',
      'Trophies tied to a story mission or chapter. The official list does not say whether story missions can be replayed, so this guide treats every one as a one-shot: finish it while the mission is open.',
    ),
  );
  const missable = trophies.filter((t) => t.missable);
  const done = missable.filter((t) => state.earned.includes(t.id)).length;
  root.append(
    el('p', 'count-line', `${missable.length} flagged missable · ${done} earned · ${missable.length - done} still open`),
  );
  for (const t of missable) {
    const row = trophyRow(t, app);
    if (t.missableWhy) {
      const note = el('div', 't-guide', 'Why it can be missed: ' + t.missableWhy);
      row.querySelector('.body').append(note);
    }
    root.append(row);
  }
  root.append(
    el(
      'p',
      'count-line',
      'Everything else in the list can be earned after the story: activities, collectibles and money trophies stay open.',
    ),
  );
}

export function renderNext(root, app) {
  const { trophies, state } = app;
  root.replaceChildren();
  root.append(
    viewHead(
      'Next up',
      'The next three trophies to chase, in roadmap order — earliest unfinished stage first.',
    ),
  );
  const queue = trophies
    .filter((t) => !state.earned.includes(t.id))
    .sort((a, b) => a.roadmap - b.roadmap || a.id - b.id);
  if (queue.length === 0) {
    root.append(
      el('p', 'empty', 'That is all 55 — the platinum should have popped. Congratulations, Leonida Legend.'),
    );
    return;
  }
  const top = queue.slice(0, 3);
  top.forEach((t, i) => {
    const card = el('article', 'next-card');
    const hidden = isHidden(t, state);
    card.append(el('h3', null, `${i + 1}. ${hidden ? 'Hidden story trophy' : t.name}`));
    card.append(
      el(
        'div',
        'why',
        `Stage ${t.roadmap} · ${STAGES[t.roadmap - 1].title} · ${KIND_LABELS[t.kind] || t.kind} · ${t.grade}` +
          (hidden ? ' — a story trophy; earn it to reveal its name.' : ' — ' + t.description),
      ),
    );
    const btn = el('button', 'guide-btn', 'Open guide');
    btn.type = 'button';
    btn.style.marginTop = '10px';
    btn.addEventListener('click', () => app.openTrophy(t.id));
    card.append(btn);
    root.append(card);
  });
  root.append(el('h3', null, 'Then, in order'));
  const rest = queue.slice(3);
  const line = el('p', 'stage-list');
  rest.forEach((t, i) => {
    const span = el('span');
    span.textContent = isHidden(t, state) ? 'Hidden story trophy' : t.name;
    line.append(span);
    if (i < rest.length - 1) line.append(document.createTextNode(' · '));
  });
  root.append(line);
}

export function renderSettings(root, app) {
  const { state } = app;
  root.replaceChildren();
  root.append(viewHead('Settings', 'Spoilers, your saved progress, and the fine print.'));
  const spoilerCard = el('section', 'settings-card');
  const label = el('label');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = state.spoilers;
  box.addEventListener('change', () => app.setSpoilers(box.checked));
  label.append(box, document.createTextNode('Hide story spoilers'));
  spoilerCard.append(label);
  spoilerCard.append(
    el(
      'p',
      null,
      'When on, story trophies you have not earned yet show as “Hidden story trophy” — their names and descriptions stay hidden until you earn them.',
    ),
  );
  root.append(spoilerCard);

  const dataCard = el('section', 'settings-card');
  dataCard.append(el('h3', null, 'Your progress'));
  dataCard.append(
    el(
      'p',
      null,
      `${state.earned.length} of 55 trophies earned. Progress and notes are saved in this browser only — nothing leaves your device.`,
    ),
  );
  const exportBtn = el('button', 'btn', 'Export progress (JSON)');
  exportBtn.type = 'button';
  exportBtn.addEventListener('click', () => app.exportProgress());
  const importLabel = el('label', 'btn import-label', 'Import progress');
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json';
  importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await app.importProgress(file);
  });
  importLabel.append(importInput);
  const resetBtn = el('button', 'btn danger', 'Reset all progress');
  resetBtn.type = 'button';
  resetBtn.addEventListener('click', () => app.resetProgress());
  dataCard.append(exportBtn, importLabel, resetBtn);
  root.append(dataCard);

  const aboutCard = el('section', 'settings-card');
  aboutCard.append(el('h3', null, 'About this guide'));
  aboutCard.append(
    el(
      'p',
      null,
      'Sunset Platinum covers the official Grand Theft Auto VI trophy list for PlayStation 5: 55 trophies — 1 platinum, 2 gold, 6 silver, 46 bronze. Names, descriptions and grades come from the official list as published on Exophase; PSN progress counts come from PSNProfiles. Every guide is written in our own words from the official description and is not yet checked in the game. The app is a static offline page: it loads no network resources, no fonts, no images, and no Rockstar artwork.',
    ),
  );
  root.append(aboutCard);
}

export function renderDetail(root, app, trophy) {
  const { state } = app;
  root.hidden = false;
  root.replaceChildren();
  const close = el('button', 'close', 'Close ×');
  close.type = 'button';
  close.addEventListener('click', () => app.closeTrophy());
  root.append(close);

  const hidden = isHidden(trophy, state);
  const earned = state.earned.includes(trophy.id);
  root.append(el('h2', null, hidden ? 'Hidden story trophy' : trophy.name));
  root.append(
    el(
      'p',
      'meta',
      hidden
        ? 'Story · grade hidden until earned'
        : `${trophy.grade} · ${KIND_LABELS[trophy.kind] || trophy.kind} · Roadmap stage ${trophy.roadmap}`,
    ),
  );
  if (!hidden) {
    root.append(el('p', null, trophy.description));
    root.append(chipsFor(trophy, state));
    if (trophy.missable && trophy.missableWhy) {
      root.append(el('div', 'missable-note', '⚠ Missable — ' + trophy.missableWhy));
    }
    const { advice, sources } = guideParts(trophy);
    root.append(el('p', 'guide-text', advice));
    if (sources) root.append(el('p', 'sources', sources));
  } else {
    root.append(
      el(
        'p',
        null,
        'This is a story trophy and spoilers are on, so its name, description and guide stay hidden until you earn it. Mark it earned below to reveal it, or turn spoilers off in Settings.',
      ),
    );
  }

  const earnedBtn = el(
    'button',
    'earned-btn' + (earned ? ' earned' : ''),
    earned ? '✓ Earned — tap to undo' : 'Mark earned',
  );
  earnedBtn.type = 'button';
  earnedBtn.addEventListener('click', () => app.toggleEarned(trophy.id));
  root.append(earnedBtn);

  root.append(el('h3', null, 'Your note'));
  const note = document.createElement('textarea');
  note.placeholder = 'Where did you find it? What worked? (saved in this browser)';
  note.value = state.notes[trophy.id] || '';
  note.setAttribute('aria-label', 'Note for this trophy');
  note.addEventListener('input', () => app.setNote(trophy.id, note.value));
  root.append(note);

  const pager = el('div', 'pager');
  const prev = el('button', null, '← Previous');
  prev.type = 'button';
  prev.addEventListener('click', () => app.openTrophy(trophy.id - 1));
  const next = el('button', null, 'Next →');
  next.type = 'button';
  next.addEventListener('click', () => app.openTrophy(trophy.id + 1));
  if (trophy.id <= 1) prev.disabled = true;
  if (trophy.id >= 55) next.disabled = true;
  pager.append(prev, next);
  root.append(pager);
}

export function hideDetail(root) {
  root.hidden = true;
  root.replaceChildren();
}

export function download(filename, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export { stateToJson, stateFromJson };
