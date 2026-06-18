SHELL := /bin/bash
SCR=en-get-game-info.bun.js
GAMEDAY ?= $(shell TZ='America/Los_Angeles' date  --rfc-3339=date)

.PHONY: today

today: daily/$(GAMEDAY).json

daily/%.json: $(SCR)
	bun $(SCR) $*
