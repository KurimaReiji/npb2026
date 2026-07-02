SHELL := /bin/bash
GAMEDAY ?= $(shell TZ='America/Los_Angeles' date  --rfc-3339=date)
SCR := create-games.bun.js

daily/%.json: $(SCR) $(wildcard patch/%.json verify/%.json)
	bun $(SCR) $*

.PHONY: today nightly Mar Apr May Jun Jul all ndjson

today:
	bun $(SCR) $(GAMEDAY)

nightly: 
	$(MAKE) -C ../en-scraped nightly
	bun $(SCR) $(GAMEDAY)
	$(MAKE) ndjson
	bun create-results.bun.js

Mar:
	bun $(SCR) 2026-03-{27..31}
Apr:
	bun $(SCR) 2026-04-{01..30}
May:
	bun $(SCR) 2026-05-{01..31}
Jun:
	bun $(SCR) 2026-06-{01..30}
Jul:
	bun $(SCR) 2026-06-{01..2}

all: Mar Apr May Jun Jul

ndjson:
	jq -c '.[]' daily/*json > ../docs/npb2026-games.ndjson
