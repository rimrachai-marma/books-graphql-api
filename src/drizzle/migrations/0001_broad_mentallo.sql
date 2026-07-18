CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'USER' NOT NULL;--> statement-breakpoint
CREATE INDEX "books_created_at_id_idx" ON "books" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "books_title_id_idx" ON "books" USING btree ("title","id");