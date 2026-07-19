CREATE INDEX "authors_created_at_id_idx" ON "authors" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "authors_name_id_idx" ON "authors" USING btree ("name","id");--> statement-breakpoint
CREATE INDEX "users_created_at_id_idx" ON "users" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "users_name_id_idx" ON "users" USING btree ("name","id");--> statement-breakpoint
CREATE INDEX "reviews_book_id_created_at_id_idx" ON "reviews" USING btree ("book_id","created_at","id");