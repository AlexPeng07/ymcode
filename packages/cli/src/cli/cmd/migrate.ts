import { cmd } from "./cmd"
import { migrateFromymcode } from "../../installation/migrate"

export const MigrateCommand = cmd({
  command: "migrate",
  describe: "将旧版 mimocode 配置、记忆和数据库复制到 ymcode（不会删除源数据）",
  builder: (yargs) => yargs.option("dry-run", { type: "boolean", default: false }),
  async handler(args) {
    const result = await migrateFromymcode({ dryRun: args.dryRun })
    console.log(JSON.stringify(result, null, 2))
  },
})
