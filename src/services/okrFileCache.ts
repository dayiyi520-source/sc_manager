/** A disposable cache: durable writes are still acknowledged by the shared file service. */
export function createOkrFileCache(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  const overflow = new Map<string, string>();
  return {
    getItem(key: string) { return overflow.has(key) ? overflow.get(key)! : storage.getItem(key); },
    setItem(key: string, value: string) {
      try { storage.setItem(key, value); overflow.delete(key); }
      catch (cause) {
        if (!(cause instanceof DOMException) || !['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED'].includes(cause.name)) throw cause;
        overflow.set(key, value);
      }
    },
  };
}
