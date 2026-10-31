import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "femvita_session";
const PUBLIC = ["/", "/login", "/register"];

// This only checks that a session cookie EXISTS. The backend decides whether it's valid,
// and api() sends you back to /login when it isn't.
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const signedIn = req.cookies.has(COOKIE);
  const isPublic = PUBLIC.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (!signedIn && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  if (signedIn && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the API, Next.js internals, and files with an extension (images, icons...)
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
