import { NextResponse } from "next/server";
import { runNightlySync } from "@/lib/hawkin/sync";

export async function GET(request: Request) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically when
  // CRON_SECRET is set as a project env var. `x-cron-secret` is kept as a
  // fallback for triggering this manually (curl, another scheduler, etc).
  const authHeader = request.headers.get("authorization");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const secret = bearerSecret ?? request.headers.get("x-cron-secret");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runNightlySync();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
