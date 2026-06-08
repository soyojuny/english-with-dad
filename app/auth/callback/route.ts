import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next") ?? "/";
  const redirectPath = nextPath.startsWith("/") ? nextPath : "/";

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = redirectPath;
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(redirectTo);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }
  }

  redirectTo.pathname = "/auth/error";
  const response = NextResponse.redirect(redirectTo);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
