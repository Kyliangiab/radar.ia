// Petit bus de toasts global (design 4a) — utilisable depuis n'importe quel composant.
export type ToastItem = { id: number; msg: string; icon: string; color: string };
type Listener = (t: ToastItem) => void;

const listeners = new Set<Listener>();
let seq = 0;

export function toast(msg: string, opts?: { icon?: string; color?: string }) {
  const t: ToastItem = {
    id: ++seq,
    msg,
    icon: opts?.icon ?? "✓",
    color: opts?.color ?? "#4E8D6E",
  };
  listeners.forEach((l) => l(t));
}

export function subscribeToast(l: Listener) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
