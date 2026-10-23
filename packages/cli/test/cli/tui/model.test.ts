import { describe, expect, test } from "bun:test"
import type { Provider } from "@ymcode/sdk/v2"
import { fallback, initial } from "../../../src/cli/cmd/tui/util/model"

const providers = [
  {
    id: "openai",
    models: {
      "gpt-5.6-sol": {},
    },
  },
  {
    id: "ppio",
    models: {
      "deepseek-v3": {},
    },
  },
] as unknown as Provider[]

const withCredentials = [
  {
    id: "openai",
    source: "config",
    options: {},
    models: { "gpt-5.6-sol": {} },
  },
  {
    id: "ppio",
    source: "env",
    options: {},
    models: { "deepseek-v3": {} },
  },
] as unknown as Provider[]

describe("initial model", () => {
  test("restores the most recent model before the configured default", () => {
    expect(
      initial(providers, {
        ready: true,
        recent: [{ providerID: "openai", modelID: "gpt-5.6-sol" }],
        configured: "ppio/deepseek-v3",
      }),
    ).toEqual({ providerID: "openai", modelID: "gpt-5.6-sol" })
  })

  test("keeps an explicit model argument highest priority", () => {
    expect(
      initial(providers, {
        argument: "ppio/deepseek-v3",
        ready: false,
        recent: [{ providerID: "openai", modelID: "gpt-5.6-sol" }],
        configured: "openai/gpt-5.6-sol",
      }),
    ).toEqual({ providerID: "ppio", modelID: "deepseek-v3" })
  })

  test("skips unavailable recent models", () => {
    expect(
      initial(providers, {
        ready: true,
        recent: [{ providerID: "openai", modelID: "removed-model" }],
        configured: "ppio/deepseek-v3",
      }),
    ).toEqual({ providerID: "ppio", modelID: "deepseek-v3" })
  })

  test("waits for recent state before using the configured default", () => {
    expect(
      initial(providers, {
        ready: false,
        recent: [],
        configured: "ppio/deepseek-v3",
      }),
    ).toBeUndefined()
  })
})

describe("fallback model", () => {
  test("prefers the first credentialed provider", () => {
    expect(fallback(withCredentials, { openai: "gpt-5.6-sol", ppio: "deepseek-v3" })).toEqual({
      providerID: "ppio",
      modelID: "deepseek-v3",
    })
  })

  test("stays empty when no provider has a credential", () => {
    expect(fallback(providers, { openai: "gpt-5.6-sol" })).toBeUndefined()
  })

  test("falls back to the first model of a credentialed provider without a default", () => {
    const credentialed = [withCredentials[1]!]
    expect(fallback(credentialed, {})).toEqual({
      providerID: "ppio",
      modelID: "deepseek-v3",
    })
  })

  test("returns undefined with no providers", () => {
    expect(fallback(undefined)).toBeUndefined()
    expect(fallback([])).toBeUndefined()
  })
})
