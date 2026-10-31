import { z } from "zod"
import * as Log from "./log"

const log = Log.create({ service: "schema" })

export function fn<T extends z.ZodType, Result>(schema: T, cb: (input: z.infer<T>) => Result) {
  const result = (input: z.infer<T>) => {
    let parsed
    try {
      parsed = schema.parse(input)
    } catch (e) {
      log.error("schema validation failed", {
        issues:
          e instanceof z.ZodError
            ? e.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            : String(e),
      })
      throw e
    }

    return cb(parsed)
  }
  result.force = (input: z.infer<T>) => cb(input)
  result.schema = schema
  return result
}
