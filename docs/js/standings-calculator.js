import { teams_by_wpct, winpct, games_behind, get_xwl } from "./utils.js";

// ==========================================
// 1. Pure Functions: 初期状態の定義
// ==========================================

const createInitialSplits = () => ({
  left: { type: "left", wins: 0, losses: 0, ties: 0 },
  right: { type: "right", wins: 0, losses: 0, ties: 0 },
  oneRun: { type: "oneRun", wins: 0, losses: 0 },
  shutout: { type: "shutout", pitching: 0, batting: 0, ties: 0 },
  doubleDigitRuns: { type: "doubleDigitRuns", scored: 0, allowed: 0 },
  extraInning: { type: "extraInning", wins: 0, losses: 0, ties: 0 },
  walkoff: { type: "walkoff", wins: 0, losses: 0, ties: 0 },
  comeback: { type: "comeback", wins: 0, losses: 0, ties: 0 },
  firstRunScored: { type: "firstRunScored", wins: 0, losses: 0, ties: 0 },
  firstRunAllowed: { type: "firstRunAllowed", wins: 0, losses: 0, ties: 0 },
});

const createInitialCategory = () => ({
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  pct: "",
  runsScored: 0,
  runsAllowed: 0,
  runDifferential: "",
  wlt: "",
  streak: "",
  splitRecordsMap: createInitialSplits(),
});

const createInitialTeamStore = (teamName, league) => ({
  teamName,
  league,
  overall: createInitialCategory(),
  home: createInitialCategory(),
  away: createInitialCategory(),
});

// ==========================================
// 2. Generators: データのストリーム変換
// ==========================================

/**
 * ゲームの非同期イテレータからチーム視点イベントを順次生成する
 */
async function* generateTeamGameEvents(gamesStream, targetDate = null) {
  for await (const game of gamesStream) {
    if (targetDate && game.date > targetDate) {
      continue;
    }

    for (const rh of ["away", "home"]) {
      const op = rh === "home" ? "away" : "home";
      yield {
        target: game[rh].team,
        opponent: game[op].team,
        date: game.date,
        runsScored: game[rh].runs,
        runsAllowed: game[op].runs,
        isVsRHP: game[op].starter === "R",
        isVsLHP: game[op].starter === "L",
        gamesPlayed: 1,
        wins: game.winner === game[rh].team ? 1 : 0,
        losses: game.loser === game[rh].team ? 1 : 0,
        ties: game.winner === "Tied" ? 1 : 0,
        isHome: game[rh].team === game.home.team,
        isRoad: game[rh].team === game.away.team,
        isFirstRunScored: game.firstRun === game[rh].team,
        isFirstRunAllowed: game.firstRun === game[op].team,
        wlt: game.winner === game[rh].team ? "W" : game.loser === game[rh].team ? "L" : "T",
        isOneRunGame: game.isOneRunGame,
        isExtraInnings: game.isExtraInnings,
        isWalkOff: game.isWalkOff,
        hadComeback: game.hadComeback,
        isShutout: game.isShutout,
        isDoubleDigitRuns: game.isDoubleDigitRuns,
      };
    }
  }
}

// ==========================================
// 3. Pure Functions: 集計 & 更新ロジック
// ==========================================

function updateSplits(splits, event) {
  const next = structuredClone(splits);

  const applyWL = (key) => {
    next[key].wins += event.wins;
    next[key].losses += event.losses;
    if ("ties" in next[key]) next[key].ties += event.ties;
  };

  if (event.isOneRunGame) applyWL("oneRun");
  if (event.isVsRHP) applyWL("right");
  if (event.isVsLHP) applyWL("left");
  if (event.isExtraInnings) applyWL("extraInning");
  if (event.isWalkOff) applyWL("walkoff");
  if (event.hadComeback) applyWL("comeback");
  if (event.isFirstRunScored) applyWL("firstRunScored");
  if (event.isFirstRunAllowed) applyWL("firstRunAllowed");

  if (event.isShutout) {
    next.shutout.pitching += event.runsAllowed === 0 ? 1 : 0;
    next.shutout.batting += event.runsScored === 0 ? 1 : 0;
    next.shutout.ties += (event.runsAllowed === 0 && event.runsScored === 0) ? 1 : 0;
  }

  if (event.isDoubleDigitRuns) {
    next.doubleDigitRuns.scored += event.runsScored > 9 ? 1 : 0;
    next.doubleDigitRuns.allowed += event.runsAllowed > 9 ? 1 : 0;
  }

  return next;
}

