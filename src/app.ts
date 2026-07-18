import path from "path";
import express from "express";
import morgan from "morgan";

import authRoutes from "./modules/auth/auth.routes";
import pageRoutes from "./modules/pages/pages.routes";
import { yoga } from "./graphql/server";
import { errorHandler, routeNotFound } from "./middleware/errorHandler";

export const app = express();

// Views & static assets
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Body Parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Logging & Dev Middleware
app.use(morgan("dev"));

// Server-rendered pages (landing / login / signup)
app.use("/", pageRoutes);

// REST Routes
app.use("/api/auth", authRoutes);

// GraphQL endpoint
app.use(yoga.graphqlEndpoint, yoga);

app.use(routeNotFound);
app.use(errorHandler);
