export function expectedDigestDate(now = new Date()) {
  // The daily edition is due at 19:00 Bangkok (12:00 UTC), not midnight.
  return new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function digestIsCurrent(summary: { dateISO?: string } | undefined, dateISO = expectedDigestDate()) {
  const savedDate = summary?.dateISO;
  return isDigestDate(savedDate) && savedDate >= dateISO;
}

export function isDigestDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
