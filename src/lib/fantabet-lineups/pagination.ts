export const POSTGREST_PAGE_SIZE = 1000;

export async function loadAllPages<T>(fetchPage: (from: number, to: number) => Promise<T[]>, pageSize = POSTGREST_PAGE_SIZE) {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}
