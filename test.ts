import { JWTService } from "./src/utils/jwt";

async function main() {
  const service = new JWTService("dev-secret-at-least-32-characters-long", "15m");

  const token = await service.sign({
    id: "user_123",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "user",
  });

  console.log("Token:", token);

  const payload = await service.verify(token);
  console.log("Verified payload:", payload);

  const invalid = await service.verify("garbage.token.value");
  console.log("Invalid token result (should be null):", invalid);
}

main();
