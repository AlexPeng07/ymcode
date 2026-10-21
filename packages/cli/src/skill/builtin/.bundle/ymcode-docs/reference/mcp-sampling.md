# MCP 客户端采样

ymcode 实现了 MCP 客户端的 `sampling` 能力
（[规范](https://modelcontextprotocol.io/specification/2025-11-25/client/sampling)）。
MCP 服务器可以通过 `sampling/createMessage` 请 ymcode 代其运行一次模型调用，
因此**服务器永远不需要自己的 API key**——它借用用户已配置的模型连接。

## 典型用例

MiMo Cut MCP 服务器把视频的音轨提取为 16 kHz 单声道 WAV，并需要一份转写。
它不携带自己的提供方凭据，而是把 WAV 作为 MCP `AudioContent` 发给 ymcode 并请求补全：

```json
{
  "method": "sampling/createMessage",
  "params": {
    "messages": [
      { "role": "user", "content": [
        { "type": "text", "text": "Transcribe this audio verbatim." },
        { "type": "audio", "data": "<base64 wav>", "mimeType": "audio/wav" }
      ]}
    ],
    "systemPrompt": "You are a verbatim transcription engine.",
    "maxTokens": 2048,
    "modelPreferences": { "hints": [{ "name": "mimo-v2.5" }] }
  }
}
```

ymcode 选择一个已配置且支持音频的模型（优先采用提示的 `mimo-v2.5`），请求用户批准，
执行调用，并原样返回模型文本。服务器从不读取也不需要 `MIMO_API_KEY`。

## 能力协商

ymcode 在 `initialize` 期间声明 `capabilities.sampling = {}`。

`sampling.tools` 与 `sampling.context` 是刻意**不**声明的，因为它们未实现。
按规范，客户端在服务器发送 `tools`/`toolChoice` 却未声明 `sampling.tools` 时必须报错，
ymcode 正是这么做的。`includeContext` 默认为 `none`：ymcode 绝不把你的会话历史交给 MCP 服务器。

## 模型选择

MCP 不发布模型列表，也没有模态发现，因此选择由**模型能力注册表**
（`src/provider/capability-registry.ts`）驱动。顺序是**先过滤，再排序**——绝不反过来：

1. **推导**实际内容所需的模态（文本 / 图像 / 音频，外加每个条目的 MIME 类型与解码后的字节数）。
2. **过滤**出*同时*满足能力兼容*且*已配置凭据的模型。兼容性要与两道门同时成立：
   - 模型自己声明的输入模态（`capabilities.input.*`，来自
     models.dev 元数据或你的 `/modalities` 配置），以及
   - 其背后的提供方适配器是否真能序列化该媒体。
3. 用 `modelPreferences.hints` 对幸存者**排序**，按服务器给出的顺序，先精确模型 id，再子串匹配。
4. 若没有任何提示匹配到合格模型，回退到常规的模型选择策略——但仅当其答案本身也合格时。

提示是一种*偏好*，绝不是授权：它可以重排合格模型，但绝不能让不合格的模型变合格。
服务器也不能提供 API key、base URL 或任何其他提供方凭据。

当没有任何合格模型时，ymcode 返回一个**结构化错误**，列出每个已配置模型及其被拒原因。
它绝不丢弃音频、绝不把它降级为文字描述，也绝不发送给无法接受它的模型。

### 已声明的适配器支持

各适配器的音频支持，以及每个判定的证据（由
`test/provider/capability-registry-wire.test.ts` 锁定，该测试驱动真实适配器并断言序列化后的请求体）：

| 适配器 | 音频 | 接受的 MIME | 证据 |
|---|---|---|---|
| `@ai-sdk/openai-compatible` | 支持 | `audio/wav`、`audio/mp3`、`audio/mpeg` | 将它们序列化为 `input_audio`；`audio/flac` 与 `audio/ogg` 抛出 `functionality not supported` |
| `@ai-sdk/google` | 支持 | 任意 `audio/*` | 把任意音频 MIME 作为 `inlineData` 透传 |
| `@ai-sdk/google-vertex` | 支持 | 任意 `audio/*` | 复用 `@ai-sdk/google` 的内容转换 |
| `@ai-sdk/anthropic` | **不支持** | — | `audio/wav` 部分会抛出 `'media type: audio/wav' functionality not supported`，而 `image/png` 能正常序列化 |
| `@ai-sdk/google-vertex/anthropic` | **不支持** | — | 复用 `@ai-sdk/anthropic` 的内容转换 |
| `@ai-sdk/amazon-bedrock` | **不支持** | — | 在 `src/session/tool-attachment.ts` 中被排除出所有音频路由（未做直接线缆探测） |
| 其他 | **未知** | — | 无声明；支持性未证，也未证伪 |

`unknown` 是刻意保留的第三种独立状态。音频支持无法被我们证实的提供方会报告为未证明，
而不是向任一侧猜测。`unsupported` 与 `unknown` 都不合格（失败关闭），但错误信息会区分二者，
使你能分辨「这不可能行得通」与「我们不知道」。

## 权限模型

默认策略是 **ask**。批准提示会显示：

- 是哪个 MCP 服务器请求的，
- 实际将运行的模型，
- 出现的内容类型，以及任何音频的大小，
- 系统提示词与用户文本提示词的预览。

两个独立控制，**任一**给出 `deny` 都会拒绝请求：

- `permission.mcp_sampling` —— 标准权限规则，以 MCP 服务器名为键
  （`{ "*": "ask", "mimo-cut": "allow" }`）。
- `mcp.<server>.sampling` —— 逐服务器策略：`deny` | `ask` | `allow`
  （默认 `ask`）。

`deny` 在任何提示、模型选择或提供方调用之前就拒绝。`allow` 跳过提示，但**不是**绕过：
请求大小上限、请求超时与模型能力检查仍然全部生效——并且它**不**覆盖 `permission.mcp_sampling` 的拒绝。
由于 `allow` 完全跳过批准步骤，处理器会自行评估权限规则集，而不是依赖提示来暴露拒绝；
错误会指明是哪个控制拒绝的（`data.deniedBy`）。

如果在没有该服务器的轮次进行时收到采样请求，`ask` 策略会失败关闭，而不是弹出一个没有 UI 在听的提示。

## 限制

| 限制 | 值 |
|---|---|
| 每个条目的媒体（图像/音频），解码后 | 20 MiB |
| 每个条目的文本，以及 `systemPrompt` | 1 MiB |
| 模型无输出（停顿） | 提供方的 `chunkTimeout` —— 默认 8 分钟 |

这就是时间边界的全部清单，且它是继承而来的，不是自选的。
采样请求**没有总时限**，模型调用端到端**没有时限**，审批等待也**没有时限**。
采样只设了一个自己的数字——15 秒的存活心跳间隔——而那是保活节奏，不是截止时间。

### 为什么没有总时限

主对话路径已经给出了答案。`src/session/llm.ts` 对模型调用完全不设实际耗时上限：
其重试计划「有意不设上限」，自身最坏情形约 97 分钟，并用一句话陈述设计——
*「通过 `chunkTimeout` 约束每次尝试的延迟，是控制挂起时间的主要杠杆」*。
对于流式调用，本仓库的立场是：**总流逝时间不是健康信号，沉默才是。**
采样通过同一 SDK 调用同一提供方，因此一个 2 分钟的总预算让它比普通聊天急躁约 48 倍，
且没有任何说明理由。它已被移除，连同其背后的绝对上限。

### 为什么没有审批时限

同样理由，在 `src/permission/index.ts` 中可度量：**普通交互式权限提示没有超时。**
只有*转发的*问询与跳过权限下的强制询问才有界，而采样审批两者都不是。
TUI 提示会按操作员需要一直等待，因此采样在 30 秒放弃，比仓库中任何可比机制都更严格。
现在等待在操作员回答时、在对端取消时（其自身请求超时才会产生该取消），或在 MCP 客户端关闭时结束。

### 停顿上限，以及它不是什么

模型调用是**流式**的，因此「这是否挂住了？」可以由证据回答，而非猜测：
完全没有输出是一种症状，而不是关于 ymcode 多有耐心的策略选择。
它以 `sampling stalled: the model produced no output` 与
`data.phase: "stall"` 失败。它的时钟覆盖等待首个 chunk 与后续每个 chunk 之间的间隔，
并且**每个到达的 chunk 都会重置它**——一个缓慢但持续产出十分钟的流永不判定停顿，而一个静默下来的流会。

错误还带有 `data.chunks` 与 `data.characters`，区分了服务器作者否则只能猜测的两种失败：
`chunks: 0` 意味着提供方从未产出任何东西，非零计数则意味着它开始了然后死掉。

**它的取值来自提供方层的 `chunkTimeout`，而不是采样专属数字。** 在 `ymcode.json` 中为提供方设置 `chunkTimeout`，
它管辖采样的方式与管辖普通聊天完全相同；不设置则两者都取 8 分钟默认值。
采样曾为同一问题自带 45 秒边界，与提供方层相差 10 倍——而且方向错了，
因为 `chunkTimeout` 调校到能容忍真实冷路径首 token 可能约 5 分钟的静默。更紧的数字会让普通聊天能存活的调用失败。

刻意**不**覆盖的部分，明说而非暗示：一个刚好足够频繁地滴出输出、永不显得停顿也永不结束的流，
以及模型调用之前的阶段（模型选择、提供方初始化）。两者在这里都无界——而它们在主聊天路径上同样无界，
这正是接受它们而不是发明一个数字来覆盖它们的依据。

达到该上限会中止提供方调用以及 ymcode 对它的等待。这不是自动的：
中断 Effect fiber 并不会取消其中已在途的 HTTP 请求，因此处理器把自身 fiber 的 abort 信号与 MCP 请求信号取并集交给提供方。
因此超时与客户端拆除都能到达提供方。

### 让服务器自己的定时器保持存活

模型调用进行期间，ymcode 每 15 秒发出一次 `notifications/progress`，
使请求了进度的服务器不会放弃一个仍在处理的请求。没有这些通知，SDK 60 秒默认值下的服务器会在 60 秒放弃，
而 ymcode 仍在工作，因为 ymcode 对模型调用不施加自己的截止时间。

它声称与不声称的内容：

- **它报告观察到的输出，但仍不是比例。** 模型调用是流式的，因此通知说明提供方实际产出了多少 chunk 与字符——
  这正是让服务器区分「ymcode 活着」与「模型在产出」的依据，而定时器驱动的 tick 做不到这种区分。`total`
  仍刻意省略，因为流式也无法揭示将有多少输出，因此读不出任何百分比。`progress` 仍是单调 tick 而非 chunk 计数，
  因为 chunk 计数恰好在最需要通知的静默期不会前进。
- **它绝不携带模型文本。** 部分内容刻意扣留：一个随后停顿、超时或被取消的请求**完全**不返回文本，
  因此在失败情形下通过进度通道流出前缀，恰好泄露了响应契约声明从未交付的内容。`onprogress`
  也是对端请求被告知请求仍存活的机制——MCP 没有部分结果通道，把 `message` 当作部分结果通道等于 ymcode 替服务器做决定。
  运行长度是元数据，可以披露；文本不可以。
- **它是必要而非充分的。** 重置定时器是*请求方*的选择：SDK 的 `resetTimeoutOnProgress` 默认为 `false`，
  因此没有传它的服务器会完全忽略这些通知，仍在自己的截止时间超时。ymcode 无法替它做这个决定。
- **它无法延长 ymcode 自己的边界。** 这些通知只重置对端的定时器。无论发出多少次，模型调用仍在其自身边界处被切断，
  因此挂死的提供方无法靠自己的保活被维持。

除非服务器 requesting，否则什么都不发。进度 token 属于请求方——只有其调用方传了 `onprogress`，SDK 才会签发一个，
ymcode 从请求的 `_meta` 读回它。没有 token 就完全没有通知。

媒体上限是**客户端安全限制**，不是对任何提供方真实上限的声明。
它存在是为了让有 bug 或恶意的服务器无法通过采样路径推送无界载荷。作为尺度参照：30 秒的 16 kHz 单声道
16-bit PCM WAV 约 0.92 MiB。

## 并发、取消与清理

采样请求通常**在 ymcode 仍在等待同一服务器的 `tools/call` 返回时**到达。
这不会死锁，原因有两个且相互独立：

1. MCP SDK 从传输层的 `onmessage` 分派入站请求，而不等待处理器，因此服务采样请求绝不会阻塞
   之后必须投递工具结果的读取循环。
2. ymcode 在一个全新的根 Effect fiber 上运行工作，它与停在 `callTool` 上的 fiber 不共享 fiber、锁或作用域。

请求并发处理。被取消的请求会通过处理器的 abort 信号展开，该信号穿入审批等待，并与处理器 fiber 自身的信号组合后穿入提供方调用。
关闭或替换客户端会中断其仍在途的任何采样并中止其提供方调用，因此孤立的模型调用无法比其传输活得更久。

> **上游注意事项。** 在 `@modelcontextprotocol/sdk` 1.27.1 中，JSON-RPC `requestId` 为 `0` 的取消会被静默丢弃
> （`shared/protocol.js` 中的 `if (!notification.params.requestId) return`），因为 `0` 是假值。
> 因此连接上**第一个**服务器发起的请求在上游无法取消；后续请求能正确取消。停顿上限使即便这种情况也不会泄漏，
> 且它是**唯一**能做到这点的东西——这就是为什么它不以服务器是否请求了进度为条件。由于它中止提供方调用，
> 它结束的是模型调用，而不仅仅是我们停止等待。
>
> ymcode 不绕过这一点，因为它无法绕过：处于风险中的 id 属于**服务器**的出站请求计数器，只有服务器能推进它。
> 从客户端侧消耗一个 id——比如连接建立时发个 ping——推进的是客户端自己的计数器，服务器的仍停在 `0`，
> 因此服务器的取消依然不会落地。在 `test/mcp/sampling-e2e.test.ts` 中连同失败与通过的用例一起做过测量；
> 若 SDK 升级改变了此行为，那些测试会失败。
>
> 残余风险，直白说明：**当服务器放弃它在某个连接上发出的第一个采样请求时，ymcode 不会得知，因此该请求会让一个模型调用继续运行——
> 而且是付费的——直到 ymcode 自己的某个边界中止它——也就是提供方静默达到其 `chunkTimeout` 时。如果提供方反而无限期地持续滴出输出，
> 这里没有任何机制能阻止它；这与普通聊天承载的是同一暴露面，也以同样条件被接受。**
> 边界限制浪费，但不避免浪费。

## 安全边界

- API key、`Authorization` 头与提供方配置绝不出现于采样响应、日志或任何错误载荷中。
- 日志只记录服务器、模型、内容类型、大小、时长与结果状态。绝不记录音频字节，也绝不记录完整提示词——
  提示词预览会折叠空白并截断。
- 模型文本**原样**返回。ymcode 不做总结或改写。
- 会话上下文绝不转发给 MCP 服务器。

## 结果与错误映射

成功时返回规范的 `CreateMessageResult`：`role`、`content`、`model`（实际使用的模型，形式为 `provider/model`），
以及 `stopReason`（`endTurn` / `stopSequence` / `maxTokens`）。

| 情形 | JSON-RPC 码 |
|---|---|
| 参数格式错误、base64/MIME 错误、超尺寸、无兼容模型 | `-32602` InvalidParams |
| 策略 `deny`、用户拒绝、`ask` 但无会话 | `-1` |
| 已取消或超时 | `-32001` |
| 提供方失败、模型初始化失败 | `-32603` InternalError |

`-32001` 不能单独解读：它是 SDK 自己的 `RequestTimeout`，SDK 的请求超时也会抛出它，
并带有我们边界同样会设置的 `data.timeout`。只有我们的错误带有 `data.server`，因此该字段才说明是谁的截止时间触发。

一旦错误来自我们，`data.phase` 只有一个可能值——`"stall"`——因为这是现在 ymcode 施加的唯一截止时间；
`"approval"`、`"model"` 与 `"total"` 阶段已随产生它们的边界一起消失。`"stall"` 携带
`data.chunks` 与 `data.characters`，因此服务器能区分从未产出任何内容的提供方与中途停止的提供方。
取消则携带 `data.server` 而没有 `phase`，因为没有任何东西过期。
