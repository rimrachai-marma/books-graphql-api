import { eq, inArray } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import type { UpdateUser } from "./user.types";
import type { Database } from "../../config/db/database";

export class UserService {
  constructor(private db: Database) {}

  async findByIds(ids: readonly string[]) {
    return this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(inArray(users.id, ids));
  }

  async updateUser(id: string, data: UpdateUser) {
    const [updatedUser] = await this.db.update(users).set(data).where(eq(users.id, id)).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    });

    return updatedUser;
  }
}
