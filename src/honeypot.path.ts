/**
 * Removes the trailing slashes of a pathname (`/admin/` -> `/admin`).
 * The root `/` stays `/`.
 */
function normalizePath(path: string): string {
  let end = path.length
  while (end > 1 && path[end - 1] === '/') {
    end--
  }
  return path.slice(0, end).toLowerCase()
}

/**
 * Whether `pathname` hits the protected `configuredPath`.
 *
 * Matching is case-insensitive, treats trailing slashes as equivalent and
 * covers nested paths: `/admin` protects `/admin/login` but not
 * `/administrator`. Query strings must be stripped before calling.
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
