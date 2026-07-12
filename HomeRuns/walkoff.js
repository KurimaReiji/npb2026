import { parseNdJson } from "../docs/js/ndjson-helper.js";
import { formatTable, createRow, getHomerunResponse, } from './helpers.js';

const season = "2026";

const rows = [];
const res = getHomerunResponse();

for await (const cur of parseNdJson(res)) {
  if (cur.isWalkOff === "Y") {
    rows.push(createRow(cur));
  }
}

console.log(formatTable(`${season} NPB Walk-off Home Runs (${rows.length})`, rows));
