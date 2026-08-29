import assert from 'node:assert/strict'
import { chmod, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { GrokSubagentProvider, promptText } from '../index.js'

async function mockCli(source) {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-subagent-grok-test-'))
  const file = join(dir, 'grok-mock')
  await writeFile(file, `#!/usr/bin/env node\n${source}\n`)
  await chmod(file, 0o755)
  return file
}

function request(prompt, signal = new AbortController().signal) {
  return {
    prompt: [{ type: 'text', text: prompt }],
    parent: { session: { header: { cwd: process.cwd() } } },
    signal,
  }
}

test('returns the one-shot JSON text', async () => {
  const executable = await mockCli(`
    process.stdout.write(JSON.stringify({ text: JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }) }))
  `)
  const run = await new GrokSubagentProvider({ executable }).start(request('ok'))
  const result = await run.result
  assert.equal(result.stopReason, 'completed')
  const invocation = JSON.parse(result.output[0].text)
  assert.deepEqual(invocation.argv, [
    '-p', 'ok', '--output-format', 'json', '--always-approve', '--sandbox', 'workspace',
    '--cwd', process.cwd(), '--no-subagents', '--disable-web-search',
  ])
  assert.equal(invocation.cwd, process.cwd())
  await run.dispose()
})

test('fails loudly for invalid input, missing CLI, and unsafe config', async () => {
  assert.throws(() => promptText([{ type: 'text', text: '  ' }]), /must not be empty/)
  assert.throws(() => promptText([{ type: 'image' }]), /text-only/)
  assert.throws(() => new GrokSubagentProvider({ sandbox: 'off' }), /allowUnconfined/)

  const run = await new GrokSubagentProvider({ executable: '/missing/grok' }).start(request('ok'))
  const result = await run.result
  assert.equal(result.stopReason, 'error')
  assert.match(result.output[0].text, /Unable to run Grok CLI/)
})

test('cancels an active CLI process', async () => {
  const executable = await mockCli('setTimeout(() => {}, 10_000)')
  const controller = new AbortController()
  const run = await new GrokSubagentProvider({ executable }).start(request('wait', controller.signal))
  controller.abort(new Error('cancelled'))
  assert.equal((await run.result).stopReason, 'aborted')
  await run.dispose()
})
