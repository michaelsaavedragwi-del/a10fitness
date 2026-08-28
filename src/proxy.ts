import { NextResponse } from "next/server";
import { auth } from "@/auth";

const OWNER_ONLY_ROUTES = [
  /^\/athletes\/new$/,
  /^\/athletes\/[^/]+\/edit$/,
  /^\/athletes\/[^/]+\/tests\/new$/,
  /^\/athletes\/[^/]+\/tests\/[^/]+\/edit$/,
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/cron")) {
    return;
  }

  const isLoggedIn = !!req.auth;
  const isLoginRoute = pathname === "/login";
  const isChangePasswordRoute = pathname === "/change-password";

  if (!isLoggedIn) {
    if (isLoginRoute) return;
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoginRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  const mustChange = req.auth?.user?.mustChangePassword;
  if (mustChange && !isChangePasswordRoute) {
    return NextResponse.redirect(new URL("/change-password", req.nextUrl));
  }
  if (!mustChange && isChangePasswordRoute) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  const isOwner = req.auth?.user?.role === "owner";
  if (!isOwner && OWNER_ONLY_ROUTES.some((re) => re.test(pathname))) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)"],
};
