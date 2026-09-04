import { NextRequest, NextResponse } from "next/server";
import { withUser } from "@/lib/auth";
import { currentTenant } from "@/lib/tenant";

export const GET = withUser(async (_req: NextRequest) => {
  const { user } = currentTenant();
  return NextResponse.json({
    user: { email: user.email, name: user.name },
  });
});
