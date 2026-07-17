import { makeExecutableSchema } from "@graphql-tools/schema";

import { userTypeDefs } from "../modules/users/user.typeDefs";
import { userResolvers } from "../modules/users/user.resolvers";
import { bookTypeDefs } from "../modules/books/book.typeDefs";
import { bookResolvers } from "../modules/books/book.resolvers";
import { authorTypeDefs } from "../modules/authors/author.typeDefs";
import { authorResolvers } from "../modules/authors/author.resolvers";
import { reviewTypeDefs } from "../modules/reviews/review.typeDefs";
import { reviewResolvers } from "../modules/reviews/review.resolvers";

export const schema = makeExecutableSchema({
  typeDefs: [userTypeDefs, bookTypeDefs, authorTypeDefs, reviewTypeDefs],
  resolvers: [userResolvers, bookResolvers, authorResolvers, reviewResolvers],
});
