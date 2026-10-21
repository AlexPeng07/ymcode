# Capability API —— 出借本实例的模型

每个 ymcode 服务器已经以 OpenAI 兼容接口，在本项目已配置的模型之上提供服务，挂载在 `/v1`。无需另启一个 LLM 服务器，也没有守护进程要管理：只要有 ymcode 进程在监听，端点就在那里。

其意义在于：不再把真实提供方 key 交给那些只需要「一个模型」的东西。任务、技能或子进程拿到本实例的 base URL 加一个一次性的限定范围 token；真实凭据永不离开提供方层。它位于实例服务器上而不是自己的监听器里，是因为插件认证的提供方通过 `chat.headers` hook 获取凭据——独立进程触达不到它们。

该接口提供聊天模型。

## 端点在哪里

每个会话启动时都会在一个随机端口上绑定回环监听器，因此端点无需任何人请求就已存在。两点后果：

- **端口每个会话都会变化**，并且属于该进程——会话退出后它就消失。绝不要跨运行缓存 base URL。
- **没人主动请求的监听器是凭据封闭的。** 它生成一个保存在内存中的密码（从不打印，从不放入环境），因此 `/session`、`/file`、`/pty` 及其他所有实例路由都要求只有该进程知道的 HTTP Basic 认证。`/v1` 被划为例外：签发的 token 可以通过。隔离也同样生效，因此隐式监听器只服务一个项目。

需要*固定*端口时，传入网络标志。那是显式情形，行为一如既往，在回环上无需凭据——SSH 下的 `ymcode attach` 用的就是它：

```bash
mimo --port 4096                 # TUI plus a listener on a port you chose
ymcode serve --port 4096           # headless, same endpoints
```

两种方式都要从项目目录启动：实例目录就是进程的 cwd，命名其外目录的请求会以 403 拒绝。

每个提供服务的进程会在 `<state>/llm-server/<sha1 of the resolved directory>/server-<pid>.json` 公布自己——每个进程一个文件，读取时按该 pid 是否仍存活过滤。这就是 `ymcode llm-server issue` 能打印 base URL 的方式。被派生的子进程应当由派生方**告知**其端点，而不是从该目录里自己挑一个。

## 签发 token

`ymcode llm-server` 只签发和管理凭据；它不启动任何东西。

```bash
ymcode llm-server issue --json --label my-skill
ymcode llm-server issue --model anthropic/claude-haiku-4-5 --ttl 12h
ymcode llm-server list [--json]
ymcode llm-server revoke <id> | --all
```

在与服务器启动时相同的目录中运行它——token 绑定到目录（不绑定其他任何东西：不绑定会话、不绑定 pid、不绑定端口）。

- `--model`（可重复，`provider/model`）把 token 限制在这些模型上。不传时 token 可触达所有已配置模型。
- `--ttl` 是从最后一次使用起计的滑动有效期（默认 `1d`）；`--max-age` 是从签发起的绝对上限；两者都接受 `30m` / `12h` / `7d` / `none`。
- `--json` 打印 `api_key`、`id`、`base_url`、`expires_at`、`models`，以及已为本安装解析好的 `renew_argv` / `renew_command`，以便消费方能从过期中恢复而无需知道 ymcode 是如何被调用的。当没有进程服务该目录时，`base_url` 为 `null`。
- 反复签发是常态：每次调用都新增一个 token，因此每个消费者一个 token，各自拥有范围、标签与有效期。`list` 显示全部，`revoke <id>` 移除一个。
- 明文 token 只显示一次；只存储其 SHA-256。

## 端点

基础路径 `<base_url>/v1`。认证为 `Authorization: Bearer <token>`；也接受 `x-api-key` 与 `api-key`。这些路由**始终**使用签发的 token 认证，与 `YMCODE_SERVER_PASSWORD` 无关。

模型 id 始终是 `providerID/modelID`——原样透传，绝不拆分。

| 端点 | 形态 |
| --- | --- |
| `GET /v1/models` | 列出该 token 可触达的模型 |
| `POST /v1/chat/completions` | OpenAI 聊天，含 `input_audio` 内容部分；`stream:true` 产出以 `[DONE]` 结尾的 SSE |

无法兑现的字段会**以 400 拒绝而不是忽略**，因此调用方绝不会悄悄拿到错误形状的答案：`response_format`、`n > 1`、`logprobs`、`top_logprobs`、`logit_bias` 与 `verbosity`。未知字段会被忽略，因此标准 OpenAI 客户端只需改 `base_url` 即可使用。提供方原生旋钮放在**扁平**的 `provider_options` 映射中，键使用 SDK 自己的 camelCase 选项名。

## 消费者必须区分的错误码

| 状态码 | `error.code` | 含义 |
| --- | --- | --- |
| 401 | `expired_api_key` | 重新签发，并对同一 base URL 重试 |
| 401 | `invalid_api_key` | 缺失、无效或已撤销——停止重试 |
| 400 | — | 请求要求了不受支持的东西 |
| 404 | `model_not_found` | 本实例没有该模型 |
| 502 | — | 上游提供方失败，不是 ymcode |
