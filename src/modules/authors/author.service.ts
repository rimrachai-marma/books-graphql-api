import { and, asc, desc, eq, gt, gte, ilike, inArray, lt, lte, or, sql, type SQL } from "drizzle-orm";

import type { Database } from "../../config/db/database";
import { authors } from "../../drizzle/schema";
import type { NewAuthor, UpdateAuthor } from "./author.types";
import { NotFoundError, ValidationError } from "../../graphql/errors";

interface AuthorFilter {
  nameContains?: string;
  createdAfter?: string;
  createdBefore?: string;
}

interface AuthorSort {
  field: "NAME" | "CREATED";
  direction: "ASC" | "DESC";
}

interface GetAuthorsArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  filter?: AuthorFilter;
  sort: AuthorSort;
}

interface DecodedCursor {
  v: string;
  id: string;
}

const SORT_COLUMNS = new Map<AuthorSort["field"], typeof authors.name | typeof authors.createdAt>([
  ["NAME", authors.name],
  ["CREATED", authors.createdAt],
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

export class AuthorService {
  constructor(private db: Database) {}

  private buildFilterConditions(filter?: AuthorFilter): SQL[] {
    const conditions: SQL[] = [];

    if (filter?.nameContains) {
      conditions.push(ilike(authors.name, `%${filter.nameContains}%`));
    }
    if (filter?.createdAfter) {
      conditions.push(gte(authors.createdAt, new Date(filter.createdAfter)));
    }
    if (filter?.createdBefore) {
      conditions.push(lte(authors.createdAt, new Date(filter.createdBefore)));
    }

    return conditions;
  }

  async getAuthors(args: GetAuthorsArgs) {
    const { first, after, last, before, filter, sort } = args;

    const sortColumn = SORT_COLUMNS.get(sort.field)!;
    const isAsc = sort.direction === "ASC";
    const isForward = first != null;
    const limit = (first ?? last)!;

    const baseConditions = this.buildFilterConditions(filter);
    const baseWhere = baseConditions.length > 0 ? and(...baseConditions) : undefined;

    const countRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(authors)
      .where(baseWhere);

    const totalCount = countRows[0]?.value ?? 0;

    const pageConditions = this.buildFilterConditions(filter);
    const cursorStr = isForward ? after : before;

    // Same scan-direction logic as books: forward pages walk the sort's own direction,
    // backward pages walk the opposite direction and get reversed after the fact.
    const scanAscending = isForward ? isAsc : !isAsc;

    if (cursorStr) {
      const decoded = decodeCursor(cursorStr);

      const tupleCondition =
        sort.field === "CREATED"
          ? scanAscending
            ? or(
                gt(authors.createdAt, new Date(decoded.v)),
                and(eq(authors.createdAt, new Date(decoded.v)), gt(authors.id, decoded.id)),
              )
            : or(
                lt(authors.createdAt, new Date(decoded.v)),
                and(eq(authors.createdAt, new Date(decoded.v)), lt(authors.id, decoded.id)),
              )
          : scanAscending
            ? or(gt(authors.name, decoded.v), and(eq(authors.name, decoded.v), gt(authors.id, decoded.id)))
            : or(lt(authors.name, decoded.v), and(eq(authors.name, decoded.v), lt(authors.id, decoded.id)));

      if (tupleCondition) {
        pageConditions.push(tupleCondition);
      }
    }

    const pageWhere = pageConditions.length > 0 ? and(...pageConditions) : undefined;

    const rows = await this.db
      .select()
      .from(authors)
      .where(pageWhere)
      .orderBy(scanAscending ? asc(sortColumn) : desc(sortColumn), scanAscending ? asc(authors.id) : desc(authors.id))
      .limit(limit + 1);

    const hasExtra = rows.length > limit;
    const pageRows = hasExtra ? rows.slice(0, limit) : rows;
    const orderedRows = isForward ? pageRows : pageRows.reverse();

    const edges = orderedRows.map((author) => ({
      node: author,
      cursor: encodeCursor({
        v: sort.field === "CREATED" ? author.createdAt.toISOString() : author.name,
        id: author.id,
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

  async getAuthorById(id: string) {
    const [author] = await this.db.select().from(authors).where(eq(authors.id, id));

    if (!author) {
      throw new NotFoundError(`Author with id ${id} not found`);
    }

    return author;
  }

  async findByIds(ids: readonly string[]) {
    return this.db.select().from(authors).where(inArray(authors.id, ids));
  }

  async createAuthor(data: NewAuthor) {
    const [author] = await this.db.insert(authors).values(data).returning();
    return author;
  }

  async updateAuthor(id: string, data: UpdateAuthor) {
    const author = await this.db.query.authors.findFirst({ where: eq(authors.id, id) });

    if (!author) {
      throw new NotFoundError(`Author with id ${id} not found`);
    }

    const [updated] = await this.db.update(authors).set(data).where(eq(authors.id, id)).returning();

    return updated;
  }

  async deleteAuthor(id: string) {
    const author = await this.db.query.authors.findFirst({ where: eq(authors.id, id) });

    if (!author) {
      throw new NotFoundError(`Author with id ${id} not found`);
    }

    const [deleted] = await this.db.delete(authors).where(eq(authors.id, id)).returning();

    return deleted;
  }
}
