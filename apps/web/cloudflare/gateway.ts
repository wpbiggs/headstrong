export interface PreviewGateway {
  enabled: boolean;
  verify: (request: Request) => Promise<string>;
  limit: (key: string) => Promise<{ success: boolean }>;
  api: (request: Request) => Promise<Response>;
  web: (request: Request) => Promise<Response>;
}

export async function previewGateway(
  request: Request,
  options: PreviewGateway,
): Promise<Response> {
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
  const fail = (error: string, status: number) =>
    Response.json({ error }, { status, headers });
  if (!options.enabled)
    return fail("Private synthetic-data preview is disabled.", 503);
  try {
    let subject: string;
    try {
      subject = await options.verify(request);
    } catch {
      return fail("Cloudflare Access authentication required.", 401);
    }
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      if (!(await options.limit(subject)).success)
        return fail("Too many requests.", 429);
      if (!["GET", "POST"].includes(request.method))
        return fail("Method not allowed.", 405);
      if (
        request.method === "POST" &&
        request.headers.get("Origin") !== url.origin
      )
        return fail("Cross-origin writes are forbidden.", 403);
      const path = url.pathname.slice(4);
      if (
        !/^\/learning\/goals(?:\/[a-f0-9-]{36}(?:\/(?:quest|evidence|feedback|satisfaction))?)?$/.test(
          path,
        ) &&
        path !== "/auth/logout"
      )
        return fail("Not found.", 404);
      // Construct a fresh request: never forward Access JWTs, cookies or identity headers.
      const forwarded = new Headers();
      for (const name of ["authorization", "content-type"]) {
        const value = request.headers.get(name);
        if (value) forwarded.set(name, value);
      }
      const response = await options.api(
        new Request(`https://private-api${path}`, {
          method: request.method,
          headers: forwarded,
          ...(request.method === "POST"
            ? { body: request.body, duplex: "half" }
            : {}),
        }),
      );
      const result = new Response(response.body, response);
      for (const [key, value] of Object.entries(headers))
        result.headers.set(key, value);
      return result;
    }
    if (url.pathname === "/")
      return Response.redirect(new URL("/learn", url), 302);
    // Only the reviewed journey and its bundled assets, not demo/admin dashboards.
    if (
      url.pathname !== "/learn" &&
      url.pathname !== "/learn.rsc" &&
      !url.pathname.startsWith("/assets/") &&
      !url.pathname.startsWith("/_next/static/")
    )
      return fail("Not found.", 404);
    if (!["GET", "HEAD"].includes(request.method))
      return fail("Method not allowed.", 405);
    const response = await options.web(request);
    const result = new Response(response.body, response);
    for (const [key, value] of Object.entries(headers))
      result.headers.set(key, value);
    result.headers.set("X-Frame-Options", "DENY");
    return result;
  } catch {
    return fail("Preview unavailable.", 503);
  }
}