function updateCategory(category, event) {
  return {
    ...category,
    gamesPlayed: category.gamesPlayed + event.gamesPlayed,
    wins: category.wins + event.wins,
    losses: category.losses + event.losses,
    ties: category.ties + event.ties,
    runsScored: category.runsScored + event.runsScored,
    runsAllowed: category.runsAllowed + event.runsAllowed,
    wlt: category.wlt + event.wlt,
    splitRecordsMap: updateSplits(category.splitRecordsMap, event),
  };
}

function updateTeamState(currentStore, event) {
  return {
    ...currentStore,
    overall: updateCategory(currentStore.overall, event),
    home: event.isHome ? updateCategory(currentStore.home, event) : currentStore.home,
    away: event.isRoad ? updateCategory(currentStore.away, event) : currentStore.away,
    lastUpdated: event.date,
  };
}

// ==========================================
// 4. Pure Functions: 派生計算 & データ最終整形
// ==========================================

function calculateLast10(wlt) {
  if (!wlt) return { wins: 0, losses: 0, ties: 0, streak: "" };

  const nonTies = wlt.replace(/T/g, "");
  let streak = "";
  if (nonTies.length > 0) {
    const lastResult = nonTies.at(-1);
    const match = nonTies.match(new RegExp(`${lastResult}+$`));
    streak = `${lastResult}${match ? match[0].length : 0}`;
  }

  const rec = wlt.slice(-10).split("").reduce(
    (a, c) => { if (c in a) a[c] += 1; return a; },
    { W: 0, L: 0, T: 0 }
  );

  return { wins: rec.W, losses: rec.L, ties: rec.T, streak };
}

function finalizeTeamRecord(rawTeam) {
  const step1 = Object.assign({
    teamName: rawTeam.teamName,
    league: rawTeam.league,
    wins: rawTeam.overall.wins,
    losses: rawTeam.overall.losses,
    ties: rawTeam.overall.ties,
    pct: winpct(rawTeam.overall.wins, rawTeam.overall.losses).toFixed(3).replace(/^0/, "")
  }, rawTeam);

  ["overall", "home", "away"].forEach((key) => {
    const category = step1[key];

    category.pct = winpct(category.wins, category.losses).toFixed(3).replace(/^0/, "");
    category.runDifferential = category.runsScored - category.runsAllowed;

    const splitRecords = Object.values(category.splitRecordsMap);
    delete category.splitRecordsMap;

    splitRecords.push({
      type: "xWinLoss",
      ...get_xwl(category.wins, category.losses, category.runsScored, category.runsAllowed)
    });
    category.splitRecords = splitRecords;

    const { streak, ...last10Rest } = calculateLast10(category.wlt);
    Object.assign(category, { last10: last10Rest, streak });
  });

  return step1;
}

function calculateLeagueStandings(teams) {
  return teams
    .sort(teams_by_wpct)
    .map((o, i, ary) => {
      o.overall.gamesBack = i === 0 ? "" : games_behind(o.overall.wins, o.overall.losses, ary[0].overall.wins, ary[0].overall.losses);
      return o;
    });
}

// ==========================================
// 5. Main Pure Function
// ==========================================

/**
 * 依存関係を外部から注入（DI）することで完全な Pure Function にした計算エントリーポイント
 * 
 * @param {Array<{teamName: string, league: string}>} teams チームマスターデータ
 * @param {AsyncIterable<Object> | Iterable<Object>} gamesStream 試合データストリーム
 * @param {string | null} targetDate 指定日（YYYY-MM-DD）
 * @param {string} season シーズン年文字列
 */
export async function calculateStandings(teams, gamesStream, targetDate = null, season = "2026") {
  let teamStoreMap = new Map(
    teams.map(({ teamName, league }) => [
      teamName,
      createInitialTeamStore(teamName, league)
    ])
  );

  for await (const event of generateTeamGameEvents(gamesStream, targetDate)) {
    const currentTeam = teamStoreMap.get(event.target);
    if (currentTeam) {
      teamStoreMap.set(event.target, updateTeamState(currentTeam, event));
    }
  }

  const processedTeams = Array.from(teamStoreMap.values()).map(finalizeTeamRecord);

  const cl = calculateLeagueStandings(processedTeams.filter(o => o.league === "Central"));
  const pl = calculateLeagueStandings(processedTeams.filter(o => o.league === "Pacific"));

  return {
    records: [
      {
        standingsType: "regular season",
        season: season,
        league: "Central League",
        lastUpdated: cl.map(o => o.lastUpdated).filter(Boolean).sort().at(-1) ?? "",
        teamRecords: cl,
      },
      {
        standingsType: "regular season",
        season: season,
        league: "Pacific League",
        lastUpdated: pl.map(o => o.lastUpdated).filter(Boolean).sort().at(-1) ?? "",
        teamRecords: pl,
      }
    ]
  };
}