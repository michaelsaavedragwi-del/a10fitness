import { NextResponse } from "next/server";
import { runNightlySync } from "@/lib/hawkin/sync";
import { runNightlyTruStrengthSync } from "@/lib/hawkin/truStrengthSync";

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

  // Run independently — a failure in one shouldn't block the other from importing.
  const [forcePlate, truStrength] = await Promise.allSettled([runNightlySync(), runNightlyTruStrengthSync()]);

  const ok = forcePlate.status === "fulfilled" && truStrength.status === "fulfilled";
  return NextResponse.json(
    {
      ok,
      forcePlate: forcePlate.status === "fulfilled" ? forcePlate.value : { error: String(forcePlate.reason) },
      truStrength: truStrength.status === "fulfilled" ? truStrength.value : { error: String(truStrength.reason) },
    },
    { status: ok ? 200 : 500 },
  );
}
