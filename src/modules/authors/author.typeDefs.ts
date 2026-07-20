export const authorTypeDefs = /* GraphQL */ `
  scalar Cursor
  scalar DateTime

  type Author {
    id: ID!
    name: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type AuthorEdge {
    node: Author!
    cursor: Cursor!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: Cursor
    endCursor: Cursor
  }

  type AuthorConnection {
    edges: [AuthorEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input AuthorFilterInput {
    nameContains: String
    createdAfter: DateTime
    createdBefore: DateTime
  }

  enum AuthorSortField {
    NAME
    CREATED
  }

  enum SortDirection {
    ASC
    DESC
  }

  input AuthorSortInput {
    field: AuthorSortField! = CREATED
    direction: SortDirection! = DESC
  }

  type Query {
    author(id: ID!): Author
    authors(
      filter: AuthorFilterInput
      sort: AuthorSortInput!
      first: Int
      after: Cursor
      last: Int
      before: Cursor
    ): AuthorConnection!
  }

  input CreateAuthorInput {
    name: String!
  }

  input UpdateAuthorInput {
    name: String
  }

  type Mutation {
    createAuthor(input: CreateAuthorInput!): Author! @auth @admin
    updateAuthor(id: ID!, input: UpdateAuthorInput!): Author @auth @admin
    deleteAuthor(id: ID!): Author @auth @admin
  }
`;
