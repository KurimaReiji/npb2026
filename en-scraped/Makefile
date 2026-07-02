SHELL := /bin/bash
GAMEDAY ?= $(shell TZ='America/Los_Angeles' date  --rfc-3339=date)
SCR=en-get-game-info.bun.js
# 中間ファイルとして扱われても、自動削除（rm）されるのを防ぐ
.SECONDARY:

.PHONY: today nightly

today: daily/$(GAMEDAY).json

nightly: daily/$(GAMEDAY).json

daily/%.json: $(SCR) ../scraped/daily/%.json
	bun $(SCR) $*

2026-%:
	bun $(SCR) 2026-$*

../scraped/daily/%.json:
	$(MAKE) -C ../scraped daily/$*.json
