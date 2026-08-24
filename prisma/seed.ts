import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_OWNER_EMAIL ?? "owner@example.com").toLowerCase().trim();
  const name = process.env.SEED_OWNER_NAME ?? "Head Coach";
  const password = process.env.SEED_OWNER_PASSWORD ?? "changeme123";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Owner account already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, name, passwordHash, role: "owner", mustChangePassword: true },
  });

  console.log(`Created owner account: ${email} / ${password}`);
  console.log("You will be required to change this password on first login.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
