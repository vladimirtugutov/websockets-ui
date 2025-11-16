export function parseCommandData<T>(
  data: unknown,
  validator: (d: unknown) => d is T,
  commandName = 'unknown'
): { payload?: T; error?: string } {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

    if (validator(parsed)) {
      return { payload: parsed };
    } else {
      return {
        error: `[${commandName}] Invalid structure`,
      };
    }
  } catch (e) {
    return {
      error: `[${commandName}] Invalid JSON: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}