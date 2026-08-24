import { auth } from "@/auth";

export class UnauthorizedError extends Error {}
export class ForbiddenError extends Error {}

/** Every server action / write route must call this, not just hide the UI control. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError("Sign in required");
  return session.user;
}

/** Owner-only writes. Coaches are view-only everywhere, enforced here regardless of what the UI shows. */
export async function requireOwner() {
  const user = await requireUser();
  if (user.role !== "owner") throw new ForbiddenError("Owner role required");
  return user;
}
