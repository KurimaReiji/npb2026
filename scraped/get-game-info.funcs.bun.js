export function anchorToPlayer({ href, text }) {
  const id = href.match(/\d{5,}/).at(0);
  if (!id) return '';
  return {
    id,
    jaBoxscoreName: text.trim(),
  }
}

export async function scrapeTop(res) {
  const data = {};

  const rewriter = new HTMLRewriter()
    .on('.game_tit time', {
      element(el) { data.date = { text: '' }; },
      text({ text }) { data.date.text += text; }
    })
    .on('.game_tit .place', {
      element(el) { data.place = { text: '' }; },
      text({ text }) { data.place.text += text; }
    })
    .on('.game_tit h3', {
      element(el) { data.title = { text: '' }; },
      text({ text }) { data.title.text += text.replace(/\s+/g, ' '); }
    })
    .on('.game_info', {
      element(el) { data.gameInfo = { text: '' }; },
      text({ text }) { data.gameInfo.text += text.replace(/\s+/g, ' '); }
    })
    .on('tr.top', {
      element(el) { data.away = []; }
    })
    .on('tr.bottom', {
      element(el) { data.home = []; }
    })
    .on('tr.top th', {
      element(el) { data.away.push({ text: '' }); },
      text({ text }) { data.away.at(-1).text += `${text.trim()} `; }
    })
    .on('tr.top td', {
      element(el) { data.away.push({ text: '' }); },
      text({ text }) { data.away.at(-1).text += text.trim(); }
    })
    .on('tr.bottom th', {
      element(el) { data.home.push({ text: '' }); },
      text({ text }) { data.home.at(-1).text += `${text.trim()} `; }
    })
    .on('tr.bottom td', {
      element(el) { data.home.push({ text: '' }); },
      text({ text }) { data.home.at(-1).text += text.trim(); }
    })
    .on('.referee_info', {
      element(el) { data.umpires = { text: '' }; },
      text({ text }) { data.umpires.text += text.trim(); }
    })
    .on('.game_result_info table:nth-of-type(1)', {
      element(el) { data.decisions = []; },
    })
    .on('.game_result_info table:nth-of-type(1) tr', {
      element(el) { data.decisions.push([]); },
    })
    .on('.game_result_info table:nth-of-type(1) th, .game_result_info table:nth-of-type(1) td', {
      element(el) { data.decisions.at(-1).push({ anchors: [], text: '' }); },
      text({ text }) { data.decisions.at(-1).at(-1).text += text.trim(); }
    })
    .on('.game_result_info table:nth-of-type(1) th a, .game_result_info table:nth-of-type(1) td a', {
      element(el) {
        data.decisions.at(-1).at(-1).anchors.push({ href: el.getAttribute('href'), text: '' });
      },
      text({ text }) { data.decisions.at(-1).at(-1).anchors.at(-1).text += text.trim(); }
    })

    .on('.game_result_info table:nth-of-type(2)', {
      element(el) { data.battery = []; },
    })
    .on('.game_result_info table:nth-of-type(2) tr', {
      element(el) { data.battery.push([]); },
    })
    .on('.game_result_info table:nth-of-type(2) th, .game_result_info table:nth-of-type(2) td', {
      element(el) { data.battery.at(-1).push({ anchors: [], text: '' }); },
      text({ text }) { data.battery.at(-1).at(-1).text += text; }
    })
    .on('.game_result_info table:nth-of-type(2) th a, .game_result_info table:nth-of-type(2) td a', {
      element(el) {
        data.battery.at(-1).at(-1).anchors.push({ href: el.getAttribute('href'), text: '' });
      },
      text({ text }) { data.battery.at(-1).at(-1).anchors.at(-1).text += text; }
    })

    .on('.game_result_info table:nth-of-type(3)', {
      element(el) { data.homeruns = []; },
    })
    .on('.game_result_info table:nth-of-type(3) tr', {
      element(el) { data.homeruns.push([]); },
    })
    .on('.game_result_info table:nth-of-type(3) th, .game_result_info table:nth-of-type(3) td', {
      element(el) { data.homeruns.at(-1).push({ anchors: [], text: '' }); },
      text({ text }) { data.homeruns.at(-1).at(-1).text += text; }
    })
    .on('.game_result_info table:nth-of-type(3) th a, .game_result_info table:nth-of-type(3) td a', {
      element(el) {
        data.homeruns.at(-1).at(-1).anchors.push({ href: el.getAttribute('href'), text: [] });
      },
      text({ text }) { data.homeruns.at(-1).at(-1).anchors.at(-1).text += text.trim(); }
    })

    .on('#player-order', {
      element(el) { data.order = {}; }
    })
    .on('.half_left', {
      element(el) { data.order.away = {}; },
    })
    .on('.half_right', {
      element(el) { data.order.home = {}; },
    })
    .on('.half_left h5', {
      element(el) { data.order.away.team = '' },
      text({ text }) { data.order.away.team += text; }
    })
    .on('.half_right h5', {
      element(el) { data.order.home.team = '' },
      text({ text }) { data.order.home.team += text; }
    })
    .on('.half_left table', {
      element(el) { data.order.away.rows = [] },
    })
    .on('.half_right table', {
      element(el) { data.order.home.rows = [] },
    })
    .on('.half_left tr', {
      element(el) { data.order.away.rows.push([]) },
    })
    .on('.half_right tr', {
      element(el) { data.order.home.rows.push([]) },
    })
    .on('.half_left th, .half_left td', {
      element(el) { data.order.away.rows.at(-1).push({ anchors: [], text: '' }); },
      text({ text }) { data.order.away.rows.at(-1).at(-1).text += text; }
    })
    .on('.half_right th, .half_right td', {
      element(el) { data.order.home.rows.at(-1).push({ anchors: [], text: '' }) },
      text({ text }) { data.order.home.rows.at(-1).at(-1).text += text; }
    })
    .on('.half_left td a', {
      element(el) {
        data.order.away.rows.at(-1).at(-1).anchors.push({ href: el.getAttribute('href'), text: '' });
      },
      text({ text }) { data.order.away.rows.at(-1).at(-1).anchors.at(-1).text += text; }
    })
    .on('.half_right td a', {
      element(el) {
        data.order.home.rows.at(-1).at(-1).anchors.push({ href: el.getAttribute('href'), text: '' });
      },
      text({ text }) { data.order.home.rows.at(-1).at(-1).anchors.at(-1).text += text; }
    })
    ;

  await rewriter.transform(res).arrayBuffer();

  return data;
}

