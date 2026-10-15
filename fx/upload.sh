#!/bin/bash
# Upload files to VicenteGGomez/personal-resume branch fx-panel (needs github credentials on the shell call).
# usage: upload.sh file1 [file2 ...]
set -e
for f in "$@"; do
  sha=$(apicall github contents_get owner=VicenteGGomez repo=personal-resume path="fx/$(basename $f)" ref=fx-panel 2>/dev/null | python3 -c "import json,sys;print(json.load(sys.stdin).get('sha',''))" || true)
  b64=$(base64 -w0 "$f")
  if [ -n "$sha" ]; then
    apicall github contents_put owner=VicenteGGomez repo=personal-resume path="fx/$(basename $f)" branch=fx-panel message="fx: update $(basename $f)" content="$b64" sha="$sha" > /tmp/up.json
  else
    apicall github contents_put owner=VicenteGGomez repo=personal-resume path="fx/$(basename $f)" branch=fx-panel message="fx: add $(basename $f)" content="$b64" > /tmp/up.json
  fi
  python3 -c "import json;d=json.load(open('/tmp/up.json'));print('$f', d.get('commit',{}).get('sha','ERR '+str(d)[:200]))"
done
