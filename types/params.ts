export interface ParamsDto {
  search?: string;
  page?: number | string;
  perpage?: number | string;
  sort?: string;
  filter?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  paginate: {
    total: number;
    page: number;
    perpage: number;
    pages: number;
  };
}
