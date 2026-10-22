import { AppRuntime } from "@/effect/app-runtime"
import { InstanceBootstrap } from "../project/bootstrap"
import { Instance } from "../project/instance"
import { SessionCheckpoint } from "@/session/checkpoint"
import { drainInstinctObservers } from "@/session/instinct-observer"
import { Log } from "@/util"
import { HostErrorRegistry } from "@/error/host-registry"

const log = Log.create({ service: "cli.bootstrap" })

export async function bootstrap<T>(directory: string, cb: () => Promise<T>) {
  HostErrorRegistry.initializeHostErrorCatalog()
  return Instance.provide({
    directory,
    init: () => AppRuntime.runPromise(InstanceBootstrap),
    fn: async () => {
      try {
        return await cb()
      } finally {
        // Give detached background checkpoint writers a chance to finish
        // before teardown. Headless `ymcode run` would otherwise exit right
        // after the main response, killing any forked writer mid-LLM-call
        // and leaving zero checkpoint files on disk.
        //
        // Up to 120s for ALL pending writers collectively. Writers that
        // don't settle in time are abandoned — the runtime teardown will
        // kill them anyway, and their thresholds stay marked so the next
        // process invocation can observe the gap via fireCheckpoints.
        await AppRuntime.runPromise(
          SessionCheckpoint.Service.use((svc) => svc.drainWriters()),
        ).catch((err) => log.warn("checkpoint drain failed", { error: String(err) }))
        // A checkpoint success spawns the instinct-observer fire-and-forget;
        // without this wait the same teardown would kill the freshly spawned
        // observer before its LLM loop writes any candidate.
        await drainInstinctObservers().catch((err) =>
          log.warn("instinct observer drain failed", { error: String(err) }),
        )
        await Instance.dispose()
      }
    },
  })
}
