import { Signal, effect, signal } from '@angular/core';
import { DocumentReference, DocumentSnapshot, Query, onSnapshot } from 'firebase/firestore';
import { LiveDocState, LiveQueryState } from '../models/live-data.model';

const SNAPSHOT_OPTIONS = { includeMetadataChanges: true } as const;

/**
 * Keeps a signal in sync with a Firestore query. The subscription is recreated whenever signals read
 * inside `queryFn` change; returning `null` unsubscribes. Must be called in an injection context.
 */
export function liveQuery<T>(
  queryFn: () => Query | null,
  mapDoc: (snapshot: DocumentSnapshot) => T,
): Signal<LiveQueryState<T>> {
  const state = signal<LiveQueryState<T>>({ data: [], loading: true, error: null, fromCache: false });

  effect((onCleanup) => {
    const query = queryFn();
    if (!query) {
      state.set({ data: [], loading: false, error: null, fromCache: false });
      return;
    }

    state.update((current) => ({ ...current, loading: true, error: null }));
    const unsubscribe = onSnapshot(
      query,
      SNAPSHOT_OPTIONS,
      (snapshot) =>
        state.set({
          data: snapshot.docs.map(mapDoc),
          loading: false,
          error: null,
          fromCache: snapshot.metadata.fromCache,
        }),
      (error) => state.update((current) => ({ ...current, loading: false, error })),
    );
    onCleanup(unsubscribe);
  });

  return state.asReadonly();
}

/** Same as {@link liveQuery} for a single document; `data` is `null` when the document doesn't exist. */
export function liveDoc<T>(
  refFn: () => DocumentReference | null,
  mapDoc: (snapshot: DocumentSnapshot) => T,
): Signal<LiveDocState<T>> {
  const state = signal<LiveDocState<T>>({ data: null, loading: true, error: null, fromCache: false });

  effect((onCleanup) => {
    const ref = refFn();
    if (!ref) {
      state.set({ data: null, loading: false, error: null, fromCache: false });
      return;
    }

    state.update((current) => ({ ...current, loading: true, error: null }));
    const unsubscribe = onSnapshot(
      ref,
      SNAPSHOT_OPTIONS,
      (snapshot) =>
        state.set({
          data: snapshot.exists() ? mapDoc(snapshot) : null,
          loading: false,
          error: null,
          fromCache: snapshot.metadata.fromCache,
        }),
      (error) => state.update((current) => ({ ...current, loading: false, error })),
    );
    onCleanup(unsubscribe);
  });

  return state.asReadonly();
}
