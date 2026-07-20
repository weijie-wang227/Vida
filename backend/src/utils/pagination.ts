export type Pagination = {
  page: number;
  limit: number;
  skip: number;
};

function getPositiveInteger(value: unknown, fallback: number) {
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : fallback;
}

export function getPagination(
  query: Record<string, unknown>,
  options: { defaultLimit?: number; maxLimit?: number } = {},
): Pagination {
  const defaultLimit = options.defaultLimit ?? 50;
  const maxLimit = options.maxLimit ?? 100;
  const page = getPositiveInteger(query.page, 1);
  const limit = Math.min(
    getPositiveInteger(query.limit, defaultLimit),
    maxLimit,
  );

  return { page, limit, skip: (page - 1) * limit };
}

export function getPaginationResponse(
  pagination: Pagination,
  total: number,
) {
  return {
    page: pagination.page,
    limit: pagination.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
  };
}
