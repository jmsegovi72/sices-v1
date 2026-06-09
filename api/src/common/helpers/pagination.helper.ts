// common/helpers/pagination.helper.ts

export interface PaginationResult {
  limit: number;
  page: number;
  offset: number;
  hasPagination: boolean;
}

export function resolvePagination(dto?: {
  limit?: number;
  page?: number;
}): PaginationResult {
  const envLimit = Number(process.env.DEFAULT_PAGINATION_LIMIT);

  let limit =
    dto?.limit !== undefined && dto?.limit !== null
      ? Number(dto.limit)
      : envLimit;

  if (isNaN(limit)) {
    limit = 10;
  }

  let page =
    dto?.page !== undefined && dto?.page !== null ? Number(dto.page) : 1;

  if (isNaN(page)) {
    page = 1;
  }

  return {
    limit,
    page,
    offset: limit > 0 ? (page - 1) * limit : 0,
    hasPagination: limit > 0,
  };
}
