export const createSignal = (initial) => {
  let value = initial;
  const subscribers = new Set();
  return {
    get: () => value,
    set: (newVal) => {
      value = typeof newVal === 'function' ? newVal(value) : newVal;
      subscribers.forEach(fn => fn(value));
    },
    subscribe: (fn) => { subscribers.add(fn); return () => subscribers.delete(fn); }
  };
};

export const createComputed = (fn) => {
  const signal = createSignal(fn());
  let currentFn = fn;
  let dirty = true;
  let notified = false;

  const update = () => {
    if (!dirty) return;
    dirty = false;
    const newVal = currentFn();
    if (newVal !== signal.get()) {
      signal.set(newVal);
      notified = true;
    }
  };

  return {
    get: () => {
      if (dirty) update();
      return signal.get();
    },
    set: (newFn) => { currentFn = newFn; dirty = true; },
    subscribe: (fn) => signal.subscribe(fn)
  };
};

export const createEffect = (fn) => {
  const cleanup = fn();
  if (typeof cleanup === 'function') {
    return cleanup;
  }
  return () => {};
};

export const batch = (fn) => {
  const originalSet = createSignal(0).set;
  let batching = false;
  const queue = new Set();

  const flush = () => {
    batching = false;
    queue.forEach(fn => fn());
    queue.clear();
  };

  return (...args) => {
    if (batching) {
      queue.add(() => fn(...args));
    } else {
      batching = true;
      try {
        fn(...args);
      } finally {
        flush();
      }
    }
  };
};

export const untrack = (fn) => fn();