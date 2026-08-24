export type PageMetadata = {
  size?: number;
  number?: number;
  totalElements?: number;
  totalPages?: number;
};

export type PageResult<T> = {
  content?: T[];
  page?: PageMetadata;
};

type SpringPage<T> = {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export function toPageResult<T>(springPage: SpringPage<T>): PageResult<T> {
  return {
    content: springPage.content,
    page: {
      size: springPage.size,
      number: springPage.number,
      totalElements: springPage.totalElements,
      totalPages: springPage.totalPages,
    },
  };
}

export function pageQueryParams(
  searchParams: URLSearchParams,
  defaults?: { size?: number },
) {
  const params = new URLSearchParams();
  params.set("page", searchParams.get("page") ?? "0");
  params.set(
    "size",
    searchParams.get("size") ?? String(defaults?.size ?? 1000),
  );

  const sort = searchParams.get("sort");
  if (sort) params.set("sort", sort);

  return params;
}


/**
 * Normalises a backend list response to a flat array.
 *
 * The Spring backend returns `{ content, page }` for paginated endpoints and a
 * bare array for the rest. Route handlers that feed array-typed RTK Query
 * endpoints use this so the client always receives `T[]`, regardless of which
 * shape the backend sends.
 */
export function unwrapList<T>(
  data: T[] | { content?: T[] } | null | undefined,
): T[] {
  if (Array.isArray(data)) return data;
  return data?.content ?? [];
}
