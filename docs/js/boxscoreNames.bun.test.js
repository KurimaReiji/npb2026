import { expect, test } from "bun:test";
import { getBoxscoreNamesFromDB } from "./boxscoreNames.js";

test("与えられたNDJSONデータから、指定日付以下のデータのみが正しくオブジェクトに変換されるか", async () => {
  const may12 = await getBoxscoreNamesFromDB("2026-05-12");
  const may13 = await getBoxscoreNamesFromDB("2026-05-13");

  const BaystarsYamamotoYudai = {
    "id": "23125136",
    "boxscoreName": "Yamamoto",
    "until": "2026-05-12",
  }
  const HawksYamamotoYudai = {
    "id": "23125136",
    "boxscoreName": "Y.Yamamoto",
  }
  expect(may12["23125136"]).toEqual("Yamamoto");
  expect(may13["23125136"]).toEqual("Y.Yamamoto");

});
