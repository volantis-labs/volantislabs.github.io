# Merges the two recordings into public/volantis-db/demo-results.json.
# Usage: python3 merge.py results.json graph-results.json
import json, sys
r = json.load(open(sys.argv[1])); g = json.load(open(sys.argv[2])); c = json.load(open('corpus.json'))
out = {'about': 'Real output of Volantis DB 0.1.0 (Node binding, default on-device model, offline). The documents are invented. Scripts: tools/volantis-db-demo in the site repo.',
       'meta': r['meta'], 'corpus': c, 'queries': r['queries'], 'graph': g}
json.dump(out, open('../../public/volantis-db/demo-results.json', 'w'), ensure_ascii=False, separators=(',', ':'))
