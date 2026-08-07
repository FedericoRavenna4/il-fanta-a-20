import { NextResponse, type NextRequest } from "next/server";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase/authenticated.server";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = safeNext(request.nextUrl.searchParams.get("next"));
  if (code) {
    const supabase = await createAuthenticatedSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, request.url));
  }
  return NextResponse.redirect(new URL("/account/accedi?auth_error=1", request.url));
}
