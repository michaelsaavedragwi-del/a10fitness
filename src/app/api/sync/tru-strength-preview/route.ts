import { NextResponse } from "next/server";
import { requireOwner, ForbiddenError, UnauthorizedError } from "@/lib/auth-helpers";
import { buildTruStrengthPreview } from "@/lib/hawkin/truStrengthSync";

export async function GET() {
  try {
    await requireOwner();
  } catch (err) {
    if (err instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (err instanceof ForbiddenError) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw err;
  }

  try {
    const preview = await buildTruStrengthPreview();
    return NextResponse.json(preview);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Sync preview failed" }, { status: 500 });
  }
}
