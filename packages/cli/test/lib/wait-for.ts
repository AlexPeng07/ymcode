import { Duration, Effect } from "effect"

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

/**
 * Effect-flavored deadline polling for generator tests: retries `condition`
 * every `step` until it succeeds, dies with a descriptive defect past the
 * deadline. Replaces fixed `Effect.sleep` guesses before assertions.
 */
export const pollUntil = <E>(
  condition: Effect.Effect<boolean, E>,
  options?: { timeout?: Duration.Input; step?: Duration.Input },
): Effect.Effect<void, E> =>
  Effect.gen(function* () {
    const timeout = options?.timeout ? Duration.toMillis(Duration.fromInputUnsafe(options.timeout)) : 10_000
    const step = options?.step ? Duration.toMillis(Duration.fromInputUnsafe(options.step)) : 10
    const deadline = Date.now() + timeout
    while (!(yield* condition)) {
      if (Date.now() >= deadline) {
        return yield* Effect.die(new Error(`pollUntil: condition not met within ${timeout}ms`))
      }
      yield* Effect.sleep(step)
    }
  })
