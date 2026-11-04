/**
 * Percent-decodes a pathname the way HTTP routers do before routing, so
 * `/%61dmin` is compared as `/admin`. Falls back to ASCII-only decoding when
 * the input holds malformed UTF-8 escapes, which must not become a bypass.
 */
function decodePathname(pathname: string): string {
  try {
    return decodeURIComponent(pathname)
  } catch {
    return pathname.replace(/%([0-7][0-9a-f])/gi, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
  }
}

/**
 * Canonical form used for comparison: percent-decoded, repeated slashes
 * collapsed, trailing slashes removed (the root `/` stays `/`), lower-cased.
 */
function normalizePath(path: string): string {
  const collapsed = decodePathname(path).replace(/\/{2,}/g, '/')
  let end = collapsed.length
  while (end > 1 && collapsed[end - 1] === '/') {
    end--
  }
  return collapsed.slice(0, end).toLowerCase()
}

/**
 * Whether `pathname` hits the protected `configuredPath`.
 *
 * Matching is case-insensitive, treats trailing and repeated slashes as
 * equivalent, compares percent-decoded paths (so `/%61dmin` and a configured
 * non-ASCII path both work) and covers nested paths: `/admin` protects
 * `/admin/login` but not `/administrator`. Query strings must be stripped
 * before calling. Only the comparison is normalized; callers keep reporting
 * the raw pathname, which stays safe to log.
 */
export function isHoneypotPath(pathname: string, configuredPath: string): boolean {
  const normalized = normalizePath(pathname)
  const target = normalizePath(configuredPath)
  return normalized === target || normalized.startsWith(`${target}/`)
}

/** Extracts the pathname of a raw request URL, dropping query and fragment. */
export function requestPathname(url: string | undefined): string {
  const raw = url ?? '/'
  const end = [raw.indexOf('?'), raw.indexOf('#')]
    .filter((index) => index !== -1)
    .reduce((min, index) => Math.min(min, index), raw.length)
  return raw.slice(0, end) || '/'
}
