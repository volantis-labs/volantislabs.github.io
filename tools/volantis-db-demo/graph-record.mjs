// Records real Cypher queries that join hybrid search to graph links.
// Usage: node graph-record.mjs "question 1" "question 2" ...
import { createRequire } from 'node:module';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
// VOLANTIS_DB_FROM: a folder whose node_modules has volantis-db 0.1.0 (default: this folder).
const require = createRequire(join(process.env.VOLANTIS_DB_FROM || process.cwd(), '/'));
const { TextStore, openNamespace } = require('volantis-db');
const ns = openNamespace(mkdtempSync(join(os.tmpdir(), 'vdb-graph-')), 'meetings', { embeddedModel: TextStore.defaultModel }, { offline: true });
ns.enableGraph();
const people = ['Priya', 'Marco', 'Lena', 'Tomás', 'Aiko'];
const meetings = [
  ['Pricing review', 'We agreed to raise the Pro price in March and keep the student discount.', [0, 1, 4]],
  ['Weekly sync', 'Launch checklist, then hiring for the support team.', [0, 2, 3]],
  ['Northwind call', 'They asked for an annual invoice and a lower rate for 40 seats.', [1, 3]],
  ['Design critique', 'New onboarding screens with fewer steps before the first note.', [2, 4]],
  ['Board prep', 'Revenue plan for next year, and what a cheaper tier does to margins.', [0, 1]],
];
ns.upsert(meetings.map(([title, text], i) => ({ id: BigInt(101 + i), revision: 1n, text: `${title}. ${text}` })));
const items = people.map((name) => ({ kind: 'node', operation: 'create', namespace: 'people', key: name, revision: 1n, labels: ['Person'], properties: { name } }));
meetings.forEach(([title], i) => items.push({ kind: 'node', operation: 'create', namespace: 'meetings', key: title, revision: 1n, labels: ['Meeting'], properties: { title } }));
meetings.forEach(([title, , ps], i) => {
  const m = people.length + i;
  items.push({ kind: 'relationship', operation: 'create', namespace: 'notes', key: title, revision: 1n, type: 'HAS_NOTES', source: { local: m }, target: BigInt(101 + i) });
  for (const p of ps) items.push({ kind: 'relationship', operation: 'create', namespace: 'attended', key: `${people[p]}/${title}`, revision: 1n, type: 'ATTENDED', source: { local: p }, target: { local: m } });
});
ns.graphApply(items);
const cypher = `CALL ze.hybrid_search($q, 3, 'exact') YIELD node, score
MATCH (m:Meeting)-[:HAS_NOTES]->(node), (p:Person)-[:ATTENDED]->(m)
RETURN m.title AS meeting, score, collect(p.name) AS people
ORDER BY score DESC`;
const runs = [];
for (const q of process.argv.slice(2)) {
  for (let i = 0; i < 5; i++) ns.cypher(cypher, { q });
  const ms = [];
  let res;
  for (let i = 0; i < 41; i++) { const a = process.hrtime.bigint(); res = ns.cypher(cypher, { q }); ms.push(Number(process.hrtime.bigint() - a) / 1e6); }
  ms.sort((a, b) => a - b);
  const rows = res.rows.map(([m, s, p]) => ({ meeting: m, score: +Number(s).toFixed(3), people: p }));
  console.log(q, JSON.stringify(rows), 'p50', ms[20].toFixed(2));
  runs.push({ q, rows, p50: +ms[20].toFixed(2) });
}
writeFileSync(process.env.OUT || 'graph-results.json', JSON.stringify({ cypher, runs, people, meetings: meetings.map(([t, x, ps]) => ({ title: t, text: x, people: ps.map((p) => people[p]) })) }, null, 1));
ns.close();
