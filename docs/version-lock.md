# Verified version lock

The development environment is isolated from the user's existing DSH home.

| Package | Version | Channel |
| --- | --- | --- |
| `@deepseek-ai/dsh` | `0.1.1-rc.2` | `next` |
| `@deepseek-ai/dsh-agent` | `0.1.1-rc.2` | `next` |
| `@deepseek-ai/dsh-subagent` | `0.1.1-rc.2` | `next` |
| `@deepseek-ai/dsh-tool-subagent` | `0.1.1-rc.2` | `next` |
| `@deepseek-ai/cordis` | `4.0.1` | stable |

Reproduce the lock without touching `~/.dsh`:

```sh
export DSH_HOME=/tmp/dsh-subagent-grok-home
mkdir -p "$DSH_HOME"
cd "$DSH_HOME"
npm init -y
npm install --save-exact \
  @deepseek-ai/dsh@0.1.1-rc.2 \
  @deepseek-ai/dsh-agent@0.1.1-rc.2 \
  @deepseek-ai/dsh-subagent@0.1.1-rc.2 \
  @deepseek-ai/dsh-tool-subagent@0.1.1-rc.2 \
  @deepseek-ai/cordis@4.0.1
npm ls --all
```

The plugin peer ranges explicitly include the prerelease line and stop before `0.2.0`.
