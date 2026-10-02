export async function apiRequest(path, { body, headers, ...options } = {}) {
  const requestHeaders = new Headers(headers);
  if (body !== undefined)
    requestHeaders.set("Content-Type", "application/json");

  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      payload.error || "The request could not be completed.",
    );
    error.status = response.status;
    throw error;
  }
  return payload;
}
