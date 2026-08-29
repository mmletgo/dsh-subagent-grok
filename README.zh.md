# dsh-subagent-grok

安装：

```sh
export DSH_HOME=/tmp/dsh-subagent-grok-home
dsh plugin --profile headless add dsh-subagent-grok
```

[English](README.md)

把本机已认证的 Grok CLI 作为 DSH 默认的 one-shot 子代理提供方。每次委托都会在父 session 的工作目录执行一个 `grok -p <prompt> --output-format json` 进程。

## 要求

- Node.js 20 或更新版本
- `@deepseek-ai/dsh` 0.1.1 候选版本线
- `PATH` 中存在 Grok CLI，并已通过 CLI 自己的本地配置完成认证

插件不负责登录，也不接收或写入 API key。缺少 CLI、未认证、JSON 无效、非文本输入和空 prompt 都会显式失败。

## 安全默认值

默认命令同时使用 `--always-approve` 和 Grok 内置的 `workspace` 沙箱。沙箱只允许写父工作目录、Grok 状态目录和临时目录。

如需使用其他受限 profile，可覆盖 provider 配置：

```yaml
- id: subagent-grok
  name: dsh-subagent-grok
  config:
    providerName: grok
    sandbox: strict
```

关闭沙箱必须同时配置 `sandbox: off` 和 `allowUnconfined: true`。bundle 默认值刻意不提供这个高风险选项。

## 验证

```sh
npm test
dsh --profile headless --dump-config
```

在 macOS 的 Grok CLI 1.0.13 上，ACP initialize 握手成功。ACP 仅记录为可能的 v2 运输；v1 使用已有文档的 one-shot JSON 命令。
