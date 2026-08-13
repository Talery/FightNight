import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')
const failures = []
const requireFile = (path) => { if (!existsSync(join(root, path))) failures.push(`missing ${path}`) }
const files = []
const walk = (directory) => {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) walk(path)
    else files.push(path)
  }
}

for (const path of ['dist/index.html', 'dist/manifest.webmanifest', 'dist/sw.js', 'PRIVACY.md', 'ASSET_CREDITS.md', 'ASSET_PROVENANCE.json', 'BETA_TEST.md', 'KNOWN_ISSUES.md', 'RELEASE_CHECKLIST.md', 'RELEASE_CONTRACT.json', 'RELEASE_NOTES_0.2.4_VNEXT.md', 'packaging/Как запустить.txt', 'supabase/README.md']) requireFile(path)
if (existsSync(dist)) walk(dist)
const totalBytes = files.reduce((sum, path) => sum + statSync(path).size, 0)
if (totalBytes > 12_000_000) failures.push(`dist exceeds 12 MB budget: ${totalBytes}`)
const js = files.filter((path) => path.endsWith('.js') && path.includes(`${join('dist', 'assets')}`))
const largestJs = js.map((path) => ({ path, size: statSync(path).size })).sort((a, b) => b.size - a.size)[0]
if (largestJs?.size > 450_000) failures.push(`largest JS chunk exceeds 450 KB: ${relative(root, largestJs.path)} ${largestJs.size}`)
if (js.length < 4) failures.push(`expected route code splitting, found ${js.length} JS chunks`)

if (existsSync(join(dist, 'manifest.webmanifest'))) {
  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'))
  if (manifest.display !== 'standalone') failures.push('manifest display must be standalone')
  if (manifest.start_url !== '/') failures.push('manifest start_url must be /')
  for (const icon of manifest.icons ?? []) {
    const iconPath = join(dist, String(icon.src).replace(/^\//, ''))
    if (!existsSync(iconPath)) failures.push(`manifest icon missing: ${icon.src}`)
  }
}

if (existsSync(join(dist, 'index.html'))) {
  const html = readFileSync(join(dist, 'index.html'), 'utf8')
  if (!html.includes('id="root"')) failures.push('index.html has no app root')
  if (/https?:\/\/(localhost|127\.0\.0\.1)/.test(html)) failures.push('index.html contains a local development URL')
}

if (existsSync(join(root, 'packaging', 'Как запустить.txt'))) {
  const instructions = readFileSync(join(root, 'packaging', 'Как запустить.txt'), 'utf8')
  if (!instructions.includes('НЕПОДПИСАННЫЙ PORTABLE-ВЫПУСК')) failures.push('Windows package does not disclose its unsigned status')
  if (!instructions.includes('SHA-256')) failures.push('Windows package instructions do not explain checksum verification')
}

if (existsSync(join(root, 'RELEASE_CONTRACT.json'))) {
  const contract = JSON.parse(readFileSync(join(root, 'RELEASE_CONTRACT.json'), 'utf8'))
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const storageSource = readFileSync(join(root, 'src', 'game', 'storage.ts'), 'utf8')
  const summarySource = readFileSync(join(root, 'src', 'game', 'run-summary.ts'), 'utf8')
  const dailySource = readFileSync(join(root, 'src', 'game', 'daily-protocol.ts'), 'utf8')
  const saveVersion = Number(storageSource.match(/SAVE_VERSION\s*=\s*(\d+)/)?.[1])
  const summaryVersion = Number(summarySource.match(/schemaVersion:\s*(\d+)/)?.[1])
  const dailyVersion = dailySource.match(/DAILY_RULESET_VERSION\s*=\s*'([^']+)'/)?.[1]
  if (contract.status !== 'frozen-rc') failures.push('release contract is not frozen')
  if (packageJson.version !== contract.appVersion) failures.push(`package version ${packageJson.version} differs from frozen ${contract.appVersion}`)
  if (saveVersion !== contract.saveVersion) failures.push(`save version ${saveVersion} differs from frozen ${contract.saveVersion}`)
  if (summaryVersion !== contract.runSummarySchemaVersion) failures.push(`RunSummary schema ${summaryVersion} differs from frozen ${contract.runSummarySchemaVersion}`)
  if (dailyVersion !== contract.dailyRulesetVersion) failures.push(`daily ruleset ${dailyVersion} differs from frozen ${contract.dailyRulesetVersion}`)
}

if (existsSync(join(root, 'ASSET_PROVENANCE.json'))) {
  const provenance = JSON.parse(readFileSync(join(root, 'ASSET_PROVENANCE.json'), 'utf8'))
  const sets = Array.isArray(provenance.sets) ? provenance.sets : []
  const declared = new Set(sets.map((entry) => entry.directory))
  const assetRoot = join(root, 'src', 'assets')
  const directories = readdirSync(assetRoot).filter((name) => statSync(join(assetRoot, name)).isDirectory())
  for (const directory of directories) if (!declared.has(directory)) failures.push(`asset directory has no provenance record: src/assets/${directory}`)
  for (const entry of sets) {
    if (typeof entry.directory !== 'string' || !existsSync(join(assetRoot, entry.directory))) failures.push(`declared asset directory is missing: ${entry.directory}`)
    if (typeof entry.source !== 'string' || !entry.source.trim()) failures.push(`asset source is missing: ${entry.directory}`)
    if (typeof entry.license !== 'string' || !entry.license.trim()) failures.push(`asset license is missing: ${entry.directory}`)
  }
}

if (failures.length) {
  console.error(`Release audit failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}
console.log(`Release audit passed: ${files.length} files, ${(totalBytes / 1_000_000).toFixed(2)} MB, ${js.length} JS chunks, largest ${largestJs ? `${relative(root, largestJs.path)} ${(largestJs.size / 1000).toFixed(1)} KB` : 'n/a'}.`)
