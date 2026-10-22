<h1 align="center">ymcode</h1>

<p align="center"><strong>ymcode: a personal AI coding harness</strong></p>

<p align="center">
  <a href="https://github.com/AlexPeng07/ymcode">GitHub</a> | <a href="https://github.com/AlexPeng07/ymcode/releases">Releases</a>
</p>

---

ymcode is a terminal-native AI coding assistant. It can read and write code, run commands, manage Git, and use a persistent memory system to keep a deep understanding of your project across sessions while continuously improving itself.

MiMo Auto is built in as a free-for-limited-time channel, so you can start with zero configuration. ymcode also supports connecting to any mainstream LLM provider API.

---

## Quick Start

npm is in limited support. Prefer the native installer over `npm install -g @ymcode/cli`:

```bash
# One-line install (macOS / Linux)
curl -fsSL https://raw.githubusercontent.com/AlexPeng07/ymcode/main/install | bash

# One-line install (Windows PowerShell)
powershell -ep Bypass -c "irm https://raw.githubusercontent.com/AlexPeng07/ymcode/main/install.ps1 | iex"

# Run
ymcode
```

The first launch guides you through configuration automatically. `ymcode setup` selects a provider, stores an API key, and writes the default model. Custom OpenAI-compatible providers can be added from the TUI provider picker.

---

## Core Features

- **Multiple Agents** — build (default), plan (read-only analysis); press `Tab` to switch
- **Persistent Memory** — cross-session project knowledge, checkpoints, and task progress powered by SQLite FTS5
- **Intelligent Context Management** — automatic checkpoints, context reconstruction, and budgeted injection to stay within model limits
- **Task Tracking** — tree-shaped task system integrated with the checkpoint system
- **Subagent System** — parallel subagents with lifecycle tracking, cancellation, and background execution
- **Goal / Stop Condition** — judge model prevents premature stops during autonomous work
- **Compose Mode** — end-to-end feature delivery via the `/compose-next` skill
- **Builtin Skills** — 20+ reusable instruction sets (PDF/Office generation, research, design, and more), invoked via `/skill-name` or auto-matched by relevance
- **Dynamic Workflow** — deterministic multi-agent orchestration scripts, including built-in deep-research, fact-check, and research-experiment pipelines
- **Voice Input** — real-time streaming voice input powered by TenVAD and MiMo ASR
- **Dream & Distill** — extract knowledge into memory (`/dream`) and discover reusable workflows (`/distill`)

For detailed documentation, configuration options, and troubleshooting, see the [GitHub repository](https://github.com/XiaomiMiMo/ymcode).

---

## License

Source code is licensed under the [MIT License](https://github.com/XiaomiMiMo/ymcode/blob/main/LICENSE).

Use of ymcode is also subject to the [Use Restrictions](https://github.com/XiaomiMiMo/ymcode/blob/main/USE_RESTRICTIONS.md).
Use of Xiaomi MiMo-hosted services is subject to the [MiMo Terms of Service](https://platform.xiaomimimo.com/docs/terms/user-agreement).
Use of the MiMo name, logo, and trademarks is subject to the MiMo Trademark Policy.
