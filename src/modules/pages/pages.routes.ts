import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.render("index", { title: "Books GraphQL API" });
});

router.get("/login", (_req, res) => {
  res.render("login", { title: "Login" });
});

router.get("/signup", (_req, res) => {
  res.render("signup", { title: "Sign Up" });
});

export default router;
