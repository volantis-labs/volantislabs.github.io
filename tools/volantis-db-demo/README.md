# Volantis DB demo recordings

These scripts make `public/volantis-db/demo-results.json`, the data for the search lab and the graph example on `/volantis-db/`.
They run the real engine and save its output. The page only replays the file.

Requirements: macOS on Apple silicon, Node 20 or later, `volantis-db` 0.1.0 from npm, and the default model in the cache
(`~/Library/Caches/volantis-db/models`). The scripts open the model with `offline: true`, so they never download.

```sh
cd tools/volantis-db-demo
npm install --no-save volantis-db@0.1.0        # or set VOLANTIS_DB_FROM to a folder that has it
node record.mjs corpus.json queries.json results.json
node graph-record.mjs "who talked about pricing?" "hiring for the support team" "first-run experience" "what did Northwind ask for?"
python3 merge.py results.json graph-results.json
```

`queries.json` gives the right answer (`answer`, a document id) for each question. We set it before the run.
The 2026-11-27 recording used Moxie's copy of the package (`VOLANTIS_DB_FROM=../wallflower/app`) on an Apple M3 Max.
