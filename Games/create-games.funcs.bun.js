import { positionMapping } from './constants/positions.js';
import { boxscoreResults } from './constants/boxscore.js';

export function getBoxscore({ away, home }, boxscoreNames, boxscoreNamesDB) {
  function toStats({ batting, pitching }, boxscoreNames, boxscoreNamesDB) {
    const bStat = toBattingStat(batting)
      .map((o, i, ary) => {
        if (i === ary.length - 1) return o;
        o.person.boxscoreName = boxscoreNames?.batting[i] ?? boxscoreNamesDB[o.person?.id];
        return o;
      });
    const pStat = toPitchingStat(pitching)
      .map((o, i, ary) => {
        if (i === ary.length - 1) return o;
        o.person.boxscoreName = boxscoreNames?.pitching[i] ?? boxscoreNamesDB[o.person?.id];
        return o;
      });

    const batters = batting.slice(1, -1)
      .map((arr) => arr.at(2).id);
    const pitchers = pitching.slice(1, -1)
      .map((arr) => arr.at(1).id);
    const players = [...batters, ...pitchers].reduce(toUniq)
      .map((id) => {
        const bat = bStat.find((o) => o.person?.id === id) ?? {};
        const pit = pStat.find((o) => o.person?.id === id) ?? {};
        const player = bat?.person || pit.person;
        delete bat.person;
        delete pit.person;
        return {
          person: player,
          stats: {
            batting: bat,
            pitching: pit,
          },
        }
      });

    delete bStat.at(-1).results;
    delete bStat.at(-1).battingOrder;

    const results = players.map((p) => p.stats.batting.results || []).flat();
    const innings = results.map(({ inning }) => inning).sort().reduce(toUniq)
      .sort((a, b) => Number(a) - Number(b))
      .map((inning) => {
        const num = inning;
        const innResults = results.filter(({ inning }) => inning === num);

        return {
          num: inning,
          hits: innResults.filter(({ hits }) => hits).length,
          errors: innResults.filter(({ errors }) => errors).length,
          plateAppearances: innResults.length,
        }
      });

    return {
      innings,
      teamStats: {
        batting: bStat.at(-1),
        pitching: pStat.at(-1),
      },
      batters,
      pitchers,
      players,
    }
  }

  const obj = {
    away: toStats(away, boxscoreNames.away, boxscoreNamesDB),
    home: toStats(home, boxscoreNames.home, boxscoreNamesDB),
  }

  obj.away.innings.forEach((_, idx) => {
    const err = {
      away: obj.home.innings[idx]?.errors || 0,
      home: obj.away.innings[idx].errors,
    };
    obj.away.innings[idx].errors = err.away;
    if (obj.home.innings[idx]) {
      obj.home.innings[idx].errors = err.home;
    } else {
      obj.home.innings.push({ errors: err.home });
    }
  })
  if (obj.away.teamStats.pitching.stats.outs !== obj.away.innings.length * 3) {
    obj.away.innings.at(-1).outs = 3 - obj.away.innings.length * 3 + obj.away.teamStats.pitching.stats.outs;
  }
  if (obj.home.teamStats.pitching.stats.outs !== obj.home.innings.length * 3) {
    obj.home.innings.at(-1).outs = 3 - obj.home.innings.length * 3 + obj.home.teamStats.pitching.stats.outs;
    // in case completed early
  }
  return obj;

  function toBattingStat(batting) {
    // "battingOrder": "901", 先発は900、交代でインクリメント
    // "allPositions": [{"code": 12, "abbreviation": "PR"},{"code":4, "abbreviation": "2B"}] DH:10, PH:11
    const dic = [
      ['atBats', '打数'],
      ['runs', '得点'],
      ['hits', '安打'],
      ['rbi', '打点'],
      ['stolenBases', '盗塁'],
    ];
    const header = batting.at(0);
    const rows = batting.slice(1)
      .map((row) => {
        const person = row.at(2).id ? row.at(2) : undefined;
        const allPositions = row.at(1).replace(/[\)\(]/g, '').split("").map((pos) => {
          return positionMapping.find((obj) => obj.jaAbbreviation === pos);
        });
        const stats = dic.reduce((a, c) => {
          const [en, ja] = c;
          a[en] = row.at(header.findIndex((s) => s === ja));
          return a;
        }, {});

        const results = [];
        let inning;
        row.forEach((col, i) => {
          if (i < 8) return;
          if (col.text === '-') return;
          const m = header.at(i).match(/(\d+)/);
          inning = m ? Number(m.at(1)) : inning;
          const obj = {
            inning,
            jaText: col.text,
            hits: col.cls?.includes('hit') ? 1 : undefined,
            rbi: col.cls?.includes('rbi') ? ['', '①', '②', '③', '④'].indexOf(col.text.split("").at(-1)) : undefined,
            ...textToResult(col.text)
          }
          results.push(obj);
        })

        function textToResult(text) {
          if (!text || text === '-') return {};
          const item = text.replace(/[①②③④]/, '');
          if (boxscoreResults.hasOwnProperty(item)) {
            if (boxscoreResults[item].startsWith('x-')) return {};
            return { [boxscoreResults[item]]: 1 };
          }
          return {
            [`TBD${item}`]: 1
          }
        }

        Object.values(boxscoreResults).forEach((val) => {
          if (val.startsWith('x-')) return;
          stats[val] = results.filter((r) => r[val] === 1).length;
        });


        const data = { person, battingOrder: row.at(0), allPositions, stats, results }
        if (allPositions.length === 0) delete data.allPositions;
        return data;
      });
    rows.forEach((row, idx, arr) => {
      row.battingOrder = row.battingOrder !== "" ? `${row.battingOrder}00` : String(Number(arr[idx - 1].battingOrder) + 1);
    });
    return rows;
  }

  function toPitchingStat(pitching) {
    const dic = [
      ['pitchesThrown', '投球数'],
      ['battersFaced', '打者'],
      ['inningsPitched', '投球回'],
      ['hits', '安打'],
      ['homeRuns', '本塁打'],
      ['baseOnBalls', '四球'],
      ['hitByPitch', '死球'],
      ['strikeOuts', '三振'],
      ['wildPitches', '暴投'],
      ['balks', 'ボーク'],
      ['runs', '失点'],
      ['earnedRuns', '自責点'],
    ];
    const header = pitching.at(0);
    const rows = pitching.slice(1)
      .map((row) => {
        const person = row.at(1).id ? row.at(1) : undefined;
        const stats = dic.reduce((a, c) => {
          const [en, ja] = c;
          a[en] = row.at(header.findIndex((s) => s === ja));
          return a;
        }, {});
        stats.outs = ipToOuts(stats.inningsPitched);
        const decision = row.at(0);
        if (decision) {
          const mapping = {
            '○': () => stats.wins = 1,
            '●': () => stats.losses = 1,
            'H': () => stats.holds = 1,
            'S': () => stats.saves = 1,
          };
          mapping[decision]?.();   // 存在すれば実行
        }

        return { person, stats }
      });
    return rows;
  }
}

