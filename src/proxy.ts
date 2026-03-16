import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME = "brainfriends_session";
const PROTECTED_PREFIXES = [
  "/select-page",
  "/programs",
  "/report",
  "/result-page",
  "/tools",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if ((pathname === "/" || pathname === "/signup") && hasSession) {
    return NextResponse.redirect(new URL("/select-page/mode", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/signup", "/select-page/:path*", "/programs/:path*", "/report", "/result-page/:path*", "/tools/:path*"],
};
