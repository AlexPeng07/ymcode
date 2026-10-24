import matter from "gray-matter"
import z from "zod"

export const Status = z.enum(["candidate", "active", "retired"])
export type Status = z.infer<typeof Status>

export const Source = z.enum(["correction", "repetition", "decision"])
export type Source = z.infer<typeof Source>

export const Evidence = z.object({
  session: z.string().min(1),
  date: z.string().min(1),
  quote: z.string().optional(),
})
export type Evidence = z.infer<typeof Evidence>

export const Info = z.object({
  id: z.string().regex(/^ins_[a-z0-9]{8,}$/),
  description: z.string().min(1).max(200),
  status: Status,
  confidence: z.number().min(0).max(1),
  evidence: z.array(Evidence).min(1),
  source: Source,
  created_at: z.string(),
  updated_at: z.string(),
  last_seen_at: z.string(),
  contradictions: z.number().int().min(0).default(0),
  // Usage loop: how often the rule was actually recalled (instinct tool get),
  // and when. Never-recalled active rules decay faster than their evidence age
  // alone suggests. Both optional so files written before the field existed
  // parse with usage_count 0.
  usage_count: z.number().int().min(0).default(0),
  last_used_at: z.string().optional(),
})
export type Info = z.infer<typeof Info>

export function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function normalizeDate(value: unknown, dateOnly = false): unknown {
  if (!(value instanceof Date)) return value
  return dateOnly ? value.toISOString().slice(0, 10) : value.toISOString()
}

export function parse(text: string): { info: Info; body: string } {
  const fm = matter(text)
  const data = { ...fm.data }
  for (const key of ["created_at", "updated_at", "last_seen_at"]) {
    data[key] = normalizeDate(data[key])
  }
  if (Array.isArray(data.evidence)) {
    data.evidence = data.evidence.map((entry) => ({
      ...entry,
      date: normalizeDate(entry.date, true),
    }))
  }
  return { info: Info.parse(data), body: fm.content.trim() }
}

export function serialize(info: Info, body: string): string {
  const parsed = Info.parse(info)
  // js-yaml cannot dump undefined values; optional fields (last_used_at) may
  // legitimately be absent, so drop them from the frontmatter payload.
  for (const key of Object.keys(parsed)) {
    if (parsed[key as keyof typeof parsed] === undefined) delete parsed[key as keyof typeof parsed]
  }
  return matter.stringify(body.trim() + "\n", parsed)
}
