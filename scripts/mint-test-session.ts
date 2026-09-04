import { mintTestSession, userIdFromEmail } from "../src/lib/auth/session";

async function main() {
  const email = process.argv[2] ?? "verify@local.test";
  const name = process.argv[3] ?? "Verify";

  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to mint a test session in production");
  }
  process.env.AUTH_TEST_MINT = "1";
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }

  const cookie = await mintTestSession({ email, name });
  process.stdout.write(
    JSON.stringify({
      cookie,
      userId: userIdFromEmail(email),
      email,
      name,
    }),
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
