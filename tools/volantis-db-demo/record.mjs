// Records real Volantis DB 0.1.0 results for the site's search demo.
// Usage: node record.mjs <corpus.json> <queries.json> <out.json>
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
// VOLANTIS_DB_FROM: a folder whose node_modules has volantis-db 0.1.0 (default: this folder).
const require = createRequire(join(process.env.VOLANTIS_DB_FROM || process.cwd(), '/'));
const { TextStore } = require('volantis-db');
const pkg = JSON.parse(readFileSync(join(require.resolve('volantis-db'), '..', 'package.json'), 'utf8'));

const [corpusPath, queriesPath, outPath] = process.argv.slice(2);
const corpus = JSON.parse(readFileSync(corpusPath, 'utf8'));
const queries = JSON.parse(readFileSync(queriesPath, 'utf8'));
const dir = mkdtempSync(join(os.tmpdir(), 'vdb-demo-'));

const store = await TextStore.openModel({ path: dir, offline: true });
const t0 = process.hrtime.bigint();
const report = await store.ingestAsync(corpus.map((d) => ({ id: BigInt(d.id), revision: 1n, text: d.text })));
const ingestMs = Number(process.hrtime.bigint() - t0) / 1e6;

const RUNS = 41;
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil(p * s.length) - 1)]; };
const out = [];
for (const q of queries) {
  const row = { ...q, legs: {} };
  for (const legs of ['lexical', 'dense', 'hybrid']) {
    for (let i = 0; i < 5; i++) store.query({ text: q.text, k: 5, legs });
    const ms = [];
    let res;
    for (let i = 0; i < RUNS; i++) {
      const a = process.hrtime.bigint();
      res = store.query({ text: q.text, k: 5, legs });
      ms.push(Number(process.hrtime.bigint() - a) / 1e6);
    }
    row.legs[legs] = {
      p50: +pct(ms, 0.5).toFixed(3), p95: +pct(ms, 0.95).toFixed(3),
      hits: res.hits.map((h) => ({ id: Number(h.id), score: +h.score.toFixed(4) })),
      mode: res.diagnostics?.mode, tokens: Number(res.queryTokens),
    };
  }
  out.push(row);
  console.log(q.text, '| lex', row.legs.lexical.hits.map((h) => h.id).join(','), '| vec', row.legs.dense.hits.map((h) => h.id).join(','), '| hyb', row.legs.hybrid.hits.map((h) => h.id).join(','), '| ms', row.legs.lexical.p50, row.legs.dense.p50, row.legs.hybrid.p50);
}
const meta = {
  engine: `volantis-db ${pkg.version} (Node binding)`,
  model: `${TextStore.defaultModel.repo}@${TextStore.defaultModel.revision.slice(0, 7)}`,
  machine: `${os.cpus()[0].model}, ${Math.round(os.totalmem() / 2 ** 30)} GiB, macOS ${os.release()}`,
  documents: corpus.length, chunks: Number(report.chunks), ingestMs: +ingestMs.toFixed(1),
  runs: RUNS, k: 5, recorded: new Date().toISOString().slice(0, 10),
  timing: 'Wall time of one synchronous query() call from Node, warm, after 5 warm-up calls; includes query embedding for vector and hybrid.',
};
writeFileSync(outPath, JSON.stringify({ meta, queries: out }, null, 1));
store.close();
console.log(meta);
