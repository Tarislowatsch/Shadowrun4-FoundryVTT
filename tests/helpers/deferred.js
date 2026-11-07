/**
 * @template T
 * @returns {{ promise: Promise<T>, resolve: (value: T) => void }}
 */
export function deferred() {
  /** @type {(value: T) => void} */
  let resolve = () => {};
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
