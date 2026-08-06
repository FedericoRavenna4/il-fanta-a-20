import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { getSupabasePublicConfig } from "./config";
import { evaluateAdminIdentity, normalizeAdminEmail } from "@/lib/admin-import/auth-logic";

function developmentProxyLog(pathname: string, destination: string | null) {
  if (process.env.NODE_ENV !== "development") return;
  console.info("[admin/proxy]", { pathname, redirect: destination });
}

export async function refreshAdminSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabasePublicConfig();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isLogin = pathname === "/admin/login";
  const email = normalizeAdminEmail(user?.email);
  const authorized = evaluateAdminIdentity(email, process.env.ADMIN_IMPORT_EMAILS) === "authorized";

  if (user && !authorized) {
    await supabase.auth.signOut();
    const target = request.nextUrl.clone();
    target.pathname = "/admin/login";
    target.search = "?denied=1";
    developmentProxyLog(pathname, `${target.pathname}${target.search}`);
    const redirectResponse = NextResponse.redirect(target);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }
  if (!user && !isLogin) {
    const target = request.nextUrl.clone();
    target.pathname = "/admin/login";
    target.search = "";
    developmentProxyLog(pathname, target.pathname);
    return NextResponse.redirect(target);
  }
  if (user && authorized && isLogin) {
    const target = request.nextUrl.clone();
    target.pathname = "/admin/importazioni";
    target.search = "";
    developmentProxyLog(pathname, target.pathname);
    return NextResponse.redirect(target);
  }
  developmentProxyLog(pathname, null);
  return response;
}
