# 📚 books-graphql-api

A GraphQL + REST API for managing **Books**, **Authors**, **Reviews**, and **Users**, built with [Bun](https://bun.com), Express, [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server), Drizzle ORM, and PostgreSQL.

Includes cookie-based JWT authentication (access + refresh tokens) with refresh-token rotation and reuse detection, cursor-based (keyset) pagination on all list queries, DataLoader-backed relation resolvers, and a small server-rendered UI for signup/login and a GraphiQL playground.

---

## ✨ Features

- **GraphQL API** for Books, Authors, Reviews, and Users (Relay-style cursor pagination, filtering, sorting)
- **REST auth endpoints** for signup, login, refresh, logout, and session verification
- **JWT auth** via httpOnly cookies (access token + rotating refresh token), with automatic refresh and reuse/compromise detection
- **Role-based access control** (`USER` / `ADMIN`)
- **Drizzle ORM** schema, migrations, and seed script
- **DataLoader** batching for `Book.author`, `Book.user`, `Review.user`, `Review.book`
- Server-rendered landing/login/signup pages with an in-browser GraphQL tester

---

## 🧱 Tech Stack

| Layer       | Technology                              |
| ----------- | --------------------------------------- |
| Runtime     | [Bun](https://bun.com) v1.3+            |
| HTTP server | Express 5                               |
| GraphQL     | graphql-yoga, @graphql-tools/schema     |
| Database    | PostgreSQL                              |
| ORM         | Drizzle ORM + drizzle-kit               |
| Validation  | Zod                                     |
| Auth        | jose (JWT), bcryptjs (password hashing) |
| Views       | EJS                                     |

---

## 📁 Project Structure

```
.
├── index.ts                     # App entrypoint (HTTP server + DB connection check)
├── drizzle.config.ts            # Drizzle Kit config
├── src/
│   ├── app.ts                    # Express app: middleware, routes, GraphQL mount
│   ├── config/db/database.ts     # Postgres client + Drizzle instance
│   ├── drizzle/
│   │   ├── schema/                # Table definitions (users, books, authors, reviews, refreshTokens)
│   │   ├── migrations/            # Generated SQL migrations
│   │   └── seed.ts                # Seed script (bun run db:seed)
│   ├── graphql/                   # Yoga server, schema, context, dataloaders, error handling
│   ├── middleware/                # auth, async handler, validation, error handler
│   ├── modules/
│   │   ├── auth/                  # signup/login/refresh/logout (REST)
│   │   ├── users/, books/, authors/, reviews/   # GraphQL type defs, resolvers, services, validation
│   │   └── pages/                 # Server-rendered routes (/, /login, /signup)
│   ├── public/styles.css
│   ├── utils/                     # AppError, JWTService, PasswordHasher
│   └── views/                     # EJS templates
└── Dockerfile
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```bash
# Server
PORT=4000
NODE_ENV=production

# Database
DATABASE_URL=postgres://user:password@host:5432/dbname

# JWT
JWT_SECRET=replace-with-a-long-random-secret

# Access token
ACCESS_TOKEN_TTL=15m
ACCESS_TOKEN_TTL_MS=900000
ACCESS_TOKEN_COOKIE_NAME=access_token

# Refresh token
REFRESH_TOKEN_TTL=30d
REFRESH_TOKEN_TTL_MS=2592000000
REFRESH_TOKEN_COOKIE_NAME=refresh_token
```

> `JWT_SECRET` and `DATABASE_URL` are required — the app will fail to start / sign tokens without them.

---

## 🚀 Getting Started (local)

```bash
# 1. Install dependencies
bun install

# 2. Configure environment
cp .env.example .env   # then fill in DATABASE_URL, JWT_SECRET, etc.

# 3. Push the schema (or run migrations, see below)
bun run db:push

# 4. (optional) Seed sample data
bun run db:seed

# 5. Run the dev server (hot reload)
bun run dev
```

The server starts on `http://localhost:4000`:

- `http://localhost:4000/` — landing page with sample queries and a live GraphQL tester
- `http://localhost:4000/graphql` — GraphiQL playground (disabled automatically when `NODE_ENV=production`)
- `http://localhost:4000/login`, `/signup` — cookie-based auth pages

### Sample seeded accounts

| Email             | Password   | Role  |
| ----------------- | ---------- | ----- |
| admin@example.com | Admin123!  | ADMIN |
| alice@example.com | Password1! | USER  |
| kethi@example.com | Password1! | USER  |
| carla@example.com | Password1! | USER  |

---

## 📜 NPM/Bun Scripts

| Script                  | Description                                                           |
| ----------------------- | --------------------------------------------------------------------- |
| `bun run start`         | Start the server (`bun run index.ts`)                                 |
| `bun run dev`           | Start with `--watch` for hot reload                                   |
| `bun run db:push`       | Push the Drizzle schema straight to the database (good for local/dev) |
| `bun run db:generate`   | Generate a new SQL migration from schema changes                      |
| `bun run db:migrate`    | Apply pending migrations (recommended for staging/production)         |
| `bun run db:rollback`   | Roll back the last migration                                          |
| `bun run db:studio`     | Open Drizzle Studio                                                   |
| `bun run db:seed`       | Seed the database with sample data                                    |
| `bun run db:seed:reset` | Wipe and reseed the database                                          |

---

## 🔐 REST Auth Endpoints

| Method | Path                   | Body                        | Notes                                                   |
| ------ | ---------------------- | --------------------------- | ------------------------------------------------------- |
| POST   | `/api/auth/signup`     | `{ name, email, password }` | Creates a user, sets cookies                            |
| POST   | `/api/auth/login`      | `{ email, password }`       | Sets `access_token` + `refresh_token` cookies           |
| POST   | `/api/auth/refresh`    | —                           | Uses `refresh_token` cookie, rotates tokens             |
| GET    | `/api/auth/verify`     | —                           | Uses `access_token` cookie, returns current user        |
| POST   | `/api/auth/logout`     | —                           | Revokes the current refresh token, clears cookies       |
| POST   | `/api/auth/logout-all` | —                           | Revokes all refresh tokens for the user (auth required) |

Password rules: 8–16 characters, at least one letter, one number, and one special character.

---

## 🧩 GraphQL API (overview)

```graphql
type Query {
  me: User
  user(userId: ID!): User
  users(
    first: Int
    after: Cursor
    last: Int
    before: Cursor
    filter: UserFilterInput
    sort: UserSortInput!
  ): UserConnection!

  book(id: ID!): Book
  books(
    first: Int
    after: Cursor
    last: Int
    before: Cursor
    filter: BookFilterInput
    sort: BookSortInput!
  ): BookConnection!

  author(id: ID!): Author
  authors(
    filter: AuthorFilterInput
    sort: AuthorSortInput!
    first: Int
    after: Cursor
    last: Int
    before: Cursor
  ): AuthorConnection!

  reviews(bookId: ID!, first: Int, after: Cursor, last: Int, before: Cursor): ReviewConnection!
}

type Mutation {
  updateUser(input: UpdateUserInput!): User!

  createBook(input: CreateBookInput!): Book!
  updateBook(id: ID!, input: UpdateBookInput!): Book
  deleteBook(id: ID!): Book

  createAuthor(input: CreateAuthorInput!): Author! # admin only
  updateAuthor(id: ID!, input: UpdateAuthorInput!): Author # admin only
  deleteAuthor(id: ID!): Author # admin only
  createReview(input: CreateReviewInput!): Review!
  deleteReview(id: ID!): Review
}
```

- Authenticate by sending the `access_token` cookie or an `Authorization: Bearer <token>` header.
- All list queries use Relay-style cursor pagination (`first`/`after` or `last`/`before`) and return `edges`, `pageInfo`, and `totalCount`.

---

## 📄 License

Private/unlicensed — internal project.
