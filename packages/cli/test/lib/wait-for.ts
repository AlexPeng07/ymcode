/**
 * Poll `condition` until it holds, bounded by a deadline.
 *
 * Replaces fixed sleeps before event/async assertions: under parallel load a
 * 10ms sleep is a guess about scheduling, while a predicate with a deadline
 * fails only when the asserted outcome genuinely never happens.
 */
export async function waitFor(condition: () => boolean, timeoutMs = 5000, stepMs = 5): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error(`waitFor: condition not met within ${timeoutMs}ms`)
    }
    await Bun.sleep(stepMs)
  }
}

/**
 * Fixed settle window for NEGATIVE assertions (nothing more should arrive).
 * These cannot be predicate-driven; keep the window generous so a loaded
 * runner still gets a fair chance to deliver what must not arrive.
 */
export async function settle(ms = 50): Promise<void> {
  await Bun.sleep(ms)
}
