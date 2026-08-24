import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { requireUser } from "@/lib/auth-helpers";
import { renderReportPdf } from "@/lib/pdf";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const hdrs = await headers();
  const cookieHeader = hdrs.get("cookie") ?? "";
  const host = hdrs.get("host");
  const protocol = host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https";
  const baseUrl = `${protocol}://${host}`;

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderReportPdf(`${baseUrl}/athletes/${id}/report`, cookieHeader);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF generation failed" },
      { status: 500 },
    );
  }

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="progress-report.pdf"`,
    },
  });
}
