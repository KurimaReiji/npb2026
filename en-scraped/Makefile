SHELL := /bin/bash
SCR=en-get-game-info.bun.js
GAMEDAY ?= $(shell TZ='America/Los_Angeles' date  --rfc-3339=date)
# 中間ファイルとして扱われても、自動削除（rm）されるのを防ぐ
.SECONDARY:

.PHONY: today

today: daily/$(GAMEDAY).json

daily/%.json: $(SCR) ../scraped/daily/%.json
	bun $(SCR) $*

../scraped/daily/%.json:
	$(MAKE) -C ../scraped daily/$*.json
