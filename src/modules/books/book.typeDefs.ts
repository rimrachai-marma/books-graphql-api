export const bookTypeDefs = /* GraphQL */ `
  scalar Cursor
  scalar DateTime

  type Book {
    id: ID!
    title: String!
    authorId: ID!
    userId: ID!
    createdAt: DateTime!
    updatedAt: DateTime!

    author: Author!
    user: User!
  }

  type BookEdge {
    node: Book!
    cursor: Cursor!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: Cursor
    endCursor: Cursor
  }

  type BookConnection {
    edges: [BookEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input BookFilterInput {
    authorId: ID
    titleContains: String
    createdAfter: DateTime
    createdBefore: DateTime
  }

  enum BookSortField {
    TITLE
    CREATED
  }

  enum SortDirection {
    ASC
    DESC
  }

  input BookSortInput {
    field: BookSortField! = CREATED
    direction: SortDirection! = DESC
  }

  type Query {
    book(id: ID!): Book
    books(
      first: Int
      after: Cursor
      last: Int
      before: Cursor
      filter: BookFilterInput
      sort: BookSortInput!
    ): BookConnection!
  }

  input CreateBookInput {
    title: String!
    authorId: ID!
  }

  input UpdateBookInput {
    title: String
    authorId: ID
  }

  type Mutation @auth {
    createBook(input: CreateBookInput!): Book!
    updateBook(id: ID!, input: UpdateBookInput!): Book
    deleteBook(id: ID!): Book
  }
`;
