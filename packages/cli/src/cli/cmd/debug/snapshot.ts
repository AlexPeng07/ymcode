import { AppRuntime } from "@/effect/app-runtime"
import { Snapshot } from "../../../snapshot"
import { bootstrap } from "../../bootstrap"
import { cmd } from "../cmd"

export const SnapshotCommand = cmd({
  command: "snapshot",
  describe: "快照调试工具",
  builder: (yargs) => yargs.command(TrackCommand).command(PatchCommand).command(DiffCommand).demandCommand(),
  async handler() {},
})

const TrackCommand = cmd({
  command: "track",
  describe: "跟踪当前快照状态",
  async handler() {
    await bootstrap(process.cwd(), async () => {
      console.log(await AppRuntime.runPromise(Snapshot.Service.use((svc) => svc.track())))
    })
  },
})

const PatchCommand = cmd({
  command: "patch <hash>",
  describe: "显示指定快照哈希的补丁",
  builder: (yargs) =>
    yargs.positional("hash", {
      type: "string",
      description: "哈希",
      demandOption: true,
    }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      console.log(await AppRuntime.runPromise(Snapshot.Service.use((svc) => svc.patch(args.hash))))
    })
  },
})

const DiffCommand = cmd({
  command: "diff <hash>",
  describe: "显示指定快照哈希的差异",
  builder: (yargs) =>
    yargs.positional("hash", {
      type: "string",
      description: "哈希",
      demandOption: true,
    }),
  async handler(args) {
    await bootstrap(process.cwd(), async () => {
      console.log(await AppRuntime.runPromise(Snapshot.Service.use((svc) => svc.diff(args.hash))))
    })
  },
})
