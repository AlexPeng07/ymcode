import { cmd } from "./cmd"
import { migrateFromMimocode } from "../../installation/migrate"

export const MigrateCommand = cmd({
  command: "migrate",
  describe: "copy legacy mimocode config, memory and database into ymcode (never deletes source)",
  builder: (yargs) => yargs.option("dry-run", { type: "boolean", default: false }),
  async handler(args) {
    const result = await migrateFromMimocode({ dryRun: args.dryRun })
    console.log(JSON.stringify(result, null, 2))
  },
})
