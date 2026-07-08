/** Parses page/limit query params with sane bounds */
export function getPagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 12))
  return { page, limit, skip: (page - 1) * limit }
}

export function paginatedResponse(items, totalCount, page, limit) {
  return {
    success: true,
    data: items,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  }
}
