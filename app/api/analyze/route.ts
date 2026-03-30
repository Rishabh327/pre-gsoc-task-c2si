import { NextRequest, NextResponse } from "next/server";
import { analyzeRepos } from "@/lib/analyzer";
import { AnalyzeResponse } from "@/lib/types";

const MAX_REPOS = 10;

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const rawUrls: unknown = body?.urls;

    if (!Array.isArray(rawUrls)) {
      return NextResponse.json(
        { error: "Request body must have a `urls` array." },
        { status: 400 }
      );
    }

    const urls: string[] = rawUrls
      .filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      .slice(0, MAX_REPOS);

    if (urls.length === 0) {
      return NextResponse.json(
        { error: "No valid URLs provided." },
        { status: 400 }
      );
    }

    const { reports, rateLimit } = await analyzeRepos(urls);

    const response: AnalyzeResponse = {
      reports,
      rateLimit,
      analyzedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const error = err as { message?: string };
    return NextResponse.json(
      { error: error?.message ?? "Internal server error." },
      { status: 500 }
    );
  }
}
