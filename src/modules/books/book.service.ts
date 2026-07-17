import { and, asc, desc, eq, gt, ilike, lt, lte, gte, or, sql, type SQL } from "drizzle-orm";

import { books } from "../../drizzle/schema";
import type { Database } from "../../config/db/database";
import type { NewBook, UpdateBook } from "./book.types";
import { NotFoundError, ValidationError } from "../../errors";

interface BookFilter {
  authorId?: string;
  titleContains?: string;
  createdAfter?: string;
  createdBefore?: string;
}

interface BookSort {
  field: "TITLE" | "CREATED";
  direction: "ASC" | "DESC";
}

interface GetBooksArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  filter?: BookFilter;
  sort: BookSort;
}

interface DecodedCursor {
  v: string;
  id: string;
}

const SORT_COLUMNS = new Map<BookSort["field"], typeof books.title | typeof books.createdAt>([
  ["TITLE", books.title],
  ["CREATED", books.createdAt],
] as const);

function encodeCursor(cursor: DecodedCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

function decodeCursor(cursor: string): DecodedCursor {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));

    if (typeof decoded.v !== "string" || typeof decoded.id !== "string") {
      throw new Error();
    }

    return decoded;
  } catch (e) {
    throw new ValidationError("Invalid cursor format");
  }
}

export class BookService {
  constructor(private db: Database) {}

  private buildFilterConditions(filter?: BookFilter): SQL[] {
    const conditions: SQL[] = [];

    if (filter?.authorId) {
      conditions.push(eq(books.authorId, filter.authorId));
    }
    if (filter?.titleContains) {
      conditions.push(ilike(books.title, `%${filter.titleContains}%`));
    }
    if (filter?.createdAfter) {
      conditions.push(gte(books.createdAt, new Date(filter.createdAfter)));
    }
    if (filter?.createdBefore) {
      conditions.push(lte(books.createdAt, new Date(filter.createdBefore)));
    }

    return conditions;
  }

  async getBooks(args: GetBooksArgs) {
    const { first, after, last, before, filter, sort } = args;

    const sortColumn = SORT_COLUMNS.get(sort.field)!;
    const isAsc = sort.direction === "ASC";
    const isForward = first != null;
    const limit = (first ?? last)!;

    // Total count respects filters only, never the cursor.
    const baseConditions = this.buildFilterConditions(filter);
    const baseWhere = baseConditions.length > 0 ? and(...baseConditions) : undefined;

    const countRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(books)
      .where(baseWhere);

    const totalCount = countRows[0]?.value ?? 0;

    // Page query adds the cursor condition on top of the same filters.
    const pageConditions = this.buildFilterConditions(filter);
    const cursorStr = isForward ? after : before;

    // `scanAscending` answers one question: which physical direction do we walk in to get "the next N rows after this cursor, in the requested sort order"?
    // - forward + ASC sort  -> walk ascending (cursor condition: >)
    // - forward + DESC sort -> walk descending (cursor condition: <)
    // - backward + ASC sort -> walk descending, then reverse the page (cursor condition: <)
    // - backward + DESC sort -> walk ascending, then reverse the page (cursor condition: >)
    const scanAscending = isForward ? isAsc : !isAsc;

    if (cursorStr) {
      const decoded = decodeCursor(cursorStr);

      const tupleCondition =
        sort.field === "CREATED"
          ? scanAscending
            ? or(
                gt(books.createdAt, new Date(decoded.v)),
                and(eq(books.createdAt, new Date(decoded.v)), gt(books.id, decoded.id)),
              )
            : or(
                lt(books.createdAt, new Date(decoded.v)),
                and(eq(books.createdAt, new Date(decoded.v)), lt(books.id, decoded.id)),
              )
          : scanAscending
            ? or(gt(books.title, decoded.v), and(eq(books.title, decoded.v), gt(books.id, decoded.id)))
            : or(lt(books.title, decoded.v), and(eq(books.title, decoded.v), lt(books.id, decoded.id)));

      if (tupleCondition) {
        pageConditions.push(tupleCondition);
      }
    }

    const pageWhere = pageConditions.length > 0 ? and(...pageConditions) : undefined;

    const rows = await this.db
      .select()
      .from(books)
      .where(pageWhere)
      .orderBy(scanAscending ? asc(sortColumn) : desc(sortColumn), scanAscending ? asc(books.id) : desc(books.id))
      .limit(limit + 1);

    const hasExtra = rows.length > limit;
    const pageRows = hasExtra ? rows.slice(0, limit) : rows;
    // We always scan "toward" the cursor in the tuple's natural direction, so forward pages come back already in display order, but backward pages come back reversed relative to display order and need flipping.
    const orderedRows = isForward ? pageRows : pageRows.reverse();

    const edges = orderedRows.map((book) => ({
      node: book,
      cursor: encodeCursor({
        v: sort.field === "CREATED" ? book.createdAt.toISOString() : book.title,
        id: book.id,
      }),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage: isForward ? hasExtra : Boolean(before),
        hasPreviousPage: isForward ? Boolean(after) : hasExtra,
        startCursor: edges[0]?.cursor ?? null,
        endCursor: edges[edges.length - 1]?.cursor ?? null,
      },
      totalCount,
    };
  }

  async getBookById(id: string) {
    const [book] = await this.db.select().from(books).where(eq(books.id, id));

    if (!book) {
      throw new NotFoundError(`Book with id ${id} not found`);
    }

    return book;
  }

  async createBook(data: NewBook) {
    const [book] = await this.db.insert(books).values(data).returning();
    return book;
  }

  async updateBook(id: string, data: UpdateBook) {
    const [book] = await this.db.update(books).set(data).where(eq(books.id, id)).returning();

    if (!book) {
      throw new NotFoundError(`Book with id ${id} not found`);
    }

    return book;
  }

  async deleteBook(id: string) {
    const [book] = await this.db.delete(books).where(eq(books.id, id)).returning();

    if (!book) {
      throw new NotFoundError(`Book with id ${id} not found`);
    }

    return book;
  }
}
