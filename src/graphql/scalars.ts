import { GraphQLScalarType, Kind } from "graphql";

export const scalarResolvers = {
  DateTime: new GraphQLScalarType({
    name: "DateTime",
    description: "ISO-8601 date-time scalar",

    serialize(value) {
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "string") return new Date(value).toISOString();
      throw new TypeError("DateTime must be a Date or ISO string");
    },

    parseValue(value) {
      if (typeof value !== "string") throw new TypeError("DateTime must be a string");

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) throw new TypeError("Invalid DateTime string");

      return date;
    },

    parseLiteral(ast) {
      if (ast.kind !== Kind.STRING) throw new TypeError("DateTime must be a string literal");

      const date = new Date(ast.value);
      if (Number.isNaN(date.getTime())) throw new TypeError("Invalid DateTime string");

      return date;
    },
  }),

  Cursor: new GraphQLScalarType({
    name: "Cursor",
    description: "Opaque pagination cursor",

    serialize(value) {
      if (typeof value !== "string") throw new TypeError("Cursor must be a string");
      return value;
    },
    parseValue(value) {
      if (typeof value !== "string") throw new TypeError("Cursor must be a string");
      return value;
    },
    parseLiteral(ast) {
      if (ast.kind !== Kind.STRING) throw new TypeError("Cursor must be a string literal");
      return ast.value;
    },
  }),
};
