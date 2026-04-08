export interface PaginatedResponse<T> {
  results: T[];
  total: number;
}
