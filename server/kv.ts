/** Simple in-process KV store used as the RAG chunk cache. */
export type KvEntry<T> = {
  key: string;
  value: T;
  createdAt: string;
  updatedAt: string;
};

export class KvCache<T> {
  private store = new Map<string, KvEntry<T>>();

  set(key: string, value: T): KvEntry<T> {
    const now = new Date().toISOString();
    const existing = this.store.get(key);
    const entry: KvEntry<T> = {
      key,
      value,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    this.store.set(key, entry);
    return entry;
  }

  get(key: string): KvEntry<T> | undefined {
    return this.store.get(key);
  }

  delete(key: string): boolean {
    return this.store.delete(key);
  }

  keys(): string[] {
    return [...this.store.keys()].sort();
  }

  values(): KvEntry<T>[] {
    return [...this.store.values()];
  }

  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  snapshot(): Array<{ key: string; updatedAt: string; preview: unknown }> {
    return this.values().map((entry) => ({
      key: entry.key,
      updatedAt: entry.updatedAt,
      preview: summarize(entry.value),
    }));
  }
}

function summarize(value: unknown): unknown {
  if (value && typeof value === "object" && "text" in value) {
    const text = String((value as { text: string }).text);
    return {
      ...(value as object),
      text: text.length > 160 ? `${text.slice(0, 160)}…` : text,
    };
  }
  return value;
}
