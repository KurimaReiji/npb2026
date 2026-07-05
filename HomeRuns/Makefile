SHELL := /bin/bash
GAMEDAY ?= $(shell TZ='America/Los_Angeles' date  --rfc-3339=date)
SCR=extract-homeRuns.bun.js

.PHONY: ndjson all daily nightly

daily: ../Games/daily/$(GAMEDAY).json
	bun $(SCR) $(GAMEDAY)
	$(MAKE) ndjson

../Games/daily/$(GAMEDAY).json:
	$(MAKE) -C ../Games today

nightly:
	bun $(SCR) $(GAMEDAY)
	$(MAKE) ndjson

ndjson: 
	jq -c '.[]' daily/*json > ../docs/npb2026-homeruns.ndjson

daily/%.json: $(SCR)
	bun $(SCR) $*

.PHONY: Mar Apr May Jun Jul
Mar:
	bun $(SCR) 2026-03-{27..31}
Apr:
	bun $(SCR) 2026-04-{01..30}
May:
	bun $(SCR) 2026-05-{01..31}
Jun:
	bun $(SCR) 2026-06-{01..30}

all: Mar Apr May Jun ndjson
