import { parseNdJson } from "../docs/js/ndjson-helper.js";

const dbfile = "../docs/npb2026-games.ndjson";
const res = new Response(Bun.file(dbfile));

const data = [];
for await (const item of parseNdJson(res)) {
  const { link, date, venue, teams, linescore, boxscore, players, winner, loser, flags, } = item;

  const away = { team: teams.away.teamName, runs: teams.away.runs, starter: teams.away.starter };
  const home = { team: teams.home.teamName, runs: teams.home.runs, starter: teams.home.starter };

  const { firstRun, isOneRunGame, isShutout, isDoubleDigitRuns, isWalkOff, isExtraInnings, hadComeback } = flags;

  data.push({
    date, away, home, venue: venue.boxscoreName, winner, loser, firstRun, isOneRunGame, isShutout, isDoubleDigitRuns, isWalkOff, isExtraInnings, hadComeback, link,
  })
}

const output = data.map((o) => JSON.stringify(o)).join("\n");
const outfile = "../docs/npb2026-results.ndjson";
await Bun.write(outfile, output);