function ipToOuts(ip) {
  return String(ip).split(".").reduce((a, c, idx) => {
    if (idx === 0) return 3 * Number(c);
    return a + Number(c)
  }, 0)
}

export function toUniq(acc, cur, idx, ary) {
  if (idx == ary.length - 1) acc = [...new Set(ary)];
  return acc;
};

export function parseGameInfo(gameInfoStr) {
  const text = gameInfoStr.replace(/(\d)時間 /, "$1時間0分 ");
  const regex = /(?<jaStatus>【.+】)\s*◇開始\s*(?<startTime>[\d:]+)\s*◇終了\s*(?<endTime>[\d:]+)\s*◇試合時間\s*(?<duration>[^◇\s]+)\s*◇入場者\s*(?<attendanece>[\d,]+)人/;
  const match = text.match(regex);
  const { jaStatus, startTime, endTime, duration, attendanece } = match.groups;
  return {
    jaStatus,
    startTime,
    endTime,
    duration: duration.match(/(\d+)時間(\d+)分/).slice(1, 3).map((s) => s.padStart(2, "0")).join(":"),
    attendanece: Number(attendanece.replace(",", "")),
  }
}

function nxToNumber(str) {
  if (str.includes("x")) {
    if (str === "x") return 0;
    return Number(str.replace("x", ""));
  } else {
    return Number(str);
  }
}

function linescoreToInnings({ away, home }, box) {
  const runs = away.slice(1, -3)
    .flatMap((_, i) => {
      if (away.at(i + 1) === "") return [];
      return [{
        num: i + 1,
        home: { runs: nxToNumber(home.at(i + 1)) },
        away: { runs: nxToNumber(away.at(i + 1)) },
      }]
    })
    ;

  return runs
    .map(({ num, home, away }) => {
      const h = box.home.innings[num - 1] || {};
      const a = box.away.innings[num - 1] || {};

      return {
        num,
        home: {
          runs: home.runs,
          hits: h.hits ?? 0,
          errors: h.errors ?? 0,
          leftOnBase: h.plateAppearances ? h.plateAppearances - home.runs - (a.outs ?? 3) : 0,
        },
        away: {
          runs: away.runs,
          hits: a.hits ?? 0,
          errors: a.errors ?? 0,
          leftOnBase: a.plateAppearances - away.runs - (h.outs ?? 3)
        }
      };
    });
};

