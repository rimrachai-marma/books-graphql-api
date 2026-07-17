import { eq } from "drizzle-orm";
import type { Database } from "../../config/db/database";
import { reviews } from "../../drizzle/schema";
import type { NewReview } from "./review.types";

export class ReviewService {
  constructor(private db: Database) {}

  async createReview(data: NewReview) {
    const [review] = await this.db.insert(reviews).values(data).returning();
    return review;
  }

  async deleteReview(id: string) {
    const [review] = await this.db
      .delete(reviews)
      .where(eq(reviews.id, id))
      .returning();
    return review;
  }
}
