export const DATA_CHANGED = "femvita:data-changed";
export function notifyDataChanged() {
  window.dispatchEvent(new Event(DATA_CHANGED));
}
