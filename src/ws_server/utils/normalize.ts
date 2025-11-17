export function normalizeDataField(data: unknown): unknown {
  let current = data;
  while (typeof current === 'string') {
    try {
      current = JSON.parse(current);
    } catch (e) {
      break;
    }
  }
  return current;
}
