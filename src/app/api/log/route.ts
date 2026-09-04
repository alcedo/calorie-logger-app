import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/auth";
import { logMeal } from "@/lib/log-meal";
import { encodeSse, wantsStream } from "@/lib/log-trace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = withUser(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const text: string | undefined = body?.text?.trim();
  const date: string =
    body?.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date
      : new Date().toISOString().slice(0, 10);

  if (!text) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }

  const stream = wantsStream(
    req.headers.get("accept"),
    req.nextUrl.searchParams.get("stream"),
  );

  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (event: Parameters<typeof encodeSse>[0]) => {
          controller.enqueue(encoder.encode(encodeSse(event)));
        };
        try {
          const result = await logMeal({ text, date, onEvent: send });
          if (result.logged.length === 0 && result.unresolved.length === 0) {
            send({
              type: "error",
              message: "Could not find any foods in that message",
            });
          }
        } catch (err) {
          send({
            type: "error",
            message: err instanceof Error ? err.message : "Something went wrong",
          });
        } finally {
          controller.close();
        }
      },
    });
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  const result = await logMeal({ text, date });
  if (result.logged.length === 0 && result.unresolved.length === 0) {
    return NextResponse.json(
      { error: "Could not find any foods in that message", trace: result.trace },
      { status: 422 },
    );
  }

  return NextResponse.json({
    logged: result.logged,
    unresolved: result.unresolved,
    usedAiParser: result.usedAiParser,
    trace: result.trace,
  });
});
