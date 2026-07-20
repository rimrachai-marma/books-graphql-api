import { defaultFieldResolver, type GraphQLFieldConfig, type GraphQLSchema } from "graphql";
import { getDirective, MapperKind, mapSchema } from "@graphql-tools/utils";

import type { GraphQLContext } from "../types/context";
import { AuthenticationError, ForbiddenError } from "./errors";

/**
 * Applies @auth and @admin field-level directives by wrapping the field's
 * resolver with an inline authentication/authorization check.
 */
export function applyDirectiveTransformers(schema: GraphQLSchema): GraphQLSchema {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLFieldConfig<unknown, GraphQLContext>) => {
      const adminDirective = getDirective(schema, fieldConfig, "admin")?.[0];
      const authDirective = getDirective(schema, fieldConfig, "auth")?.[0];

      if (!adminDirective && !authDirective) {
        return fieldConfig;
      }

      const { resolve = defaultFieldResolver } = fieldConfig;

      fieldConfig.resolve = (source, args, context, info) => {
        if (!context.user) {
          if (context.authError === "INVALID_TOKEN") {
            throw new AuthenticationError("Invalid or expired token");
          }
          throw new AuthenticationError("Authentication required");
        }

        if (adminDirective && context.user.role !== "ADMIN") {
          throw new ForbiddenError("Admin access required");
        }

        return resolve(source, args, context, info);
      };

      return fieldConfig;
    },
  });
}