function linescoreToTeamStats({ away, home }) {
  const toStats = (arr) => {
    const [runs, hits, errors] = arr.slice(-3).map(nxToNumber);
    return { runs, hits, errors };
  };

  const teamStats = {
    home: toStats(home),
    away: toStats(away),
  };
  return teamStats;
};

export function getLinescore({ away, home }, box) {
  const innings = linescoreToInnings({ away, home }, box);
  const teams = linescoreToTeamStats({ away, home });
  teams.away.leftOnBase = addLeftOnBase(box.home);
  teams.home.leftOnBase = addLeftOnBase(box.away);
  // note: "One out when winning run scored."

  return {
    innings,
    teams,
  }

  function addLeftOnBase(obj) {
    const { battersFaced, runs, outs } = obj.teamStats.pitching.stats;
    return battersFaced - runs - outs;
  }
}

export function getHomeRuns(input) {
  const output = {};
  const people = {
    away: [
      input[0][1].players?.filter((_, i) => i % 2 === 0) || [],
      input[1][1].players?.filter((_, i) => i % 2 === 1) || []
    ].flat(),
    home: [
      input[0][1].players?.filter((_, i) => i % 2 === 1) || [],
      input[1][1].players?.filter((_, i) => i % 2 === 0) || []
    ].flat(),
  };
  ['away', 'home'].forEach((item, idx) => {
    const hrs = input[idx][1].text.split("、").flatMap((hr, i) => {
      if (hr === '') return [];
      const [bat, number, inning, rbi, pit] = hr.match(/(.*) (\d+)号（(\d+)回(.*) (.*)）/).slice(1);
      const batter = people[item].find((p) => p.jaBoxscoreName === bat);
      const pitcher = people[(item === 'away' ? 'home' : 'away')].find((p) => p.jaBoxscoreName === pit);
      return [{
        id: [batter.id, "2026", `${number}`.padStart(2, "0")].join("-"),
        inning: Number(inning),
        "halfInning": ["top", "bottom"][idx],
        rbi: ["", "ソロ", "2ラン", "3ラン", "満塁"].indexOf(rbi),
        number: Number(number),
        batter,
        pitcher,
      }]
    })
    output[item] = hrs;
  });
  return output;
}

export function getBatteries(input) {
  const output = {};
  ['away', 'home'].forEach((item, i) => {
    output[item] = { people: input[i][1].players, jaText: input[i][1].text }
  });
  return output;
}

export function getDecisions(input) {
  const output = {};
  input?.forEach((ary) => {
    const decision = ary[0].text;
    const player = ary[1].players[0];
    const text = ary[1].text;

    if (player) {
      const { id, jaBoxscoreName } = player;
      const recordMatch = text?.match(/（(.+?)）/);
      const record = recordMatch ? recordMatch[1] : "";
      if (decision.includes("勝投手")) {
        const [winsStr = "999", lossesStr = "999"] = record.replace("敗", "").split("勝");
        const wins = Number(winsStr);
        const losses = Number(lossesStr);
        output.winner = { person: { id, jaBoxscoreName }, wins, losses, jaText: text };
      } else if (decision.includes("敗投手")) {
        const [winsStr = "999", lossesStr = "999"] = record.replace("敗", "").split("勝");
        const wins = Number(winsStr);
        const losses = Number(lossesStr);
        output.loser = { person: { id, jaBoxscoreName }, wins, losses, jaText: text };
      } else if (decision.includes("セーブ")) {
        const savesMatch = record.match(/(\d+)セ/);
        const saves = savesMatch ? Number(savesMatch[1]) : 999;
        output.save = { person: { id, jaBoxscoreName }, saves, jaText: text };
      }
    }
  });

  return output;
}

export function getPlayers(boxscore, scraped) {
  function toStat({ players }, roster) {
    return roster
      .map((o) => {
        const person = players.find(({ person }) => person.id === o.id)?.person || {};
        return { ...o, ...person }
      })
      .map((o) => {
        const dic = {
          "右": "R",
          "左": "L",
          "両": "S"
        }
        return { ...o, ...{ batSide: dic[o.jaBatSide], pitchHand: dic[o.jaPitchHand] } }
      })
  }

  const roster = ['away', 'home']
    .map((t) => scraped[t].roster.map(({ position, players }) => players.map((player) => {
      return {
        jaPrimaryPosition: position,
        ...player,
      }
    })).flat()).reduce((a, c, i) => {
      if (i === 0) {
        a.away = c;
      } else {
        a.home = c;
      }
      return a;
    }, {})

  return {
    away: toStat(boxscore.away, roster.away),
    home: toStat(boxscore.home, roster.home),
  }
}

