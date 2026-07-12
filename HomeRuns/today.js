import { parseNdJson } from "../docs/js/ndjson-helper.js";
import { formatTable, createRow, getHomerunResponse, } from './helpers.js';

const season = "2026";

const today = (new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date()));
const arg = process.argv.slice(2);
const target = arg.length > 0 ? arg[0] : today;

const info = [];
const rows = [];
const res = getHomerunResponse();

for await (const cur of parseNdJson(res)) {
  if (cur.date === target) {
    rows.push(createRow(cur));
    if (cur.isLeadOff === "Y") { info.push(`lead off: ${cur.batter.boxscoreName}`) }
    if (cur.isWalkOff === "Y") { info.push(`walk-off: ${cur.batter.boxscoreName}`) }
    if (cur.rbi === 4) { info.push(`grand slam: ${cur.batter.boxscoreName}`) }
  }
}
if (rows.length === 0) process.exit();

console.log(formatTable(`${season} NPB Home Runs (${target})`, rows));
if (info.length > 0) {
  console.warn(`\n${info.join("\n")}`);
}