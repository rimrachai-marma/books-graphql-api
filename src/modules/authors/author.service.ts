import { eq } from "drizzle-orm";
import type { Database } from "../../config/db/database";
import { authors } from "../../drizzle/schema";
import type { NewAuthor, UpdateAuthor } from "./author.types";

export class AuthorService {
  constructor(private db: Database) {}

  async createAuthor(data: NewAuthor) {
    const [author] = await this.db.insert(authors).values(data).returning();
    return author;
  }

  async updateAuthor(id: string, data: UpdateAuthor) {
    const [author] = await this.db
      .update(authors)
      .set(data)
      .where(eq(authors.id, id))
      .returning();
    return author;
  }

  async deleteAuthor(id: string) {
    const [author] = await this.db
      .delete(authors)
      .where(eq(authors.id, id))
      .returning();
    return author;
  }
}
