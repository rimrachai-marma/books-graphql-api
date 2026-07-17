export const reviewTypeDefs = /* GraphQL */ `
  scalar Cursor
  scalar DateTime

  type Review {
    id: ID!
    rating: Int!
    content: String!
    bookId: ID!
    userId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!

    user: User!
    book: Book!
  }

  type ReviewEdge {
    node: Review!
    cursor: Cursor!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: Cursor
    endCursor: Cursor
  }

  type ReviewConnection {
    edges: [ReviewEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type Query {
    reviews(
      bookId: ID!
      first: Int
      after: Cursor
      last: Int
      before: Cursor
    ): ReviewConnection!
  }

  input CreateReviewInput {
    bookId: ID!
    rating: Int!
    content: String!
  }

  type Mutation {
    createReview(input: CreateReviewInput!): Review!
    deleteReview(id: ID!): Review
  }
`;