export async function parseTop(raw) {
  const { date, place, title, gameInfo, umpires, } = raw;
  const { away, home } = raw;
  const { decisions, homeruns, battery } = raw;
  const { order } = raw;

  return {
    date: date.text,
    place: place.text,
    title: title.text.trim(),
    gameInfo: gameInfo.text.trim(),
    linescore: {
      away: away.map((col) => col.text.replace(/\s+/g, ' ').trim()),
      home: home.map((col) => col.text.replace(/\s+/g, ' ').trim()),
    },
    umpires: umpires.text.replace(/\s+/g, ''),
    decisions: decisions.map(refineRows),
    battery: battery.map(refineRows),
    homeruns: homeruns.map(refineRows),
    order: {
      away: {
        team: order.away.team,
        rows: order.away.rows.map(refineRows),
      },
      home: {
        team: order.home.team,
        rows: order.home.rows.map(refineRows),
      }
    }
  };

  function refineRows(row) {
    return row.map((col) => {
      const players = col.anchors.map(anchorToPlayer);
      if (players.length === 0) {
        return { text: col.text };
      } else {
        return {
          players,
          text: col.text,
        }
      }
    });
  }

  function parseTeamName(ary) {
    return ary
      .map((s) => s.replace(/\s+/g, ' '))
      .filter((s) => s.trim().length > 0)
      .at(0)
  }
}

