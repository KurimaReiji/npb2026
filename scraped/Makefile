SHELL := /bin/bash
GAMEDAY ?= $(shell TZ='America/Los_Angeles' date  --rfc-3339=date)
SCR := get-game-info.bun.js

.PHONY: today nightly

today:
	bun $(SCR) $(GAMEDAY)

nightly:
	bun $(SCR) $(GAMEDAY)

daily/%.json: $(SCR)
	bun $(SCR) $*
