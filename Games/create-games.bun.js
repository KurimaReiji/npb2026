import { parseGameInfo, getBoxscore, getLinescore, getDecisions, getBatteries, getHomeRuns, getPlayers, getBoxscoreNames, getPlays } from './create-games.funcs.bun.js';
import { findVenue } from '../docs/js/npb2026-venues.js';
import { getBoxscoreNamesFromDB } from '../docs/js/boxscoreNames.js';
import { applyPatch } from 'fast-json-patch';
import { join } from 'path';
import { findTeam } from '../docs/js/npb-teams.js';

const dates = process.argv.slice(2);

for (const date of dates) {
  await main(date);
}

async function main(date) {

  const { infile, enfile, outfile, patchFile, verifyFile } = getDailyPaths(date);
  const boxscoreNamesDB = await getBoxscoreNamesFromDB(date);

  if (!(await Bun.file(infile).exists())) {
    console.error(`not found: ${infile}`);
    return;
  }
  const inputs = await Bun.file(infile).json();
  const en = await Bun.file(enfile).exists()
    ? await Bun.file(enfile).json()
    : [];

  const data = inputs
    .map(({ baseUrl: link, ...scraped }) => {
      const { date: jaDate, title: jaTitle, place, gameInfo, umpires, decisions, battery, homeruns: homeRuns, linescore: rawLinescore, } = scraped['index.html'];
      const { jaStatus, startTime, endTime, duration, attendanece } = parseGameInfo(gameInfo);
      const venue = (({ boxscoreName, jaBoxscoreName, name, jaName }) =>
        ({ boxscoreName, jaBoxscoreName, name, jaName })
      )(findVenue(place));

      const box = scraped['box.html'];
      const boxscoreNames = getBoxscoreNames(en.find(({ venue: v }) => v === venue.boxscoreName));
      const boxscore = getBoxscore(box, boxscoreNames, boxscoreNamesDB);
      const linescore = getLinescore(rawLinescore, boxscore);
      const plays = getPlays(scraped['playbyplay.html'], linescore);
      const players = getPlayers(boxscore, scraped['roster.html']);

      return {
        date: jaDate.split(/[年月日]/).slice(0, 3).map(s => s.padStart(2, "0")).join("-"),
        link,
        jaDate,
        jaTitle,
        venue,
        jaStatus, startTime, endTime, duration, attendanece,
        teams: {
          away: { ...(getTeam(rawLinescore.away.at(0).split(/\s+/).at(0))) },
          home: { ...(getTeam(rawLinescore.home.at(0).split(/\s+/).at(0))) },
        },
        umpires,
        decisions: getDecisions(decisions),
        battery: getBatteries(battery),
        homeRuns: getHomeRuns(homeRuns),
        linescore,
        boxscore,
        plays,
        players,
      }
    })
    .map((game) => {
      const flags = getFlags(game);
      const starters = ["away", "home"]
        .map((rh) => {
          const starterId = game.boxscore[rh].pitchers[0];
          const starter = game.players[rh].find(({ id }) => id === starterId);
          return starter.pitchHand;
        })
        ;
      game.teams.away = { ...game.teams.away, runs: game.linescore.teams.away.runs, starter: starters[0] };
      game.teams.home = { ...game.teams.home, runs: game.linescore.teams.home.runs, starter: starters[1] };

      const sign = Math.sign(game.teams.away.runs - game.teams.home.runs);
      const winner = [game.teams.home.teamName, "Tied", game.teams.away.teamName][sign + 1];
      const loser = [game.teams.away.teamName, "Tied", game.teams.home.teamName][sign + 1];

      return {
        ...game, winner, loser, flags,
      }

    })
    ;

  const result = await patchJson(data, patchFile);
  const output = JSON.stringify(result, null, 2);
  await Bun.write(outfile, output);

  await Promise.all([inningStatChecker(result), inningScoreChecker(result)])

  await verifyJson(result, verifyFile);
}

function getTeam(name) {
  const { teamCode, teamName, officialName, jaTeamName, jaOfficialName } = findTeam(name);
  return { teamCode, teamName, officialName, jaTeamName, jaOfficialName };
}

