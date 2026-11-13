"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { z } from "zod";

/**
 * Datos del usuario guardados en el teléfono (localStorage del WebView), validados con Zod.
 * Mientras no hay Neon, portafolio, alertas y preferencias viven aquí.
 */

const listeners = new Map<string, Set<() => void>>();
const snapshots = new Map<string, { raw: string | null; value: unknown }>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener());
}

export function useLocalState<T>(key: string, schema: z.ZodType<T>, fallback: T) {
  const subscribe = useCallback(
    (listener: () => void) => {
      const set = listeners.get(key) ?? new Set();
      set.add(listener);
      listeners.set(key, set);
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) listener();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        set.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );

  const getSnapshot = useCallback((): T => {
    const raw = read(key);
    const cached = snapshots.get(key);
    if (cached && cached.raw === raw) return cached.value as T;
    let value = fallback;
    if (raw !== null) {
      try {
        const parsed = schema.safeParse(JSON.parse(raw));
        if (parsed.success) value = parsed.data;
      } catch {
        // Dato dañado: se ignora y se usa el valor inicial.
      }
    }
    snapshots.set(key, { raw, value });
    return value;
  }, [key, schema, fallback]);

  // En el servidor y en la hidratación se usa el valor inicial; luego, lo guardado.
  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);

  const setValue = useCallback(
    (update: T | ((current: T) => T)) => {
      const next = typeof update === "function" ? (update as (current: T) => T)(getSnapshot()) : update;
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Sin almacenamiento (modo privado): el cambio dura solo esta sesión.
        snapshots.set(key, { raw: JSON.stringify(next), value: next });
      }
      notify(key);
    },
    [key, getSnapshot],
  );

  return [value, setValue] as const;
}

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}