export async function scrapePlays(res) {
  const data = {};

  const rewriter = new HTMLRewriter()
    .on('#progress', {
      element(el) {
        data.plays = [];
      },
    })
    .on('#progress h5', {
      element(el) {
        data.plays.push({ text: '' });
      },
      text({ text }) { data.plays.at(-1).text += text; }
    })
    .on('#progress tr', {
      element(el) {
        data.plays.push({ cols: [] });
      }
    })
    .on('#progress th', {
      element(el) { data.plays.at(-1).cols.push({ text: '' }) },
      text({ text }) { data.plays.at(-1).cols.at(-1).text += text; }
    })

    .on('#progress td', {
      element(el) { data.plays.at(-1).cols.push({ anchors: [], text: '' }) },
      text({ text }) { data.plays.at(-1).cols.at(-1).text += text; }
    })
    .on('#progress td a', {
      element(el) {
        data.plays.at(-1).cols.at(-1).anchors.push({ href: el.getAttribute('href'), text: '' });
      },
      text({ text }) { data.plays.at(-1).cols.at(-1).anchors.at(-1).text += text; }
    })
    ;

  await rewriter.transform(res).arrayBuffer();

  return data;
}

export async function parsePlays(raw) {
  const plays = [];

  for (const row of raw.plays) {
    if (row.cols) {
      row.cols = row.cols.map((col) => {
        if (col.anchors) {
          col.players = col.anchors.map(anchorToPlayer);
          if (col.players.length === 0) delete col.players;
          delete col.anchors;
        }
        return col;
      });
      plays.push([
        ...row.cols
      ]);
    } else {
      plays.push(row);
    }
  }

  return { plays };
}

export async function scrapeBoxscore(res) {
  const data = {};

  const rewriter = new HTMLRewriter()
    .on('#game_stats', {
      element(el) { data.teams = [], data.tables = [] },
    })
    .on('h4', {
      element(el) { data.teams.push({ team: '' }) },
      text({ text }) { data.teams.at(-1).team += text }
    })
    .on('.table_score', {
      element(el) { data.tables.push([]) },
    })
    .on('#tablefix_t_b tr, #tablefix_b_b tr', {
      element(el) { data.tables.at(-1).push([]) },
    })
    .on('#tablefix_t_b th, #tablefix_b_b th', {
      element(el) { data.tables.at(-1).at(-1).push({ text: '' }) },
      text({ text }) { data.tables.at(-1).at(-1).at(-1).text += text.trim() }
    })
    .on('#tablefix_t_b td, #tablefix_b_b td', {
      element(el) { data.tables.at(-1).at(-1).push({ anchors: [], text: '', cls: el.getAttribute('class') }) },
      text({ text }) { data.tables.at(-1).at(-1).at(-1).text += text.trim() }
    })
    .on('#tablefix_t_p>thead>tr, #tablefix_b_p>thead>tr', {
      element(el) { data.tables.at(-1).push([]) },
    })
    .on('#tablefix_t_p>thead>tr th, #tablefix_b_p>thead>tr th', {
      element(el) { data.tables.at(-1).at(-1).push({ text: '' }) },
      text({ text }) { data.tables.at(-1).at(-1).at(-1).text += text.trim() }
    })
    .on('#tablefix_t_p>tbody>tr, #tablefix_b_p>tbody>tr', {
      element(el) { data.tables.at(-1).push([]) },
    })
    .on('#tablefix_t_p>tbody>tr>td, #tablefix_b_p>tbody>tr>td', {
      element(el) { data.tables.at(-1).at(-1).push({ anchors: [], text: '' }) },
      text({ text }) { data.tables.at(-1).at(-1).at(-1).text += text.trim() }
    })
    .on('#tablefix_t_p>tfoot>tr, #tablefix_b_p>tfoot>tr', {
      element(el) { data.tables.at(-1).push([]) },
    })
    .on('#tablefix_t_p>tfoot>tr>th, #tablefix_b_p>tfoot>tr>th', {
      element(el) { data.tables.at(-1).at(-1).push({ text: '' }) },
      text({ text }) { data.tables.at(-1).at(-1).at(-1).text += text.trim() }
    })
    .on('.table_inning', {
      element(el) { data.tables.at(-1).at(-1).at(-1).chunks = []; },
    })
    .on('.table_inning th, .table_inning td', {
      text({ text }) {
        data.tables.at(-1).at(-1).at(-1).chunks.push(text.trim());
      }
    })
    .on('td a', {
      element(el) { data.tables.at(-1).at(-1).at(-1).anchors.push({ href: el.getAttribute('href'), text: '' }) },
      text({ text }) { data.tables.at(-1).at(-1).at(-1).anchors.at(-1).text += text }
    })
    ;

  await rewriter.transform(res).arrayBuffer();
  return data;
}

