SHELL := /bin/bash
SCR=get-game-info.bun.js
GAMEDAY ?= $(shell TZ='America/Los_Angeles' date  --rfc-3339=date)

.PHONY: today

today:
	bun $(SCR) $(GAMEDAY)

daily/%.json: $(SCR)
	bun $(SCR) $*
