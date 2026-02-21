import { prisma } from "../src/core/db/prisma.js";

const email = process.argv[2]?.trim();
const requestedRole = (process.argv[3] || "ADMIN").trim().toUpperCase();

const allowedRoles = new Set(["ADMIN", "SUPER_ADMIN"]);

if (!email) {
  console.error("Usage: npm run user:promote-admin -- <email> [ADMIN|SUPER_ADMIN]");
  process.exit(1);
}

if (!allowedRoles.has(requestedRole)) {
  console.error("Role must be ADMIN or SUPER_ADMIN.");
  process.exit(1);
}

try {
  const result = await prisma.user.updateMany({
    where: { email },
    data: { role: requestedRole },
  });

  if (result.count === 0) {
    console.error(`No user found for email: ${email}`);
    process.exitCode = 1;
  } else {
    console.log(`Updated ${result.count} user(s): ${email} -> ${requestedRole}`);
  }
} finally {
  await prisma.$disconnect();
}

