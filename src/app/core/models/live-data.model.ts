interface LiveState {
  loading: boolean;
  error: unknown;
  /** Data came from the local cache (offline or not yet confirmed by the server). */
  fromCache: boolean;
}

export interface LiveQueryState<T> extends LiveState {
  data: T[];
}

export interface LiveDocState<T> extends LiveState {
  data: T | null;
}
