/** Fetch every match, even when PostgREST applies a lower server-side row limit. */
export async function loadAllAdminMatches<T extends { id: number }>(
  fetchPage: (afterId: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const matches: T[] = [];
  let afterId = 0;
  for (;;) {
    const { data, error } = await fetchPage(afterId);
    if (error || !data) throw new Error("Impossibile caricare le partite.");
    if (!data.length) return matches;
    const lastId = Number(data[data.length - 1].id);
    if (!Number.isSafeInteger(lastId) || lastId <= afterId) throw new Error("Impossibile caricare le partite: paginazione non valida.");
    matches.push(...data);
    afterId = lastId;
  }
}
