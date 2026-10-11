// Optional development QA fixtures. Production inference never downloads these.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');

const directory = path.resolve(__dirname, '../.qa/extra-models');
const embeddingRevision = '4b544e74dfc3256b2b56849ea5d7064fee1ac846';
const reasoningRevision = '91cad51170dc346986eccefdc2dd33a9da36ead9';
const embeddingFiles = [
  ['config.json', 657, 'c8bcaca23b245d64047ee04fa2edcc55867064b67cbbe2772f660cdbdfb1978c'],
  ['special_tokens_map.json', 125, 'b6d346be366a7d1d48332dbc9fdf3bf8960b5d879522b7799ddba59e76237ee3'],
  ['tokenizer_config.json', 366, '9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3'],
  ['tokenizer.json', 711649, '2fc687b11de0bc1b3d8348f92e3b49ef1089a621506c7661fbf3248fcd54947e'],
  ['onnx/model_quantized.onnx', 17452106, 'b190f50dd46296b9895ae8f274c3455762d08610f8788f4a9bd15019f4f7160c'],
];
const fixtures = embeddingFiles.map(([name, bytes, sha256]) => ({
  name: 'paraphrase-MiniLM-L3-v2/' + name,
  bytes,
  sha256,
  url: `https://huggingface.co/Xenova/paraphrase-MiniLM-L3-v2/resolve/${embeddingRevision}/${name}`,
}));
fixtures.push({
  name: 'qwen2.5-1.5b-instruct-q4_k_m.gguf',
  bytes: 1117320736,
  sha256: '6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e',
  // Publisher filename is lowercase, including q4_k_m.
  url: `https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/resolve/${reasoningRevision}/qwen2.5-1.5b-instruct-q4_k_m.gguf`,
});

async function hash(file) {
  const digest = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) digest.update(chunk);
  return digest.digest('hex');
}

async function verified(file, fixture) {
  try {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size === fixture.bytes && await hash(file) === fixture.sha256;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function prepare(fixture, verifyOnly) {
  const file = path.join(directory, fixture.name);
  if (await verified(file, fixture)) {
    console.log('Verified: ' + fixture.name);
    return;
  }
  if (verifyOnly) throw new Error('Missing or checksum mismatch: ' + file);

  fs.mkdirSync(path.dirname(file), {recursive: true});
  const partial = file + '.partial';
  const result = spawnSync('curl.exe', [
    '--fail', '--location', '--retry', '3',
    '--proto', '=https', '--proto-redir', '=https',
    '--output', partial, fixture.url,
  ], {stdio: 'inherit', windowsHide: true});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Download failed: ' + fixture.name);
  // A failed download or checksum never replaces the existing destination.
  if (!await verified(partial, fixture)) throw new Error('Downloaded checksum did not match: ' + fixture.name);
  fs.renameSync(partial, file);
  console.log('Prepared: ' + fixture.name);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Usage: node scripts/prepare-test-models.cjs [--verify-only]');
    console.log('Optional QA models (~1.14 GB), stored in .qa/extra-models.');
    console.log('--verify-only checks existing files without downloads or writes.');
    return;
  }
  if (args.some(arg => arg !== '--verify-only')) throw new Error('Unknown argument. Use --help for usage.');
  const verifyOnly = args.includes('--verify-only');
  const errors = [];
  for (const fixture of fixtures) {
    try { await prepare(fixture, verifyOnly); }
    catch (error) { errors.push(error.message); }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(verifyOnly ? 'All six optional QA files verified; no downloads or writes.' : 'Optional QA models are ready.');
}

if (require.main === module) main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
