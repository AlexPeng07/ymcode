# ymcode 模型与提供方

只要请求涉及提供方、模型、API key、base URL、认证或 OpenAI/Anthropic 兼容端点，就阅读本参考。

## 登录选项（TUI 登录对话框 / `/connect`）

- **小米 MiMo 平台** —— 在提供方列表中选择 `xiaomi`，输入 API key。
- **Codex（ChatGPT Pro/Plus）** —— OpenAI OAuth 登录。
- **从 Claude Code 导入** —— 从 `~/.claude/settings*.json` 读取 API key。
- **xAI（Grok）** —— OAuth 登录，提供方 id 为 `xai`。
- **其他目录中的提供方** —— 输入 API key（例如 OpenRouter），另有 **+ 自定义提供方** 用于任何 OpenAI 兼容端点。

## 选择目标配置

- 只有当用户明确想要项目本地行为时，才使用 `.ymcode/ymcode.jsonc` 或 `.ymcode/ymcode.json`。
- 否则使用全局配置目录（通常是 `~/.config/ymcode/`）。全局文件按此顺序合并：`config.json`、`ymcode.json`，然后是 `ymcode.jsonc`；后者胜出。编辑已存在的最高优先级文件，若都不存在则创建 `ymcode.jsonc`。
- 直接检查这些确切的候选文件。不要递归 glob 或搜索整个主目录。
- 若 JSON 与 JSONC 同时存在，编辑前要考虑合并结果，以免更高优先级的文件悄悄覆盖改动。

## 自定义 OpenAI 兼容端点

给定 base URL、API key 与模型 ID，配置一个不依赖内置目录的提供方：

```jsonc
{
  "model": "custom/MODEL_ID",
  "provider": {
    "custom": {
      "name": "Custom",
      "npm": "@ai-sdk/openai-compatible",
      "only_configured_models": true,
      "models": {
        "MODEL_ID": {
          "name": "MODEL_ID"
        }
      },
      "options": {
        "baseURL": "BASE_URL",
        "apiKey": "API_KEY"
      }
    }
  }
}
```

严格使用上面展示的包名与驼峰字段名：

- `@ai-sdk/openai-compatible` 是 ymcode 实现并随附的适配器。不要替换为 `@ai-sdk/compatible-openai`。
- `baseURL` 与 `apiKey` 有效；`base_url`、`base-url` 与 `api_key` 无效。
- `models` 下的键是发往上游的确切 ID。保留其大小写、标点与 `/` 字符。`name` 只是显示标签。
- 顶层选择为 `<provider-id>/<model-id>`。ymcode 只把第一个 `/` 当作分隔符，因此模型 ID 可以包含 `/`。
- 精确保留 base URL。除非用户要求，不要增删或规范化 `/v1`。
- 非 OpenAI 线协议的端点需要其提供方专属适配器。仅有 base URL、key 与模型名并不会改变协议语义。

## 自定义 Anthropic 兼容端点

对于实现 Anthropic Messages API（而非 OpenAI Chat Completions 或 Responses）的服务，使用原生 Anthropic 适配器：

```jsonc
{
  "model": "custom-anthropic/MODEL_ID",
  "provider": {
    "custom-anthropic": {
      "name": "Custom Anthropic",
      "npm": "@ai-sdk/anthropic",
      "only_configured_models": true,
      "models": {
        "MODEL_ID": {
          "name": "MODEL_ID"
        }
      },
      "options": {
        "baseURL": "BASE_URL",
        "apiKey": "API_KEY"
      }
    }
  }
}
```

ymcode 随附 `@ai-sdk/anthropic`；其 SDK 构造 Anthropic Messages API 请求，包括 Anthropic 认证/版本头与 `/messages` 请求路径。把 `baseURL` 配置为 API 基址（通常以 `/v1` 结尾），而不是完整的 `/v1/messages` 端点，因为适配器会追加 `/messages`。

依据端点文档所述的线协议选择适配器，而不是依据模型名：

- OpenAI 兼容的 Chat Completions/Responses 使用 `@ai-sdk/openai-compatible`，即使上游模型 ID 含 `claude`。
- 当端点实现 Anthropic Messages 语义（如 `POST /v1/messages`、`x-api-key` 与 `anthropic-version`）时使用 `@ai-sdk/anthropic`。
- 如果用户明确说明了格式，就照办。若只给出 URL、key 与类似 Claude 的模型名，不要从名称推断协议；查看权威端点文档，或询问它实现哪种 API 格式。
- 不要把仅 OpenAI 的设置加到 Anthropic 提供方，也不要把仅 Anthropic 的头加到 OpenAI 兼容提供方，除非网关文档要求。

## 复用或新建提供方

提供方选项（包括凭据与 base URL）由该提供方下的所有模型共享。要有意选择：

