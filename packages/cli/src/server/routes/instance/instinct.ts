import { Hono } from "hono"
import { describeRoute, resolver, validator } from "hono-openapi"
import z from "zod"
import { Instinct } from "@/memory"
import { Info, Status } from "@/memory/instinct"
import { Instance } from "@/project/instance"
import { ProjectID } from "@/project/schema"
import { lazy } from "@/util/lazy"
import { jsonRequest } from "./trace"

const Scope = z.enum(["project", "global"]).default("project")

function target(scope: "project" | "global") {
  const projectID = scope === "global" ? ProjectID.global : Instance.project.id
  return {
    scope: (scope === "global" ? "global" : "projects") as Instinct.Scope,
    projectID,
  }
}

const Params = z.object({ id: z.string().regex(/^ins_[a-z0-9]{8,}$/, "invalid instinct id") })

const Item = z.object({ info: Info, body: z.string(), file: z.string() })

export const InstinctRoutes = lazy(() =>
  new Hono()
    .get(
      "/",
      describeRoute({
        summary: "List instinct rules",
        description: "List instinct rules for the current project or the global scope, newest confidence first.",
        operationId: "instinct.list",
        responses: {
          200: {
            description: "Instinct rules",
            content: { "application/json": { schema: resolver(Info.array()) } },
          },
        },
      }),
      validator("query", z.object({ scope: Scope, status: Status.optional() })),
      async (c) =>
        jsonRequest("InstinctRoutes.list", c, function* () {
          const query = c.req.valid("query")
          const svc = yield* Instinct.Service
          return yield* svc.list({ ...target(query.scope), status: query.status })
        }),
    )
    .get(
      "/:id",
      describeRoute({
        summary: "Get one instinct rule",
        description: "Read a single instinct rule including its markdown body and evidence list.",
        operationId: "instinct.get",
        responses: {
          200: {
            description: "Instinct rule",
            content: { "application/json": { schema: resolver(Item) } },
          },
        },
      }),
      validator("param", Params),
      validator("query", z.object({ scope: Scope })),
      async (c) =>
        jsonRequest("InstinctRoutes.get", c, function* () {
          const svc = yield* Instinct.Service
          return yield* svc.get({ ...target(c.req.valid("query").scope), id: c.req.valid("param").id })
        }),
    )
    .post(
      "/:id/promote",
      describeRoute({
        summary: "Promote an instinct rule",
        description: "Promote a candidate into MEMORY.md. Without force the confidence and evidence thresholds must pass.",
        operationId: "instinct.promote",
        responses: {
          200: {
            description: "Promotion result",
            content: {
              "application/json": { schema: resolver(z.object({ info: Info, appended: z.boolean() })) },
            },
          },
        },
      }),
      validator("param", Params),
      validator(
        "json",
        z.object({ scope: Scope, force: z.boolean().optional() }),
      ),
      async (c) =>
        jsonRequest("InstinctRoutes.promote", c, function* () {
          const svc = yield* Instinct.Service
          const body = c.req.valid("json")
          return yield* svc.promote({
            ...target(body.scope),
            id: c.req.valid("param").id,
            force: body.force,
          })
        }),
    )
    .post(
      "/:id/demote",
      describeRoute({
        summary: "Demote an instinct rule",
        description: "Lower confidence, record a contradiction, and return the rule to candidate when it falls below threshold.",
        operationId: "instinct.demote",
        responses: {
          200: {
            description: "Demoted rule",
            content: { "application/json": { schema: resolver(Info) } },
          },
        },
      }),
      validator("param", Params),
      validator(
        "json",
        z.object({ scope: Scope, reason: z.string().min(1) }),
      ),
      async (c) =>
        jsonRequest("InstinctRoutes.demote", c, function* () {
          const svc = yield* Instinct.Service
          const body = c.req.valid("json")
          return yield* svc.demote({
            ...target(body.scope),
            id: c.req.valid("param").id,
            reason: body.reason,
          })
        }),
    )
    .delete(
      "/:id",
      describeRoute({
        summary: "Delete an instinct rule",
        description: "Remove an instinct rule and rebuild the index. The caller owns explicit user confirmation.",
        operationId: "instinct.forget",
        responses: {
          200: {
            description: "Deleted",
            content: { "application/json": { schema: resolver(z.boolean()) } },
          },
        },
      }),
      validator("param", Params),
      validator("query", z.object({ scope: Scope })),
      async (c) =>
        jsonRequest("InstinctRoutes.forget", c, function* () {
          const svc = yield* Instinct.Service
          yield* svc.forget({ ...target(c.req.valid("query").scope), id: c.req.valid("param").id })
          return true
        }),
    )
    .post(
      "/review",
      describeRoute({
        summary: "Review instinct rules",
        description: "Apply decay and auto-promote every candidate that passes the configured thresholds.",
        operationId: "instinct.review",
        responses: {
          200: {
            description: "Review result",
            content: {
              "application/json": {
                schema: resolver(z.object({ promoted: z.array(z.string()), decayed: z.number() })),
              },
            },
          },
        },
      }),
      validator("json", z.object({ scope: Scope })),
      async (c) =>
        jsonRequest("InstinctRoutes.review", c, function* () {
          const svc = yield* Instinct.Service
          return yield* svc.review(target(c.req.valid("json").scope))
        }),
    ),
)
