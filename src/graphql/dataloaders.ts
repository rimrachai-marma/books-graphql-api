import DataLoader from "dataloader";

import type { Database } from "../config/db/database";
import type { User } from "../modules/users/user.types";
import { UserService } from "../modules/users/user.service";
import { AuthorService } from "../modules/authors/author.service";
import type { Author } from "../modules/authors/author.types";

function createUserLoader(db: Database) {
  const userService = new UserService(db);

  return new DataLoader<string, User | undefined>(async (ids) => {
    const rows = await userService.findByIds(ids);

    const userMapById = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => userMapById.get(id));
  });
}

function createAuthorLoader(db: Database) {
  const authorService = new AuthorService(db);

  return new DataLoader<string, Author | undefined>(async (ids) => {
    const rows = await authorService.findByIds(ids);

    const authorMapById = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => authorMapById.get(id));
  });
}

export function createLoaders(db: Database) {
  return {
    userLoader: createUserLoader(db),
    authorLoader: createAuthorLoader(db),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
