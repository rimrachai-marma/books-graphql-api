import { Router } from "express";
import { authenticate, guestGuard } from "../../middleware/auth";

const router = Router();

router.use(authenticate);

// SEND USER DATA TO LOCAL FOR ALL PAGE ROUTE
router.use((req, res, next) => {
  res.locals.user = req.user ?? null;
  next();
});

router.get("/", (_req, res) => {
  res.render("index", { title: "Books GraphQL API" });
});

router.get("/login", guestGuard, (_req, res) => {
  res.render("login", { title: "Login" });
});

router.get("/signup", guestGuard, (_req, res) => {
  res.render("signup", { title: "Sign Up" });
});

export default router;
