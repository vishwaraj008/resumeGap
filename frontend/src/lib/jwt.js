// Decodes a JWT payload client-side (no verification — display only).
export function decodeToken(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Returns true if the token is missing or past its exp claim.
export function isTokenExpired(token) {
  const data = decodeToken(token);
  if (!data?.exp) return true;
  return Date.now() >= data.exp * 1000;
}
