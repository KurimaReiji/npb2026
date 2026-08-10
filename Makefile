SHELL := /bin/bash
GAMEDAY ?= $(shell TZ='America/Los_Angeles' date  --rfc-3339=date)

.PHONY: nightly

nightly:
	$(MAKE) -C PlayerStats
	$(MAKE) -C scraped reget
	$(MAKE) -C Games nightly
	$(MAKE) -C HomeRuns nightly

