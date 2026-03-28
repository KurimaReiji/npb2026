YESTERDAY := $(shell TZ='Asia/Tokyo' date -d "1 day ago" --rfc-3339=date)

$(YESTERDAY).json:
	node ./get-leaders.js
#	node ../check-leaders.js