- 当端点和凭据都已匹配时，复用提供方并追加模型。
- 若端点匹配但提供的凭据不同，除非用户明确想轮换现有提供方的 key，否则新建一个独立的提供方 ID。覆盖它会悄悄改变该提供方下的所有现有模型。
- 若期望的提供方 ID 已存在但选项不同，选择一个未使用的短小写 ID，或带含义后缀的 ID。同步更新 `model` 与允许列表。
- 若存在 `enabled_providers`，加入新提供方 ID。若 `disabled_providers` 包含它且用户想使用该模型，只移除该条目。
- 当用户说配置、使用、选择、切换或设为默认时，设置顶层 `model`。当用户只要求添加/注册模型时，保持当前选择。

## 不要臆造模型元数据

模型的显示名足以注册它。不要根据模型名猜测 `limit.context`、`limit.output`、`reasoning`、`tool_call`、`modalities`、成本或其他能力。内部路由常暴露别名，其行为与名称相似的公开模型不同。

仅当用户提供或当前权威来源可验证时才添加可选元数据。若上限很重要但未知，就省略并说明其仍未指定；ymcode 会应用运行时回退，并为未知上下文窗口记录一条警告。

具体到输入模态，用户可在 TUI 中用 `/modalities` 设置（多选 image/audio/video/pdf；持久化到全局配置中的 `provider.<id>.models.<id>.modalities`）——优先引导他们去那里，而不是手工编辑。

## 凭据处理

- 把任何 API key 都视为机密，即使它是用户粘贴进提示词的。绝不在评论、工具摘要、差异或最终回复中重复它。
- 避免打印未脱敏的配置，因为它可能包含无关凭据。以掩码方式查看敏感值，并做尽可能小的编辑。
- 当用户要求 ymcode 持久化所提供的 key 时，支持直接存储 `options.apiKey`。仅在文件权限可用的地方让配置保持用户可读。
- 如果用户不愿存明文，使用配置 token，例如 `"apiKey": "{env:CUSTOM_API_KEY}"`，并说明该变量必须存在于 ymcode 进程环境中。当用户要求一份可直接使用的持久配置时，不要悄悄改用环境引用。
- 如果真实 key 曾出现在对话或日志中，建议在完成所请求的设置后轮换它。

## 让新配置的模型留在 TUI 最近列表

当用户提供新的 API key 与模型进行配置时，在提供方配置通过校验后更新 TUI 最近模型状态。无论请求是把该模型设为默认还是仅注册它，都要这样做：最近条目才使该模型立即出现在 TUI 的模型循环快捷键中。

状态文件是 ymcode 状态目录下的 `model.json`：

- 当 `YMCODE_HOME` 为非空绝对路径时：`$YMCODE_HOME/state/model.json`。
- 否则：ymcode 的 XDG 状态目录，在 Linux 与 macOS 上通常是 `~/.local/state/ymcode/model.json`。若设置了 `XDG_STATE_HOME`，遵循它。

先读取已有的 JSON 对象。保留每个顶层字段，尤其是 `favorite` 与 `variant`。把配置的模型前插到 `recent`，移除其后任何 `providerID` 与 `modelID` 相同的条目，保持其他所有条目的顺序，最多保留 10 条：

```json
{
  "recent": [
    { "providerID": "custom", "modelID": "MODEL_ID" }
  ],
  "favorite": [],
  "variant": {}
}
```

该片段只说明结构；它不授权你重置现有字段。若文件不存在，创建它并写入新的 `recent` 条目以及空的 `favorite` 与 `variant`。若其中 JSON 格式错误，不要悄悄覆盖：先保留或备份再修复。绝不要把 API key、base URL、显示名或拼接的 `provider/model` 字符串放进最近条目。

只有在 `ymcode models PROVIDER_ID` 确认该确切模型已注册后，才写入最近状态。已运行的 TUI 可能加载了旧状态，并可能覆盖外部编辑，因此告诉用户在依赖更新后的快捷键之前关闭或重启该 TUI。

## 最小编辑与验证

保留 JSONC 注释、`$schema`、无关的提供方、模型与设置。能定向插入时，避免整文件重写。

不要仅仅为了验证配置就发起付费或改变状态的 API 请求。在用户将来运行 ymcode 的同一工作目录中做本地验证：

```sh
ymcode models PROVIDER_ID
```

确认输出中恰好包含 `PROVIDER_ID/MODEL_ID`。这证明配置已被解析、提供方/模型已注册；它并不证明远端凭据、端点或所选线协议可用。若当前 TUI 会话已固定某个模型，编辑后重新选择它或开始新会话。

在最终回复中，说明配置文件与最近模型状态文件的名称，指明所选的 `provider/model`，说明是新增还是设为默认，并报告本地验证结果。绝不要包含 key。