export async function parseBoxscore(raw) {
  const [tb, tp, bb, bp] = raw.tables;

  return {
    away: {
      team: raw.teams.at(0).team,
      batting: battingTable(tb),
      pitching: pitchingTable(tp),
    },
    home: {
      team: raw.teams.at(1).team,
      batting: battingTable(bb),
      pitching: pitchingTable(bp),
    }
  }

  function battingTable(trs) {
    const header = trs.at(0)
      .map((o, idx) => {
        if (idx === 0) return "打順";
        return o.text.trim();
      });

    const rows = trs.slice(1, -1)
      .map((row) => {
        return row
          .map((o, idx) => {
            if (idx === 0) return o.text.replace("&nbsp;", "");
            if (idx === 1) return o.text.replace("&nbsp;", "");
            if (idx === 2) {
              return anchorToPlayer(o.anchors.at(0));
            }
            if (idx > 2 && idx < 8) {
              return Number(o.text);
            } else if (idx > 7) {
              if (o.anchors.length === 0) delete o.anchors;
              if (!o.cls) delete o.cls;
              if (o.cls) {
                o.cls = o.cls.trim().split(" ");
              }
              return o;
            } else {
              return o;
            }
          })

      });

    const total = trs.at(-1)
      .map((o, idx) => {
        if (idx === 0) return o.text.replace("&nbsp;", "");
        if (idx === 1) return o.text.replace("&nbsp;", "");
        if (idx > 2 && idx < 8) {
          return Number(o.text)
        } else {
          return o.text.replace("&nbsp;", "");
        }
      });

    return [header, ...rows, total];
  }

  function pitchingTable(trs) {
    const header = trs.at(0)
      .map((o, idx) => {
        if (idx === 0) return "勝敗等";
        return o.text.trim();
      });

    const rows = trs.slice(1, -1)
      .map((row) => {
        return row
          .map((o, idx) => {
            if (idx === 0) return o.text.replace("&nbsp;", "");
            if (idx === 1) return anchorToPlayer(o.anchors.at(0));
            return Number(o.text);
          })

      });

    const total = trs.at(-1)
      .map((o, idx) => {
        if (idx === 0) return o.text.replace("&nbsp;", "");
        if (idx === 1) return o.text;
        return Number(o.text)
      });

    return [header, ...rows, total];
  }
}

export async function scrapeRoster(res) {
  const data = {};

  const rewriter = new HTMLRewriter()
    .on('.half_left', {
      element(el) { data.away = {}; },
    })
    .on('.half_right', {
      element(el) { data.home = {}; },
    })
    .on('.half_left h5', {
      element(el) { data.away.team = '' },
      text({ text }) { data.away.team += text }
    })
    .on('.half_right h5', {
      element(el) { data.home.team = '' },
      text({ text }) { data.home.team += text }
    })
    .on('.half_left table', {
      element(el) { data.away.rows = [] },
    })
    .on('.half_right table', {
      element(el) { data.home.rows = [] },
    })
    .on('.half_left tr', {
      element(el) { data.away.rows.push([]) },
    })
    .on('.half_right tr', {
      element(el) { data.home.rows.push([]) },
    })
    .on('.half_left th, .half_left td', {
      element(el) {
        data.away.rows.at(-1).push({ anchors: [], text: '' });
      },
      text({ text }) { data.away.rows.at(-1).at(-1).text += text }
    })
    .on('.half_right th, .half_right td', {
      element(el) {
        data.home.rows.at(-1).push({ anchors: [], text: '' });
      },
      text({ text }) { data.home.rows.at(-1).at(-1).text += text }
    })
    .on('.half_left td a', {
      element(el) {
        data.away.rows.at(-1).at(-1).anchors.push({ href: el.getAttribute('href'), text: '' });
      },
      text({ text }) { data.away.rows.at(-1).at(-1).anchors.at(-1).text += text }
    })
    .on('.half_right td a', {
      element(el) {
        data.home.rows.at(-1).at(-1).anchors.push({ href: el.getAttribute('href'), text: '' });
      },
      text({ text }) { data.home.rows.at(-1).at(-1).anchors.at(-1).text += text }
    })
    ;

  await rewriter.transform(res).arrayBuffer();
  return data;
}

