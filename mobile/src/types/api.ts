export interface ApiEnvelope<T> {
  data: T;
  meta?: unknown;
}

export interface ApiErrorEnvelope {
  error?: {
    message?: string;
    details?: unknown;
  };
}

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
