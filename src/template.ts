/** Escapes a value interpolated into HTML text or a double-quoted attribute. */
export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Built-in decoy: a plain admin login page. The form posts back to the
 * configured honeypot path; submitted values are never read or stored.
 */
export function renderDefaultLoginPage(actionPath: string): string {
  const action = escapeHtml(actionPath)
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Admin Login</title>
<style>
:root { color-scheme: light dark; }
body {
  margin: 0;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  background: #f2f4f7;
  color: #1f2933;
}
form {
  width: 100%;
  max-width: 22rem;
  margin: 1rem;
  padding: 2rem;
  background: #ffffff;
  border: 1px solid #d9e2ec;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgb(31 41 51 / 0.08);
  box-sizing: border-box;
}
h1 {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
}
p {
  margin: 0 0 1.5rem;
  color: #616e7c;
  font-size: 0.875rem;
}
label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
}
input {
  width: 100%;
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd2d9;
  border-radius: 6px;
  box-sizing: border-box;
  font-size: 1rem;
}
button {
  width: 100%;
  padding: 0.625rem;
  border: 0;
  border-radius: 6px;
  background: #1a56db;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}
</style>
</head>
<body>
<form method="POST" action="${action}">
<h1>Administration</h1>
<p>Sign in to your account</p>
<label for="username">Username</label>
<input id="username" name="username" type="text" autocomplete="username" required>
<label for="password">Password</label>
<input id="password" name="password" type="password" autocomplete="current-password" required>
<button type="submit">Sign in</button>
</form>
</body>
</html>
`
}
