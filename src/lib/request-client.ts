export function getRequestClientKey(request: Request) {
  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwardedIp = request.headers
    .get("x-forwarded-for")
    ?.split(",")
    .at(0)
    ?.trim();
  return (realIp || forwardedIp || "unknown-client").slice(0, 100);
}
