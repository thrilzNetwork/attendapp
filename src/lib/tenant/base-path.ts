// Tenant path helper for the fukin engine running inside attenda.
// Routes live at /api/tenant/<tenant>/... and pages at /<tenant>/...
// The tenant slug is threaded at call sites via useTenant() (client) or params (server).

export function tenantApi(tenant: string, path: string): string {
  const clean = path.replace(/^\/api\//, '')
  return `/api/tenant/${tenant}/${clean}`
}

export function withBase(path: string): string {
  // legacy name from the CO port — identity inside attenda (no basePath prefix)
  return path
}