export async function parseRoster(raw) {

  return {
    away: {
      team: raw.away.team,
      roster: raw.away.rows.reduce(roster, []),
    },
    home: {
      team: raw.home.team,
      roster: raw.home.rows.reduce(roster, []),
    }
  }

  function roster(a, c) {
    if (c.length === 1) {
      a.push({ position: c.at(0).text, players: [] });
    } else {
      a.at(-1).players.push(({
        id: c.at(1).anchors.at(0).href.match(/\d{5,}/).at(0),
        jaBoxscoreName: c.at(1).anchors.at(0).text,
        jerseyNumber: c.at(0).text,
        ...batThrow(c.at(2).text),
      }))
    }
    return a;
  }

  function batThrow(text) {
    const a = text.split(/投|打/);
    return {
      jaBatSide: a.at(1),
      jaPitchHand: a.at(0),
    }
  }
}

export async function scrapeGameLinks(res) {
  const data = {};

  const rewriter = new HTMLRewriter()
    .on('.summary_table', {
      element(el) { data.rows = []; },
    })
    .on('.summary_table tr', {
      element(el) { data.rows.push([{ id: el.getAttribute('id') }]); },
    })
    .on('.summary_table td:nth-of-type(1) a', {
      element(el) { data.rows.at(-1).at(-1).anchor = { href: el.getAttribute('href'), text: '' }; },
      text({ text }) { data.rows.at(-1).at(-1).anchor.text += text.replace(/\s+/g, ' ').trim(); }
    })
    .on('.summary_table .cancel', {
      element(el) { data.rows.at(-1).at(-1).cancel = '' },
      text({ text }) { data.rows.at(-1).at(-1).cancel += text }
    })
    .on('#header_score', {
      element(el) { data.today = []; },
    })
    .on('#header_score .score_wrap .score_box', {
      element(el) { data.today.push({ anchor: '' }); },
    })
    .on('#header_score .score_wrap .score_box a', {
      element(el) { data.today.at(-1).anchor = { href: el.getAttribute('href'), text: '' }; },
      text({ text }) { data.today.at(-1).anchor.text += text.replace(/\s+/g, ' ').trim(); }
    })
    ;
  await rewriter.transform(res).arrayBuffer();

  return data;
}

export async function parseGameLinks(raw) {
  const rows = raw.rows
    .flat()
    .filter((row) => row.anchor)
    .filter((row) => !row.cancel)
    .map((row) => row.anchor.href)
    .filter((href) => !href.includes("cl"))
    ;
  const today = (raw.today || [])
    .filter((o) => o.anchor.text?.includes("試合終了"))
    .map((o) => o.anchor.href)
    .filter((href) => !href.includes("cl"))
    ;
  if (rows.length !== today.length) {
    console.error(`Scheduled: ${rows.length || 0}, Finished: ${today.length}`);
  }
  return [rows, today].flat();
}

export async function extractTop(res) {
  const scraped = await scrapeTop(res);
  return await parseTop(scraped);
}

export async function extractPlays(res) {
  const scraped = await scrapePlays(res);
  return await parsePlays(scraped);
}

export async function extractBoxscore(res) {
  const scraped = await scrapeBoxscore(res);
  return await parseBoxscore(scraped);
}

export async function extractRoster(res) {
  const scraped = await scrapeRoster(res);
  return await parseRoster(scraped);
}

export async function extractGameLinks(res) {
  const scraped = await scrapeGameLinks(res);
  return await parseGameLinks(scraped);
}

export function to_uniq(acc, cur, idx, ary) {
  if (idx == ary.length - 1) acc = [...new Set(ary)];
  return acc;
};

export async function sleep(ms) { return new Promise(res => setTimeout(res, ms)) };
