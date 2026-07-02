import { spawn, spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function getSchemaModels(): string[] {
  const schema = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')
  return [...schema.matchAll(/^model\s+(\w+)/gm)].map((m) => m[1])
}

function modelToDelegate(model: string): string {
  return model.charAt(0).toLowerCase() + model.slice(1)
}

function getMissingClientModels(): string[] {
  const clientPath = join(process.cwd(), 'node_modules/.prisma/client/index.d.ts')
  let client: string
  try {
    client = readFileSync(clientPath, 'utf8')
  } catch {
    return getSchemaModels()
  }
  return getSchemaModels().filter((model) => !client.includes(`get ${modelToDelegate(model)}():`))
}

function tryPrismaGenerate(): void {
  const result = spawnSync('npx', ['prisma', 'generate'], {
    encoding: 'utf8',
    shell: true,
    env: process.env,
  })

  if (result.status === 0) {
    if (result.stdout) process.stdout.write(result.stdout)
    return
  }

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
  const missing = getMissingClientModels()

  if (output.includes('EPERM') || output.includes('operation not permitted')) {
    if (missing.length > 0) {
      console.error('\n[dev] prisma generate 失败：引擎文件被占用，且 Prisma Client 已过期。')
      console.error(`[dev] 缺少模型：${missing.join(', ')}`)
      console.error('[dev] 请先停掉所有 npm run dev / Node 进程，再重新执行 npm run dev\n')
      process.exit(1)
    }
    console.warn('\n[dev] prisma generate 跳过：引擎文件正被占用，但 Client 已是最新。\n')
    return
  }

  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  process.exit(result.status ?? 1)
}

tryPrismaGenerate()

const child = spawn('npx', ['tsx', 'watch', '--env-file=.env', 'src/index.ts'], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
})

child.on('exit', (code) => process.exit(code ?? 0))
