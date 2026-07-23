import { parseNdJson } from "../docs/js/ndjson-helper.js";
import { formatTable, createRow, getHomerunResponse, } from './helpers.js';
import { findTeam } from '../docs/js/npb-teams.js';

const season = "2026";

const byTeam = await groupByTeam();

const data = Object.entries(byTeam.teamStats)
  .map(([teamCode, { hr, hra }]) => {
    const team = findTeam(teamCode);
    return {
      team: team.teamName,
      league: team.league,
      teamCode,
      hr: hr.toString().padStart(3),
      hra: hra.toString().padStart(3),
    };
  });

const groupedByLaegue = Object.groupBy(data, ({ league }) => league)
const rows = Object.entries(groupedByLaegue)
  .map(([league, group]) => {
    return group
      .sort((a, b) => b.hr - a.hr)
      .map(({ team, hr, hra }) => {
        return [
          team.padEnd(10),
          String(hr).padStart(5),
          String(hra).padStart(9),
          String(hr - hra).padStart(4 + 5),
        ].join(' ')
      })
  })
  ;

const title = `${season} NPB Home Runs (${byTeam.total})`;
const header = `${"Team".padEnd(10)} ${"Hit".padStart(5)}    ${"Allowed".padStart(5)}    ${"Diff".padStart(5)}`;
const rowLength = header.length;
console.log(
  [
    `${" ".repeat(.5 * (rowLength - title.length))}${title}`,
    "=".repeat(rowLength),
    header,
    "-".repeat(rowLength),
    rows.at(0).join("\n"),
    "-".repeat(rowLength),
    rows.at(1).join("\n"),
    "-".repeat(rowLength),
    byTeam.lastUpdated.padStart(rowLength),
  ].join("\n")
);

async function groupByTeam() {
  const stats = {
    hr: 0, hra: 0,
  };
  const teamStats = {};
  const data = { lastUpdated: '', total: 0, };

  const res = getHomerunResponse();
  for await (const cur of parseNdJson(res)) {
    const battingTeam = cur.batter.teamCode;
    const pitchingTeam = cur.pitcher.teamCode;
    const db = teamStats[battingTeam] || (teamStats[battingTeam] = { ...stats });
    const dp = teamStats[pitchingTeam] || (teamStats[pitchingTeam] = { ...stats });
    db.hr += 1;
    dp.hra += 1;
    data.total += 1;
    data.lastUpdated = cur.date;
  }
  return Object.assign(data, { teamStats });
}