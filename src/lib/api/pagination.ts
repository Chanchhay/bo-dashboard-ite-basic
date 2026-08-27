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

export function toPageResult<T>(
  springPage: any,
  searchParams?:
    | URLSearchParams
    | { page?: number | string; size?: number | string },
): PageResult<T> {
  if (!springPage) {
    return {
      content: [],
      page: { size: 20, number: 0, totalElements: 0, totalPages: 0 },
    };
  }

  const reqPage =
    typeof searchParams === "object" && searchParams !== null
      ? searchParams instanceof URLSearchParams
        ? Number(searchParams.get("page") ?? 0)
        : Number(searchParams.page ?? 0)
      : 0;

  const reqSize =
    typeof searchParams === "object" && searchParams !== null
      ? searchParams instanceof URLSearchParams
        ? Number(searchParams.get("size") ?? 20)
        : Number(searchParams.size ?? 20)
      : 20;

  if (Array.isArray(springPage)) {
    const totalElements = springPage.length;
    const size = Math.max(1, reqSize || 20);
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    const number = Math.min(Math.max(0, reqPage || 0), totalPages - 1);
    const start = number * size;

    return {
      content: springPage.slice(start, start + size),
      page: {
        size,
        number,
        totalElements,
        totalPages,
      },
    };
  }

  const content = springPage.content ?? [];
  const size =
    typeof springPage.size === "number"
      ? springPage.size
      : (springPage.pageable?.pageSize ?? reqSize ?? 20);
  const number =
    typeof springPage.number === "number"
      ? springPage.number
      : typeof springPage.page === "number"
        ? springPage.page
        : typeof springPage.page?.number === "number"
          ? springPage.page.number
          : (springPage.pageable?.pageNumber ?? reqPage ?? 0);
  const totalElements =
    typeof springPage.totalElements === "number"
      ? springPage.totalElements
      : typeof springPage.page?.totalElements === "number"
        ? springPage.page.totalElements
        : typeof springPage.total === "number"
          ? springPage.total
          : content.length;
  const totalPages =
    typeof springPage.totalPages === "number"
      ? springPage.totalPages
      : typeof springPage.page?.totalPages === "number"
        ? springPage.page.totalPages
        : Math.max(1, Math.ceil(totalElements / (size || 1)));

  return {
    content,
    page: {
      size,
      number,
      totalElements,
      totalPages,
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
