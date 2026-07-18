import { and, asc, desc, eq, gt, lt, or, sql } from "drizzle-orm";

import type { Database } from "../../config/db/database";
import { reviews } from "../../drizzle/schema";
import type { NewReview } from "./review.types";
import { ForbiddenError, NotFoundError, ValidationError } from "../../graphql/errors";

interface GetReviewsArgs {
  bookId: string;
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

interface DecodedCursor {
  v: string;
  id: string;
}

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

export class ReviewService {
  constructor(private db: Database) {}

  // Reviews only support one implicit sort (newest first), scoped to a single book,
  // so this is a simpler version of the books/authors keyset pagination.
  async getReviewsByBook(args: GetReviewsArgs) {
    const { bookId, first, after, last, before } = args;

    const isForward = first != null;
    const limit = (first ?? last)!;
    const scanAscending = !isForward; // default sort is CREATED DESC

    const baseWhere = eq(reviews.bookId, bookId);

    const countRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(reviews)
      .where(baseWhere);

    const totalCount = countRows[0]?.value ?? 0;

    const cursorStr = isForward ? after : before;
    let where = baseWhere;

    if (cursorStr) {
      const decoded = decodeCursor(cursorStr);

      const tupleCondition = scanAscending
        ? or(
            gt(reviews.createdAt, new Date(decoded.v)),
            and(eq(reviews.createdAt, new Date(decoded.v)), gt(reviews.id, decoded.id)),
          )
        : or(
            lt(reviews.createdAt, new Date(decoded.v)),
            and(eq(reviews.createdAt, new Date(decoded.v)), lt(reviews.id, decoded.id)),
          );

      if (tupleCondition) {
        where = and(baseWhere, tupleCondition)!;
      }
    }

    const rows = await this.db
      .select()
      .from(reviews)
      .where(where)
      .orderBy(
        scanAscending ? asc(reviews.createdAt) : desc(reviews.createdAt),
        scanAscending ? asc(reviews.id) : desc(reviews.id),
      )
      .limit(limit + 1);

    const hasExtra = rows.length > limit;
    const pageRows = hasExtra ? rows.slice(0, limit) : rows;
    const orderedRows = isForward ? pageRows : pageRows.reverse();

    const edges = orderedRows.map((review) => ({
      node: review,
      cursor: encodeCursor({ v: review.createdAt.toISOString(), id: review.id }),
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

  async createReview(data: NewReview) {
    const [review] = await this.db.insert(reviews).values(data).returning();
    return review;
  }

  async deleteReview(userId: string, id: string) {
    const review = await this.db.query.reviews.findFirst({ where: eq(reviews.id, id) });

    if (!review) {
      throw new NotFoundError(`Review with id ${id} not found`);
    }

    if (review.userId !== userId) {
      throw new ForbiddenError(`Not authorized to delete review with id ${id}`);
    }

    const [deleted] = await this.db.delete(reviews).where(eq(reviews.id, id)).returning();

    return deleted;
  }
}
