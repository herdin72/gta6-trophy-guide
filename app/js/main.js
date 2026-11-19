// Sunset Platinum — boot, hash routing, and the wiring between the controls,
// the store and the views. One page, no build step, no network at runtime:
// the only thing fetched is this app's own data/trophies.json.
import { loadState, saveState, stateToJson, stateFromJson } from './store.js';
import {
  renderChecklist,
  renderRoadmap,
  renderMissables,
  renderNext,
  renderSettings,
  renderDetail,
  hideDetail,
  download,
} from './views.js';

const viewEl = document.getElementById('view');
const detailEl = document.getElementById('detail');
const controlsEl = document.getElementById('controls');
const searchEl = document.getElementById('search');
const kindEl = document.getElementById('kind');
const gradeEl = document.getElementById('grade');
const spoilersEl = document.getElementById('spoilers');
const earnedOnlyEl = document.getElementById('earned-only');

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

const app = {
  trophies,
  state: loadState(),
  filters: { q: '', kind: 'all', grade: 'all', earnedOnly: false },
  currentTrophy: null,
  route: '',

  toggleEarned(id) {
    const earned = this.state.earned;
    const at = earned.indexOf(id);
    if (at === -1) earned.push(id);
    else earned.splice(at, 1);
    saveState(this.state);
    this.render();
  },

  setNote(id, text) {
    if (text.trim()) this.state.notes[id] = text;
    else delete this.state.notes[id];
    saveState(this.state);
    this.renderHeader();
  },

  setSpoilers(on) {
    this.state.spoilers = on;
    spoilersEl.checked = on;
    saveState(this.state);
    this.render();
  },

  openTrophy(id) {
    const trophy = trophies.find((t) => t.id === id);
    if (!trophy) return;
    this.currentTrophy = trophy;
    location.hash = '#/trophy/' + id;
  },

  closeTrophy() {
    this.currentTrophy = null;
    location.hash = '#/' + (this.route || '');
  },

  exportProgress() {
    download('sunset-platinum-progress.json', stateToJson(this.state));
  },

  async importProgress(file) {
    try {
      this.state = stateFromJson(await file.text());
      spoilersEl.checked = this.state.spoilers;
      saveState(this.state);
      this.render();
    } catch {
      alert('That file is not a Sunset Platinum progress export.');
    }
  },

  resetProgress() {
    if (!confirm('Clear every tick and note? This cannot be undone.')) return;
    this.state.earned = [];
    this.state.notes = {};
    saveState(this.state);
    this.render();
  },

  renderHeader() {
    const earned = this.state.earned.length;
    document.getElementById('earned-count').textContent = String(earned);
    document.getElementById('bar-fill').style.width =
      Math.round((earned / trophies.length) * 100) + '%';
    const counts = ['platinum', 'gold', 'silver', 'bronze']
      .map((g) => {
        const total = trophies.filter((t) => t.grade === g).length;
        const done = trophies.filter(
          (t) => t.grade === g && this.state.earned.includes(t.id),
        ).length;
        return `${g} ${done}/${total}`;
      })
      .join(' · ');
    document.getElementById('grade-counts').textContent = counts;
  },

  render() {
    this.renderHeader();
    document
      .querySelectorAll('.tab')
      .forEach((tab) =>
        tab.classList.toggle('active', tab.dataset.route === this.route),
      );
    // The search and filters belong to the list views; the other views hide them.
    controlsEl.style.display =
      this.route === '' || this.route === 'missables' ? '' : 'none';
    if (this.route === 'roadmap') renderRoadmap(viewEl, this);
    else if (this.route === 'missables') renderMissables(viewEl, this);
    else if (this.route === 'next') renderNext(viewEl, this);
    else if (this.route === 'settings') renderSettings(viewEl, this);
    else renderChecklist(viewEl, this);
    if (this.currentTrophy) renderDetail(detailEl, this, this.currentTrophy);
    else hideDetail(detailEl);
  },
};

function readHash() {
  const hash = location.hash.replace(/^#\/?/, '');
  const trophyMatch = hash.match(/^trophy\/(\d+)$/);
  if (trophyMatch) {
    const trophy = trophies.find((t) => t.id === Number(trophyMatch[1]));
    app.currentTrophy = trophy || null;
    app.route = '';
  } else if (['roadmap', 'missables', 'next', 'settings'].includes(hash)) {
    app.route = hash;
    app.currentTrophy = null;
  } else {
    app.route = '';
    app.currentTrophy = null;
  }
  app.render();
}

searchEl.addEventListener('input', () => {
  app.filters.q = searchEl.value;
  if (app.route !== '') {
    app.route = '';
    history.replaceState(null, '', '#/');
  }
  app.render();
});
kindEl.addEventListener('change', () => {
  app.filters.kind = kindEl.value;
  app.render();
});
gradeEl.addEventListener('change', () => {
  app.filters.grade = gradeEl.value;
  app.render();
});
spoilersEl.addEventListener('change', () => app.setSpoilers(spoilersEl.checked));
earnedOnlyEl.addEventListener('change', () => {
  app.filters.earnedOnly = earnedOnlyEl.checked;
  app.render();
});

document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;
  if (e.key === '/') {
    e.preventDefault();
    searchEl.focus();
  } else if (e.key === 'g') {
    location.hash = '#/';
  } else if (e.key === 'r') {
    location.hash = '#/roadmap';
  } else if (e.key === 'm') {
    location.hash = '#/missables';
  } else if (e.key === 'Escape' && app.currentTrophy) {
    app.closeTrophy();
  }
});

spoilersEl.checked = app.state.spoilers;
window.addEventListener('hashchange', readHash);
readHash();
