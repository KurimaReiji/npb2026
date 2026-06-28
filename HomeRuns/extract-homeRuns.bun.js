import { join } from 'path';

const template = { // team win/loss を追加しよう
  id: "",
  date: "",
  batter: {},
  pitcher: {},
  number: -1,
  inning: -1,
  halfInning: "",
  outs: -1,
  "RoB": "",
  count: {},
  runs: {},
  bop: -1,
  rbi: -1,
  whereHit: "",
  venue: {},
  jaText: "",
  result: "",
}
const dates = process.argv.slice(2);

for (const date of dates) {
  await main(date);
}

async function main(date) {
  const infile = join(__dirname, '../Games', 'daily', `${date}.json`);
  const outfile = join(__dirname, 'daily', `${date}.json`);
  const inputs = await Bun.file(infile).json();

  const data = inputs
    .map((game) => {
      const { link, teams, venue, homeRuns, plays, players, winner, loser } = game;
      const hrs = plays.filter((play) => play.result.jaText.includes("ホームラン"))
        .map((play) => {
          const { inning, halfInning } = play.inning;
          const { outs, runners, count, plateAppearances, } = play;
          const batterId = play.batter.id;
          const pitcherId = play.pitcher.id;
          const batter = ((playerId, players) => {
            const currentTeam = halfInning === 'top' ? teams.away : teams.home;
            const { teamCode, teamName } = currentTeam;
            const { id, jaBoxscoreName, boxscoreName, batSide } = players.find((p) => p.id === playerId);
            return {
              id, jaBoxscoreName, boxscoreName: boxscoreName ?? "TBA", batSide, teamCode, teamName,
            }
          })(batterId, players[halfInning === 'top' ? 'away' : 'home']);
          const pitcher = ((playerId, players) => {
            const currentTeam = halfInning === 'top' ? teams.home : teams.away;
            const { teamCode, teamName } = currentTeam;
            const { id, jaBoxscoreName, boxscoreName, pitchHand } = players.find((p) => p.id === playerId);
            return {
              id, jaBoxscoreName, boxscoreName: boxscoreName ?? "TBA", pitchHand, teamCode, teamName,
            }
          })(pitcherId, players[halfInning === 'top' ? 'home' : 'away']);
          const { jaText } = play.result;
          const whereHit = get_where(jaText);

          const RoB = runners;
          const bop = plateAppearances % 9 || 9;
          const runs = { away: play.runs.away, home: play.runs.home };
          const hr = homeRuns[halfInning === 'top' ? 'away' : 'home'].find((h) => h.batter.id === batter.id && h.inning === inning); // NG: 2 HR in the same inning
          const link = new URL(`./playbyplay.html`, game.link);
          link.hash = `com${inning}-${halfInning === "top" ? 1 : 2}`;
          const gameResult = winner === batter.teamName ? "W" : (loser === batter.teamName ? "L" : "T");
          const isLeadOff = play.plateAppearances === 1 ? "Y" : undefined;
          const isPinchHit = play.isPinchHit ? "Y" : undefined;
          const isWalkOff = game.flags.isWalkOff && halfInning === "bottom" && inning > 8 && runs.away < (runs.home + hr.rbi) ? "Y" : undefined;//`NNN: ${runs.away} ${runs.home} ${hr.rbi}`;

          return { ...template, date, venue, outs, RoB, count, bop, runs, jaText, whereHit, ...hr, batter, pitcher, gameResult, link: link.href, isLeadOff, isWalkOff, isPinchHit };
        });
      return hrs;
    })
    .flat();
  const output = JSON.stringify(data, null, 2);
  await Bun.write(outfile, output);

}

function get_where(jaText) {
  const dic = {
    "レフト": "7",
    "ライト": "9",
    "センター": "8",
    "左中間": "78",
    "右中間": "89",
    "NA": "NA",
  };
  const whereHit = jaText.match(/(レフト|ライト|センター|左中間|右中間)/)?.at(1) || "NA";
  return dic[whereHit];
}