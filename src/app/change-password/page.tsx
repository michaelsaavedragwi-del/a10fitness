import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { updateSession } from "@/auth";

async function changePassword(formData: FormData) {
  "use server";
  const user = await requireUser();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < 8) {
    redirect("/change-password?error=length");
  }
  if (newPassword !== confirmPassword) {
    redirect("/change-password?error=mismatch");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustChangePassword: false },
  });
  await updateSession({ user: { mustChangePassword: false } });

  redirect("/");
}

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { error } = await searchParams;

  return (
    <div className="auth-screen">
      <form className="auth-card" action={changePassword}>
        <h1>Set a new password</h1>
        <p className="auth-sub">This account requires a password change before continuing.</p>
        {error === "length" && <div className="auth-error">Password must be at least 8 characters.</div>}
        {error === "mismatch" && <div className="auth-error">Passwords do not match.</div>}
        <label>
          New password
          <input type="password" name="newPassword" required minLength={8} autoComplete="new-password" />
        </label>
        <label>
          Confirm new password
          <input type="password" name="confirmPassword" required minLength={8} autoComplete="new-password" />
        </label>
        <button type="submit" className="btn btn-primary">Set password</button>
      </form>
    </div>
  );
}