async function inningScoreChecker(games) {
  games.forEach((g) => {
    const { innings } = g.linescore;
    const { link, teams, plays } = g;
    const teamCodes = ["away", "home"].map(ah => teams[ah].teamCode).join("-");
    let halfInning;
    const score = innings.flatMap((o, idx, ary) => {
      const output = [];
      let away = ary.slice(0, idx).reduce((a, c) => a + c.away.runs, 0);
      let home = ary.slice(0, idx).reduce((a, c) => a + c.home.runs, 0)
      // before beginning of the top of the nth inning
      output.push({
        num: o.num,
        away,
        home,
      });
      away = ary.slice(0, idx + 1).reduce((a, c) => a + c.away.runs, 0);
      if (idx !== ary.length - 1 || away >= output.at(-1).home) {
        // 後攻がリードして裏の攻撃中にコールドがだめだ
        output.push({
          num: o.num,
          away,
          home,
        })
      }
      return output;
    });

    const output = [];
    plays.forEach((play) => {
      if (halfInning !== play.inning.halfInning) {
        output.push(`${play.inning.inning},${play.runs.away},${play.runs.home}`);
        halfInning = play.inning.halfInning;
      }
    });
    const [condA, condB] = [
      score.flatMap(o => [`${o.num}`, `${o.away}`, `${o.home}`]).join(","),
      output.join(',')
    ];
    if (condA !== condB) {
      console.error([teamCodes, link, condA, condB].join("\n"));
    }
  });
}

async function inningStatChecker(games) {
  games.forEach((g) => {
    const { innings, teams } = g.linescore;
    const hits = innings.reduce((a, c) => a + c.home.hits + c.away.hits, 0);
    if (hits !== teams.away.hits + teams.home.hits) {
      console.error(`${g.link} hits: ${teams.away.hits}, ${teams.home.hits}, ${hits}`);
    }
    const errors = innings.reduce((a, c) => a + c.home.errors + c.away.errors, 0);
    if (errors !== teams.away.errors + teams.home.errors) {
      console.error(`${g.link} errors: away ${teams.away.errors} + home ${teams.home.errors} != ${errors}`);
    }
  })

  return;
}

function getDailyPaths(date) {
  const appRoot = __dirname;
  return {
    infile: join(appRoot, '../scraped', 'daily', `${date}.json`),
    enfile: join(appRoot, '../en-scraped', 'daily', `${date}.json`),
    outfile: join(appRoot, '.', 'daily', `${date}.json`),
    patchFile: join(appRoot, '.', 'patch', `${date}.json-patch`),
    verifyFile: join(appRoot, '.', 'verify', `${date}.json-verify`),
  }
}

async function patchJson(beforePatch, patchFile) {
  if (!(await Bun.file(patchFile).exists())) {
    return beforePatch;
  }
  try {
    const patch = await Bun.file(patchFile).json();
    const result = applyPatch(beforePatch, patch, { mutateDocument: false });
    return result.newDocument;
  } catch (err) {
    if (err.operation) {
      console.error(JSON.stringify(err.operation, null, 2));
    } else if (err.message) {
      console.error(err.message);
    }
    return beforePatch;
  }
}

async function verifyJson(document, verifyFile) {
  if (!(await Bun.file(verifyFile).exists())) {
    return document;
  }
  try {
    const verifyPatch = await Bun.file(verifyFile).json();
    applyPatch(document, verifyPatch, {
      mutateDocument: false,
      strict: true
    });
  } catch (err) {
    if (err.operation) {
      console.error(JSON.stringify(err.operation, null, 2));
    } else if (err.message) {
      console.error(err.message);
    }
  }
}

function getRunBalance(innings) {
  const balance = [];
  let currentBalance = 0;

  innings.forEach((inn) => {
    currentBalance += inn.away.runs;
    balance.push(currentBalance);

    currentBalance -= inn.home.runs;
    balance.push(currentBalance);
  });
  return balance;
}

function checkHadComeback(runBalance) {
  const [min, max] = [Math.min(...runBalance), Math.max(...runBalance)];
  return min * max < 0;
}

function getFlags(game) {
  const { linescore, teams } = game;
  const { home, away } = teams;
  const runBalance = getRunBalance(linescore.innings);
  const firstRun = [home.team, null, away.team].at(1 + Math.sign(runBalance.filter((n) => n !== 0).at(0)));
  const isWalkOff = runBalance.at(-1) < 0 && runBalance.at(-2) >= 0;
  const isExtraInnings = runBalance.length > 18;
  const hadComeback = checkHadComeback(runBalance);
  const isOneRunGame = Math.abs(home.runs - away.runs) === 1;
  const isShutout = home.runs === 0 || away.runs === 0;
  const isDoubleDigitRuns = home.runs > 9 || away.runs > 9;
  return {
    isOneRunGame, isShutout, isDoubleDigitRuns, firstRun, isWalkOff, isExtraInnings, hadComeback,
  }
}
