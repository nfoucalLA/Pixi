import { describe, expect, test } from "vitest";

import boulderDash01 from "../../../assets/BoulderDash01.bd?raw";
import { CellType } from "../CellType";
import { BDCFFParser } from "./BDCFF_Parser";
import { createLevelDefinitions } from "./levelFactory";

describe("createLevelDefinitions (BoulderDash01.bd)", () => {
	const game = new BDCFFParser().parse(boulderDash01);
	const levels = createLevelDefinitions(game);

	test("creates one level per cave with a grid matching its size", () => {
		// Assert
		expect(levels).toHaveLength(game.caves.length);

		for (const level of levels) {
			expect(level.map, level.title).toHaveLength(level.heightInTiles);

			for (const row of level.map) {
				expect(row, level.title).toHaveLength(level.widthInTiles);
			}
		}
	});

	test("places the spawn and the exit of the first cave", () => {
		// Arrange
		const [first] = levels;

		// Assert
		expect(first.playerStart).toEqual({ column: 3, row: 2 });
		expect(first.map[2][3]).toBe(CellType.RockfordSpawn);
		expect(first.map[16][38]).toBe(CellType.Exit);
		expect(first.diamondsRequired).toBe(12);
		expect(first.timeLimit).toBe(150);
	});

	test("surrounds object-coded caves with a wall border", () => {
		// Arrange
		const [first] = levels;

		// Assert
		expect(first.map[0].every((cell) => cell === CellType.Wall)).toBe(true);
		expect(first.map.every((row) => row[0] === CellType.Wall && row[row.length - 1] === CellType.Wall)).toBe(true);
	});

	test("has exactly one spawn per level", () => {
		for (const level of levels) {
			expect(
				level.map.flat().filter((cell) => cell === CellType.RockfordSpawn),
				level.title,
			).toHaveLength(1);
		}
	});
});
