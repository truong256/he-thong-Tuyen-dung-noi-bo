import '@testing-library/jest-dom';

function createStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() { return data.size; },
    key(index: number) { return Array.from(data.keys())[index] ?? null; },
    getItem(key: string) { return data.get(String(key)) ?? null; },
    setItem(key: string, value: string) { data.set(String(key), String(value)); },
    removeItem(key: string) { data.delete(String(key)); },
    clear() { data.clear(); },
  };
}

const localStore = createStorage();
const sessionStore = createStorage();

for (const [name, store] of [
  ['localStorage', localStore],
  ['sessionStorage', sessionStore],
] as const) {
  try {
    if (typeof globalThis[name]?.getItem !== 'function') {
      Object.defineProperty(globalThis, name, {
        configurable: true,
        value: store,
      });
    }
  } catch {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: store,
    });
  }

  if (typeof window !== 'undefined') {
    try {
      if (typeof window[name]?.getItem !== 'function') {
        Object.defineProperty(window, name, {
          configurable: true,
          value: store,
        });
      }
    } catch {
      Object.defineProperty(window, name, {
        configurable: true,
        value: store,
      });
    }
  }
}