export function getBoxscoreNames(en) {
  function extract(ary) {
    if (!ary) return {};
    return ary.flatMap(([boxscoreName]) => boxscoreName.length ? [boxscoreName.trim().split(",")[0]] : []);
  }
  return {
    away: {
      batting: extract(en?.boxscore[0]),
      pitching: extract(en?.boxscore[2]),
    },
    home: {
      batting: extract(en?.boxscore[1]),
      pitching: extract(en?.boxscore[3]),
    }
  }
}

export function getPlays({ plays: inputs }, linescore) {
  const plays = [];
  let inning;
  let pitcher = { top: {}, bottom: {} };
  let pa = { top: 0, bottom: 0 }, runs = { top: 0, bottom: 0, away: 0, home: 0 };

  for (const row of inputs.slice(1)) {
    if (row.text) {
      inning = getInning(row.text);
      pa.inning = 0;
      runs.top = 0;
      runs.bottom = 0;
      runs.away = inning.halfInning === "bottom"
        ? linescore.innings.filter(({ num }) => num <= inning.inning).reduce((a, c) => a + c.away.runs, 0)
        : linescore.innings.filter(({ num }) => num < inning.inning).reduce((a, c) => a + c.away.runs, 0);

      runs.home = linescore.innings.filter(({ num }) => num < inning.inning).reduce((a, c) => a + c.home.runs, 0);
      // 得点が入って、走者アウトで攻撃終了の場合大丈夫？
      continue;
    }
    if (row.length === 1) {
      pitcher[inning.halfInning] = row.at(0).players.at(-1);
      continue;
    }

    const outs = Number(row.at(0).text.replace('アウト', ''));
    const RoB = getRoB(row.at(1).text) || row.at(1).text;
    const numRunners = RoB.replace(/-/g, '').length;
    const batter = row.at(2).players?.at(0);
    const isPinchHit = row.at(2).text.includes("代打") ? "Y" : undefined;
    const result = { jaText: row.at(4).text };
    const isRunnerEvent = row.at(4).players?.length > 0 ? "Y" : undefined;
    const runner = row.at(4).players?.at(0);

    runs[inning.halfInning] = pa.inning - outs - numRunners;

    if (batter && !result.jaText.includes("途中終了")) {
      pa[inning.halfInning] += 1;
      pa.inning += 1;
    }
    const rbi = result.jaText.includes("打点") ? Number(result.jaText.match(/打点([1234])/).at(1)) : undefined;
    const hits = /ヒット|ツーベース|スリーベース|ホームラン/.test(result.jaText) ? 1 : undefined;
    const errors = /エラー/.test(result.jaText) ? 1 : undefined;
    const isNoteEvent = result.jaText.includes("途中終了") ? "Y" : undefined;

    plays.push({
      inning,
      outs,
      runners: RoB,
      count: getCount(row.at(3).text),
      batter,
      pitcher: { ...pitcher[inning.halfInning] },
      result,
      isPinchHit,
      stats: { hits, errors, rbi },
      //paInning: pa.inning,
      plateAppearances: pa[inning.halfInning],
      runs: { top: runs.top, bottom: runs.bottom, away: runs.away + runs.top, home: runs.home + runs.bottom },
      isRunnerEvent,
      runner,
      isNoteEvent,
    });
  }
  return plays;

  function getRoB(text) {
    return {
      "満塁": "123",
      "": "---",
      "1塁": "1--",
      "2塁": "-2-",
      "3塁": "--3",
      "1・2塁": "12-",
      "1・3塁": "1-3",
      "2・3塁": "-23"
    }[text.replace('&nbsp;', '')];
  }
  /**
   * "3-2より" 形式のカウント文字列をオブジェクトに変換
   * @param {string} str
   */
  function getCount(str) {
    const m = str.match(/(?<b>\d)-(?<s>\d)より/);
    if (!m) return undefined;
    return {
      balls: Number(m.groups.b),
      strikes: Number(m.groups.s)
    };
  };

  function getInning(text) {
    const matched = text.match(/(?<inning>\d+)回(?<jaHalfInning>表|裏)/);
    const halfInning = { "表": "top", "裏": "bottom" }[matched.groups.jaHalfInning];
    return {
      inning: Number(matched.groups.inning),
      halfInning,
      text: text.trim(),
    }
  }
}
