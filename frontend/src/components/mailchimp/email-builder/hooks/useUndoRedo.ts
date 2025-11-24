"use client";

import { useCallback, useRef, useState } from "react";

type StructuredClone = <T>(value: T) => T;

const getStructuredClone = (): StructuredClone | null => {
  const globalClone = (globalThis as { structuredClone?: StructuredClone })
    .structuredClone;
  if (typeof globalClone === "function") {
    return globalClone;
  }
  return null;
};

const cloneState = <T>(value: T): T => {
  const structuredClone = getStructuredClone();
  if (structuredClone) {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

interface UseUndoRedoOptions<T> {
  initialState: T;
  capacity?: number;
}

interface UndoRedoStack<T> {
  history: T[];
  future: T[];
}

export const useUndoRedo = <T,>({
  initialState,
  capacity = 50,
}: UseUndoRedoOptions<T>) => {
  const initialSnapshotRef = useRef<T>(cloneState(initialState));
  const [stack, setStack] = useState<UndoRedoStack<T>>(() => ({
    history: [cloneState(initialSnapshotRef.current)],
    future: [],
  }));

  const saveSnapshot = useCallback(
    (state: T) => {
      setStack((prev) => {
        const lastSnapshot = prev.history[prev.history.length - 1];
        const serializedLast = JSON.stringify(lastSnapshot);
        const serializedNext = JSON.stringify(state);
        if (serializedLast === serializedNext) {
          return prev;
        }

        const nextHistory = [...prev.history, cloneState(state)];
        if (nextHistory.length > capacity) {
          nextHistory.shift();
        }
        return { history: nextHistory, future: [] };
      });
    },
    [capacity]
  );

  const undo = useCallback((): T | null => {
    let snapshot: T | null = null;
    setStack((prev) => {
      if (prev.history.length <= 1) {
        return prev;
      }
      const nextHistory = [...prev.history];
      const current = nextHistory.pop();
      if (!current) {
        return prev;
      }
      const previous = nextHistory[nextHistory.length - 1];
      snapshot = cloneState(previous);
      return {
        history: nextHistory,
        future: [cloneState(current), ...prev.future],
      };
    });
    return snapshot;
  }, []);

  const redo = useCallback((): T | null => {
    let snapshot: T | null = null;
    setStack((prev) => {
      if (prev.future.length === 0) {
        return prev;
      }
      const [next, ...restFuture] = prev.future;
      snapshot = cloneState(next);
      return {
        history: [...prev.history, cloneState(next)],
        future: restFuture,
      };
    });
    return snapshot;
  }, []);

  const reset = useCallback((state: T) => {
    const cloned = cloneState(state);
    initialSnapshotRef.current = cloned;
    setStack({
      history: [cloned],
      future: [],
    });
  }, []);

  const canUndo = stack.history.length > 1;
  const canRedo = stack.future.length > 0;

  return {
    saveSnapshot,
    undo,
    redo,
    reset,
    canUndo,
    canRedo,
  };
};


