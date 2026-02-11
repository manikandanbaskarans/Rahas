/**
 * Secure memory cleanup utilities.
 * Ensures sensitive data (keys, passwords) are wiped from memory
 * when no longer needed.
 */

export function clearString(str?: string): void {
  void str;
  // JavaScript strings are immutable - this is a best-effort approach.
  // In practice, we rely on garbage collection and avoid storing
  // sensitive strings in long-lived references.
  // The real protection is ensuring we don't store plaintext in state.
}

export function clearBuffer(buffer: ArrayBuffer): void {
  const view = new Uint8Array(buffer);
  crypto.getRandomValues(view); // overwrite with random data
  view.fill(0);
}

export function clearTypedArray(arr: Uint8Array): void {
  crypto.getRandomValues(arr);
  arr.fill(0);
}

/**
 * Schedules auto-clear for clipboard after specified timeout.
 */
export function clipboardAutoClear(timeoutMs: number = 30000): void {
  setTimeout(async () => {
    try {
      await navigator.clipboard.writeText('');
    } catch {
      // Clipboard API may not be available
    }
  }, timeoutMs);
}

/**
 * Copy text to clipboard with auto-clear.
 */
export async function secureCopy(text: string, clearAfterMs: number = 30000): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    clipboardAutoClear(clearAfterMs);
    return true;
  } catch {
    return false;
  }
}

/**
 * Tracks sensitive objects for cleanup on navigation/lock.
 */
class SensitiveDataTracker {
  private buffers: Set<ArrayBuffer> = new Set();
  private cleanupCallbacks: Set<() => void> = new Set();

  track(buffer: ArrayBuffer): void {
    this.buffers.add(buffer);
  }

  onCleanup(callback: () => void): void {
    this.cleanupCallbacks.add(callback);
  }

  clearAll(): void {
    for (const buffer of this.buffers) {
      clearBuffer(buffer);
    }
    this.buffers.clear();

    for (const callback of this.cleanupCallbacks) {
      try {
        callback();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.cleanupCallbacks.clear();
  }
}

export const sensitiveData = new SensitiveDataTracker();
