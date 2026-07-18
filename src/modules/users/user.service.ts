import { and, asc, desc, eq, gt, gte, ilike, inArray, lt, lte, or, sql, type SQL } from "drizzle-orm";

import { users } from "../../drizzle/schema";
import type { UpdateUser } from "./user.types";
import type { Database } from "../../config/db/database";
import { NotFoundError, ValidationError } from "../../graphql/errors";

interface UserFilter {
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
}

interface UserSort {
  field: "NAME" | "CREATED";
  direction: "ASC" | "DESC";
}

interface GetUsersArgs {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
  filter?: UserFilter;
  sort: UserSort;
}

interface DecodedCursor {
  v: string;
  id: string;
}

const SORT_COLUMNS = new Map<UserSort["field"], typeof users.name | typeof users.createdAt>([
  ["NAME", users.name],
  ["CREATED", users.createdAt],
] as const);

const SELECT_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

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

export class UserService {
  constructor(private db: Database) {}

  private buildFilterConditions(filter?: UserFilter): SQL[] {
    const conditions: SQL[] = [];

    if (filter?.search) {
      conditions.push(or(ilike(users.name, `%${filter.search}%`), ilike(users.email, `%${filter.search}%`))!);
    }
    if (filter?.createdAfter) {
      conditions.push(gte(users.createdAt, new Date(filter.createdAfter)));
    }
    if (filter?.createdBefore) {
      conditions.push(lte(users.createdAt, new Date(filter.createdBefore)));
    }

    return conditions;
  }

  async getUsers(args: GetUsersArgs) {
    const { first, after, last, before, filter, sort } = args;

    const sortColumn = SORT_COLUMNS.get(sort.field)!;
    const isAsc = sort.direction === "ASC";
    const isForward = first != null;
    const limit = (first ?? last)!;

    const baseConditions = this.buildFilterConditions(filter);
    const baseWhere = baseConditions.length > 0 ? and(...baseConditions) : undefined;

    const countRows = await this.db
      .select({ value: sql<number>`count(*)::int` })
      .from(users)
      .where(baseWhere);

    const totalCount = countRows[0]?.value ?? 0;

    const pageConditions = this.buildFilterConditions(filter);
    const cursorStr = isForward ? after : before;
    const scanAscending = isForward ? isAsc : !isAsc;

    if (cursorStr) {
      const decoded = decodeCursor(cursorStr);

      const tupleCondition =
        sort.field === "CREATED"
          ? scanAscending
            ? or(
                gt(users.createdAt, new Date(decoded.v)),
                and(eq(users.createdAt, new Date(decoded.v)), gt(users.id, decoded.id)),
              )
            : or(
                lt(users.createdAt, new Date(decoded.v)),
                and(eq(users.createdAt, new Date(decoded.v)), lt(users.id, decoded.id)),
              )
          : scanAscending
            ? or(gt(users.name, decoded.v), and(eq(users.name, decoded.v), gt(users.id, decoded.id)))
            : or(lt(users.name, decoded.v), and(eq(users.name, decoded.v), lt(users.id, decoded.id)));

      if (tupleCondition) {
        pageConditions.push(tupleCondition);
      }
    }

    const pageWhere = pageConditions.length > 0 ? and(...pageConditions) : undefined;

    const rows = await this.db
      .select(SELECT_COLUMNS)
      .from(users)
      .where(pageWhere)
      .orderBy(scanAscending ? asc(sortColumn) : desc(sortColumn), scanAscending ? asc(users.id) : desc(users.id))
      .limit(limit + 1);

    const hasExtra = rows.length > limit;
    const pageRows = hasExtra ? rows.slice(0, limit) : rows;
    const orderedRows = isForward ? pageRows : pageRows.reverse();

    const edges = orderedRows.map((user) => ({
      node: user,
      cursor: encodeCursor({
        v: sort.field === "CREATED" ? user.createdAt.toISOString() : user.name,
        id: user.id,
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

  async getUserById(id: string) {
    const [user] = await this.db.select(SELECT_COLUMNS).from(users).where(eq(users.id, id));

    if (!user) {
      throw new NotFoundError(`User with id ${id} not found`);
    }

    return user;
  }

  async findByIds(ids: readonly string[]) {
    return this.db.select(SELECT_COLUMNS).from(users).where(inArray(users.id, ids));
  }

  async updateUser(id: string, data: UpdateUser) {
    const [updatedUser] = await this.db.update(users).set(data).where(eq(users.id, id)).returning(SELECT_COLUMNS);

    if (!updatedUser) {
      throw new NotFoundError(`User with id ${id} not found`);
    }

    return updatedUser;
  }
}
