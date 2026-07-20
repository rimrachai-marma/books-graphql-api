import { db, client } from "../config/db/database";
import { authors, books, reviews, users } from "./schema";
import { PasswordHasher } from "../utils/password";

const passwordHasher = new PasswordHasher();

const DAY = 24 * 60 * 60 * 1000;

/** Random date between `minDaysAgo` and `maxDaysAgo` days before now. */
function randomPastDate(minDaysAgo: number, maxDaysAgo: number): Date {
  const min = Date.now() - maxDaysAgo * DAY;
  const max = Date.now() - minDaysAgo * DAY;
  return new Date(min + Math.random() * (max - min));
}

/** Random date between `after` and now (or `after` + maxDaysLater, whichever is sooner). */
function randomDateAfter(after: Date, maxDaysLater: number): Date {
  const min = after.getTime();
  const max = Math.min(Date.now(), min + maxDaysLater * DAY);
  return new Date(min + Math.random() * Math.max(max - min, 0));
}

const AUTHOR_NAMES = [
  "Frank Herbert",
  "Ursula K. Le Guin",
  "Isaac Asimov",
  "Octavia E. Butler",
  "Ted Chiang",
  "Liu Cixin",
];

const BOOK_TITLES_BY_AUTHOR: Record<string, string[]> = {
  "Frank Herbert": ["Dune", "Dune Messiah", "Children of Dune"],
  "Ursula K. Le Guin": ["The Left Hand of Darkness", "The Dispossessed"],
  "Isaac Asimov": ["Foundation", "I, Robot", "The Caves of Steel"],
  "Octavia E. Butler": ["Kindred", "Parable of the Sower"],
  "Ted Chiang": ["Stories of Your Life and Others", "Exhalation"],
  "Liu Cixin": ["The Three-Body Problem"],
};

const SEED_USERS = [
  { name: "Admin User", email: "admin@example.com", password: "Admin123!", role: "ADMIN" as const },
  { name: "Alice Nguyen", email: "alice@example.com", password: "Password1!", role: "USER" as const },
  { name: "Kethi", email: "kethi@example.com", password: "Password1!", role: "USER" as const },
  { name: "Carla Mendes", email: "carla@example.com", password: "Password1!", role: "USER" as const },
];

const REVIEW_SNIPPETS = [
  { rating: 5, content: "Couldn't put it down, the world-building is incredible." },
  { rating: 4, content: "Slow start but the payoff is worth it." },
  { rating: 5, content: "A genuine classic, holds up on reread." },
  { rating: 3, content: "Good ideas, pacing dragged in the middle third." },
  { rating: 4, content: "Prose is dense but rewarding." },
];

async function resetTables() {
  console.log("🧹 Clearing existing data...");
  // Order matters: children before parents (FKs cascade, but being explicit is clearer)
  await db.delete(reviews);
  await db.delete(books);
  await db.delete(authors);
  await db.delete(users);
}

async function seedUsers() {
  console.log("👤 Seeding users...");

  const rows = await Promise.all(
    SEED_USERS.map(async (u) => {
      const createdAt = randomPastDate(30, 180); // spread over the last ~6 months
      return {
        name: u.name,
        email: u.email,
        role: u.role,
        hashedPassword: await passwordHasher.hash(u.password),
        createdAt,
        updatedAt: createdAt,
      };
    }),
  );

  const inserted = await db.insert(users).values(rows).returning();
  console.log(`   -> ${inserted.length} users created`);
  return inserted;
}

async function seedAuthors() {
  console.log("✍️  Seeding authors...");

  const rows = AUTHOR_NAMES.map((name) => {
    const createdAt = randomPastDate(60, 200); // authors "added" well before books
    return { name, createdAt, updatedAt: createdAt };
  });

  const inserted = await db.insert(authors).values(rows).returning();
  console.log(`   -> ${inserted.length} authors created`);
  return inserted;
}

async function seedBooks(
  insertedAuthors: (typeof authors.$inferSelect)[],
  insertedUsers: (typeof users.$inferSelect)[],
) {
  console.log("📚 Seeding books...");

  const nonAdminUsers = insertedUsers.filter((u) => u.role === "USER");

  const values = insertedAuthors.flatMap((author, authorIdx) => {
    const titles = BOOK_TITLES_BY_AUTHOR[author.name] ?? [];
    const owner = nonAdminUsers[authorIdx % nonAdminUsers.length]!;

    return titles.map((title) => {
      // book "added" sometime after its owner joined
      const createdAt = randomDateAfter(owner.createdAt, 90);
      return {
        title,
        authorId: author.id,
        userId: owner.id,
        createdAt,
        updatedAt: createdAt,
      };
    });
  });

  const inserted = await db.insert(books).values(values).returning();
  console.log(`   -> ${inserted.length} books created`);
  return inserted;
}

async function seedReviews(insertedBooks: (typeof books.$inferSelect)[], insertedUsers: (typeof users.$inferSelect)[]) {
  console.log("⭐ Seeding reviews...");

  const nonAdminUsers = insertedUsers.filter((u) => u.role === "USER");

  const values = insertedBooks.flatMap((book, bookIdx) => {
    // give each book 1-2 reviews from different users, skipping the book's own owner
    const reviewers = nonAdminUsers.filter((u) => u.id !== book.userId);

    return reviewers.slice(0, 2).map((reviewer, i) => {
      const snippet = REVIEW_SNIPPETS[(bookIdx + i) % REVIEW_SNIPPETS.length]!;
      // review posted sometime after the book existed
      const createdAt = randomDateAfter(book.createdAt, 45);
      return {
        bookId: book.id,
        userId: reviewer.id,
        rating: snippet.rating,
        content: snippet.content,
        createdAt,
        updatedAt: createdAt,
      };
    });
  });

  const inserted = await db.insert(reviews).values(values).returning();
  console.log(`   -> ${inserted.length} reviews created`);
  return inserted;
}

async function main() {
  const shouldReset = process.argv.includes("--reset");

  if (shouldReset) {
    await resetTables();
  }

  const insertedUsers = await seedUsers();
  const insertedAuthors = await seedAuthors();
  const insertedBooks = await seedBooks(insertedAuthors, insertedUsers);
  await seedReviews(insertedBooks, insertedUsers);

  console.log("\n✅ Seed complete.");
  console.log("   Login with e.g. alice@example.com / Password1!");
}

main()
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
