// Progress, notes and settings live in localStorage under one key, so the
// guide works offline and remembers where you left off between visits.
const KEY = 'sunset-platinum-v1';

export function blankState() {
  return { earned: [], notes: {}, spoilers: false };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blankState();
    const parsed = JSON.parse(raw);
    return {
      earned: Array.isArray(parsed.earned)
        ? parsed.earned.filter((n) => Number.isInteger(n))
        : [],
      notes:
        parsed.notes && typeof parsed.notes === 'object' ? parsed.notes : {},
      spoilers: Boolean(parsed.spoilers),
    };
  } catch {
    return blankState();
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function stateToJson(state) {
  return JSON.stringify(
    { app: 'sunset-platinum', exportedAt: new Date().toISOString(), ...state },
    null,
    2,
  );
}

export function stateFromJson(text) {
  const parsed = JSON.parse(text);
  const state = blankState();
  if (Array.isArray(parsed.earned)) {
    state.earned = parsed.earned.filter((n) => Number.isInteger(n));
  }
  if (parsed.notes && typeof parsed.notes === 'object') {
    state.notes = parsed.notes;
  }
  if (typeof parsed.spoilers === 'boolean') {
    state.spoilers = parsed.spoilers;
  }
  return state;
}
