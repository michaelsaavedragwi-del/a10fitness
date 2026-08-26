import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

async function login(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=1");
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="auth-screen">
      <form className="auth-card" action={login}>
        <h1>Sign in</h1>
        <p className="auth-sub">Strength staff access only.</p>
        {error && <div className="auth-error">Invalid email or password.</div>}
        <label>
          Email
          <input type="email" name="email" required autoFocus autoComplete="username" />
        </label>
        <label>
          Password
          <input type="password" name="password" required autoComplete="current-password" />
        </label>
        <button type="submit" className="btn btn-primary">Sign in</button>
      </form>
    </div>
  );
}
