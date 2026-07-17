export const userTypeDefs = /* GraphQL */ `
  scalar Cursor
  scalar DateTime

  type User {
    id: ID!
    name: String!
    email: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type UserEdge {
    node: User!
    cursor: Cursor!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: Cursor
    endCursor: Cursor
  }

  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  input UserFilterInput {
    search: String
    createdAfter: DateTime
    createdBefore: DateTime
  }

  enum UserSortField {
    NAME
    CREATED_AT
  }

  enum SortDirection {
    ASC
    DESC
  }

  input UserSortInput {
    field: UserSortField!
    direction: SortDirection! = DESC
  }

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
  }

  input UpdateUserInput {
    name: String
    email: String
  }

  type Mutation {
    updateUser(input: UpdateUserInput!): User!
  }
`;
