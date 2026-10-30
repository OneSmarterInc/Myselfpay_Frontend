export function paginateGroups(groups, page = 0, size = 10) {
  const total = groups.reduce((count, group) => count + group.length, 0);
  const pages = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(0, page), pages - 1);
  let offset = 0;
  const items = groups.map((group) => {
    const start = Math.max(0, current * size - offset);
    const end = Math.max(0, (current + 1) * size - offset);
    offset += group.length;
    return group.slice(start, end);
  });
  return {
    items,
    total,
    pages,
    current,
    start: current * size + 1,
    end: Math.min((current + 1) * size, total),
  };
}
