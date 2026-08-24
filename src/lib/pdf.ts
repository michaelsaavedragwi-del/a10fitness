/**
 * Server-rendered PDF via headless Chrome. Uses full `puppeteer` (bundled
 * Chromium) locally and `puppeteer-core` + `@sparticuz/chromium` (a binary
 * built for serverless) on Vercel — the standard split, since the serverless
 * Chromium binary is Linux-only and won't run on a local dev machine.
 */
export async function renderReportPdf(url: string, cookieHeader: string): Promise<Buffer> {
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  let browser;
  if (isServerless) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteerCore = await import("puppeteer-core");
    browser = await puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  } else {
    const puppeteer = await import("puppeteer");
    browser = await puppeteer.launch({ headless: true });
  }

  try {
    const page = await browser.newPage();

    // Forward the requester's session cookie so the headless browser hits
    // the same authenticated view, not the login page.
    if (cookieHeader) {
      const cookies = cookieHeader
        .split(";")
        .map((pair) => {
          const idx = pair.indexOf("=");
          if (idx === -1) return null;
          const name = pair.slice(0, idx).trim();
          const value = pair.slice(idx + 1).trim();
          return name ? { name, value, url } : null;
        })
        .filter((c): c is { name: string; value: string; url: string } => c !== null);
      if (cookies.length > 0) await page.setCookie(...cookies);
    }

    await page.goto(url, { waitUntil: "networkidle0" });
    await page.emulateMediaType("print");

    // Cropped tight to the report: size the PDF page to the content's actual
    // rendered height instead of paginating at a fixed Letter size, which is
    // exactly how a footer silently ends up pushed onto a discarded second page.
    const contentHeightPx = await page.evaluate(() => document.documentElement.scrollHeight);

    const pdf = await page.pdf({
      width: "850px",
      height: `${Math.ceil(contentHeightPx) + 2}px`,
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      displayHeaderFooter: false,
      pageRanges: "1",
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
