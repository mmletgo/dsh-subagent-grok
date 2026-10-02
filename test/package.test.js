import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

test('packed package can be imported by name', async () => {
  const root = fileURLToPath(new URL('../', import.meta.url))
  const temp = await mkdtemp(join(tmpdir(), 'dsh-subagent-grok-package-'))
  try {
    const options = {
      encoding: 'utf8',
      env: { ...process.env, npm_config_cache: join(temp, 'cache') },
    }
    const packed = JSON.parse(execFileSync('npm', [
      'pack', '--json', '--ignore-scripts', '--offline', '--pack-destination', temp,
    ], { ...options, cwd: root }))
    const consumer = join(temp, 'consumer')
    await mkdir(consumer)
    await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true }))
    execFileSync('npm', [
      'install', join(temp, packed[0].filename), '--ignore-scripts', '--offline',
      '--omit=peer', '--no-audit', '--no-fund', '--package-lock=false', '--global=false',
    ], { ...options, cwd: consumer })

    // Run outside the checkout so relative imports cannot bypass package exports.
    const output = execFileSync(process.execPath, ['--input-type=module', '--eval', `
      import assert from 'node:assert/strict'
      const plugin = await import('dsh-subagent-grok')
      assert.equal(plugin.name, 'subagent-grok')
      assert.equal(typeof plugin.apply, 'function')
      assert.equal(typeof plugin.GrokSubagentProvider, 'function')
      console.log('ok')
    `], { ...options, cwd: consumer })
    assert.equal(output.trim(), 'ok')
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
})
