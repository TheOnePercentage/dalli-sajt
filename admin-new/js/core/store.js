export class ImperiumStore {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.listeners = new Map();
    this.middleware = [];
    this.devtools = false;
  }

  subscribe(listener) {
    const id = Symbol('listener');
    this.listeners.set(id, listener);
    return () => this.listeners.delete(id);
  }

  subscribeKey(key, listener) {
    const id = Symbol(`listener_${key}`);
    const wrapper = (state) => listener(state[key], this.getState()[key]);
    this.listeners.set(id, wrapper);
    return () => this.listeners.delete(id);
  }

  notify() {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (e) {
        console.error('Store listener error:', e);
      }
    });
  }

  getState() {
    return this.state;
  }

  setState(partialState, replace = false) {
    const prevState = this.getState();
    const nextState = replace ? partialState : { ...prevState, ...partialState };
    
    for (const fn of this.middleware) {
      const result = fn(nextState, prevState, this);
      if (result !== undefined) {
        Object.assign(nextState, result);
      }
    }

    this.state = nextState;
    this.notify();
    
    if (this.devtools && window.__REDUX_DEVTOOLS_EXTENSION__) {
      window.__REDUX_DEVTOOLS_EXTENSION__.send('state/update', nextState);
    }
    
    return this.state;
  }

  useReducer(reducer, initialState) {
    const stateKey = Symbol('reducer_state');
    this.state[stateKey] = initialState;
    
    const dispatch = (action) => {
      const currentState = this.state[stateKey];
      const nextState = reducer(currentState, action);
      if (nextState !== currentState) {
        this.setState({ [stateKey]: nextState });
      }
      return action;
    };
    
    return [() => this.state[stateKey], dispatch];
  }

  addMiddleware(fn) {
    this.middleware.push(fn);
    return () => {
      const index = this.middleware.indexOf(fn);
      if (index > -1) this.middleware.splice(index, 1);
    };
  }

  enableDevTools(name = 'Imperium Store') {
    this.devtools = true;
    if (window.__REDUX_DEVTOOLS_EXTENSION__) {
      window.__REDUX_DEVTOOLS_EXTENSION__.connect({ name });
      window.__REDUX_DEVTOOLS_EXTENSION__.send('state/init', this.state);
    }
  }

  reset() {
    this.state = {};
    this.notify();
  }

  persist(keys, storage = localStorage, prefix = 'dalli_store_') {
    const saved = storage.getItem(prefix + 'state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        keys.forEach(key => {
          if (parsed[key] !== undefined) this.state[key] = parsed[key];
        });
      } catch (e) {
        console.warn('Failed to persist store:', e);
      }
    }

    this.subscribe(state => {
      const toSave = {};
      keys.forEach(key => {
        if (state[key] !== undefined) toSave[key] = state[key];
      });
      storage.setItem(prefix + 'state', JSON.stringify(toSave));
    });
  }
}

export const createStore = (initialState) => new ImperiumStore(initialState);

export const combineReducers = (reducers) => {
  return (state = {}, action) => {
    const nextState = {};
    let hasChanged = false;
    
    for (const key of Object.keys(reducers)) {
      const reducer = reducers[key];
      const previousStateForKey = state[key];
      const nextStateForKey = reducer(previousStateForKey, action);
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    
    return hasChanged ? nextState : state;
  };
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ImperiumStore, createStore, combineReducers };
}