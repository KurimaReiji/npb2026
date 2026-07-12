import { parseNdJson } from "../docs/js/ndjson-helper.js";
import { formatTable, createRow, getHomerunResponse, } from './helpers.js';

const season = "2026";

const rows = [];
const res = getHomerunResponse();

for await (const cur of parseNdJson(res)) {
  if (cur.isPinchHit === "Y") {
    rows.push(createRow(cur));
  }
}

console.log(formatTable(`${season} NPB Pinch Hit Home Runs (${rows.length})`, rows));
