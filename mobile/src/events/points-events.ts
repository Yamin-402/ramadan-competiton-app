type Listener = () => void;

const listeners = new Set<Listener>();

export const pointsEvents = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  notify() {
    for (const listener of listeners) {
      listener();
    }
  },
};
