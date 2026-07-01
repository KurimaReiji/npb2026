SHELL := /bin/bash
SCR=extract-homeRuns.bun.js

.PHONY: ndjson all

ndjson: 
	jq -c '.[]' daily/*json > ../docs/npb2026-homeruns.ndjson

daily/%.json: $(SCR)
	bun $(SCR) $*

.PHONY: Mar Apr May Jun
Mar:
	bun $(SCR) 2026-03-{27..31}
Apr:
	bun $(SCR) 2026-04-{01..30}
May:
	bun $(SCR) 2026-05-{01..31}
Jun:
	bun $(SCR) 2026-06-{01..30}

all: Mar Apr May Jun ndjson
