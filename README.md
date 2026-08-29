# dsh-subagent-grok

Install:

```sh
export DSH_HOME=/tmp/dsh-subagent-grok-home
dsh plugin --profile headless add dsh-subagent-grok
```

[中文](README.zh.md)

Uses the locally authenticated Grok CLI as the default one-shot DSH subagent provider. Each delegation runs one `grok -p <prompt> --output-format json` process in the parent session's working directory.

## Requirements

- Node.js 20 or newer
- `@deepseek-ai/dsh` 0.1.1 release-candidate line
- Grok CLI on `PATH`, already authenticated through its own local configuration

The plugin never logs in and never accepts or writes an API key. Missing CLI, missing authentication, invalid JSON, non-text input, and empty prompts produce an explicit failed delegation.

## Safety

The default command combines `--always-approve` with Grok's built-in `workspace` sandbox. The sandbox limits writes to the parent working directory, Grok's state directory, and temporary directories.

To use another restricted profile, patch the provider config:

```yaml
- id: subagent-grok
  name: dsh-subagent-grok
  config:
    providerName: grok
    sandbox: strict
```

Disabling the sandbox requires both `sandbox: off` and `allowUnconfined: true`. This explicit opt-in is intentionally unavailable in the bundled defaults.

## Verify

```sh
npm test
dsh --profile headless --dump-config
```

An ACP initialize handshake succeeds with Grok CLI 1.0.13 on macOS. ACP remains a possible v2 transport; v1 uses the documented one-shot JSON command.
