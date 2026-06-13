export function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

export function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (_) {}
}

export function removeStorage(key: string) {
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}

export function readIntStorage(
  key: string,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = parseInt(readStorage(key) || "", 10);
  return !isNaN(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}
