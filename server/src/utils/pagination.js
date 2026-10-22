/** Reads ?page and ?pageSize safely and turns them into limit/offset. */
function getPaging(query, defaultSize = 10) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize, 10) || defaultSize));
  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize };
}

function paginationInfo({ page, pageSize }, totalItems) {
  return { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) };
}

module.exports = { getPaging, paginationInfo };
