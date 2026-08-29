import { randomUUID } from 'node:crypto'
import { spawn } from 'node:child_process'
import { isAbsolute } from 'node:path'

export const name = 'subagent-grok'
export const inject = ['subagents']

function errorResult(message) {
  return { output: [{ type: 'text', text: message }], stopReason: 'error' }
}

export function promptText(blocks) {
  if (!Array.isArray(blocks) || blocks.some((block) => block?.type !== 'text')) {
    throw new TypeError('Grok subagent accepts text-only prompts')
  }
  const prompt = blocks.map((block) => block.text).join('\n').trim()
  if (!prompt) throw new TypeError('Grok subagent prompt must not be empty')
  return prompt
}

export class GrokSubagentProvider {
  name
  capabilities = {
    outputSchema: false,
    depthLimit: false,
    toolFilter: false,
    persona: false,
  }
  inheritsParentContext = false

  constructor(config = {}) {
    this.name = config.providerName || 'grok'
    this.executable = config.executable || 'grok'
    this.sandbox = config.sandbox || 'workspace'
    this.allowUnconfined = config.allowUnconfined === true
    if (this.sandbox === 'off' && !this.allowUnconfined) {
      throw new TypeError('sandbox=off requires allowUnconfined=true')
    }
  }

  async start(request) {
    const prompt = promptText(request.prompt)
    const cwd = request.parent?.session?.header?.cwd
    if (!cwd || !isAbsolute(cwd)) {
      throw new TypeError('Parent session must have an absolute cwd')
    }
    if (request.signal.aborted) throw request.signal.reason

    const args = [
      '-p', prompt,
      '--output-format', 'json',
      '--always-approve',
      '--sandbox', this.sandbox,
      '--cwd', cwd,
      '--no-subagents',
      '--disable-web-search',
    ]
    const child = spawn(this.executable, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let aborted = false
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk })
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk })

    const stop = () => {
      aborted = true
      if (child.exitCode === null) child.kill('SIGTERM')
    }
    request.signal.addEventListener('abort', stop, { once: true })

    const result = new Promise((resolve) => {
      let settled = false
      const finish = (value) => {
        if (settled) return
        settled = true
        request.signal.removeEventListener('abort', stop)
        resolve(value)
      }
      child.once('error', (error) => {
        finish(errorResult(`Unable to run Grok CLI: ${error.message}`))
      })
      child.once('close', (code) => {
        if (aborted) return finish({ output: [], stopReason: 'aborted' })
        if (code !== 0) {
          const detail = stderr.trim() || stdout.trim() || `exit code ${code}`
          return finish(errorResult(`Grok CLI failed (check login and configuration): ${detail}`))
        }
        try {
          const parsed = JSON.parse(stdout)
          if (typeof parsed.text !== 'string' || !parsed.text.trim()) {
            throw new TypeError('JSON response has no text')
          }
          finish({ output: [{ type: 'text', text: parsed.text }], stopReason: 'completed' })
        } catch (error) {
          finish(errorResult(`Invalid Grok CLI JSON output: ${error.message}`))
        }
      })
    })

    return {
      id: randomUUID(),
      localAgent: undefined,
      result,
      dispose: async () => {
        stop()
        await result
      },
    }
  }
}

export function apply(ctx, config) {
  ctx.subagents.registerProvider(new GrokSubagentProvider(config))
}
