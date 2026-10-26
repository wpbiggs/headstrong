export function renderPreviewRequest(
  request: Request,
  assets: { fetch(request: Request): Promise<Response> },
  render: (request: Request) => Promise<Response>,
) {
  const path = new URL(request.url).pathname;
  // The gateway verifies Access before calling this dispatcher. The custom
  // vinext entry does not enumerate the client-build manifest in this build.
  return path.startsWith("/_next/static/") || path.startsWith("/assets/")
    ? assets.fetch(request)
    : render(request);
}
