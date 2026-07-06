SHELL := /bin/bash
GAMEDAY ?= $(shell TZ='America/Los_Angeles' date  --rfc-3339=date)
SCR := get-game-info.bun.js

.PHONY: today nightly reget

today:
	bun $(SCR) $(GAMEDAY)

nightly:
	bun $(SCR) $(GAMEDAY)

reget:
	$(MAKE) today -B

daily/%.json: $(SCR)
	bun $(SCR) $*
