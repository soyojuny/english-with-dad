export function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

// Pass now() to APIs accepting a timestamp; no global Date or timers are changed.
export function fixedClock(initialTime: string) {
  let time = Date.parse(initialTime);
  return {
    now: () => new Date(time).toISOString(),
    advance(milliseconds: number) { time += milliseconds; },
  };
}
