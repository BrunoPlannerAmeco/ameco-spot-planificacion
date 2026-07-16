export const state = {
  user: null,
  route: "dashboard",
  counts: {
    workers: 0,
    sites: 0,
    services: 0,
    pendingAccreditations: 0,
    pendingTickets: 0,
    pendingCalls: 0,
    documentAlerts: 0,
    onShiftToday: 0
  }
};

const listeners = new Set();

export function subscribe(listener){
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function updateState(patch){
  Object.assign(state, patch);
  listeners.forEach(listener => listener(state));
}

export function updateCounts(patch){
  state.counts = { ...state.counts, ...patch };
  listeners.forEach(listener => listener(state));
}
