import { auth } from "./auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthRoute = pathname.startsWith("/api/auth");
  const isAccessDenied = pathname.startsWith("/access-denied");

  if (isAuthRoute || isAccessDenied) {
    return NextResponse.next();
  }

  const session = req.auth;
  const signedIn = Boolean(session?.user?.email && session?.user?.role);

  if (session?.error === "NotAllowlisted") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const denied = req.nextUrl.clone();
    denied.pathname = "/access-denied";
    return NextResponse.redirect(denied);
  }

  // Allow the login page shell for signed-out users.
  if (pathname === "/" && !signedIn) {
    return NextResponse.next();
  }

  if (!signedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sunday-prototype.html).*)"],
};
