import { describe, expect, test } from "vitest";

import arnoDash01 from "../../../assets/ArnoDash01.bd?raw";
import boulderDash01 from "../../../assets/BoulderDash01.bd?raw";
import boulderDash01NoOne from "../../../assets/BoulderDash01_NoOne16BD.bd?raw";
import boulderDash02 from "../../../assets/BoulderDash02.bd?raw";
import boulderDash02Super from "../../../assets/BoulderDash02_SuperBD.bd?raw";
import { BDCFFParser } from "./BDCFFParser";

const parser = new BDCFFParser();

describe("BdcffParser (inline)", () => {
	test("parses game properties", () => {
		// Arrange
		const input = `
[BDCFF]
[game]
Name=My Game
Date=1984
Author=Someone
WWW=http://example.com/?a=b
Charset=Original
Fontset=Original, BD2
[/game]
`;

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.name).toBe("My Game");
		expect(game.date).toBe("1984");
		expect(game.author).toBe("Someone");
		expect(game.website).toBe("http://example.com/?a=b");
		expect(game.charset).toBe("Original");
		expect(game.fontset).toBe("Original, BD2");
		expect(game.caves).toEqual([]);
	});

	test("ignores comments, blank lines and CRLF line endings", () => {
		// Arrange
		const input = "; comment\r\n\r\n[game]\r\n; other\r\nName=CRLF\r\n[/game]\r\n";

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.name).toBe("CRLF");
	});

	test("parses cave properties", () => {
		// Arrange
		const input = `
[game]
Name=G
[cave]
Name=Cave A
Description=Desc
Remark=Rem
Intermission=True
DiamondValue=10 15
DiamondsRequired=12 12 12 12 12
CaveTime=150 110 70 40 30
Colors=Orange Gray1 White
RandSeed=10 11 12 13 14
RandomFill=SPACE 60 BOULDER 50 DIAMOND 9
AmoebaTime=999
MagicWallTime=25
[/cave]
`;

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.caves).toHaveLength(1);
		expect(game.caves[0]).toEqual({
			name: "Cave A",
			description: "Desc",
			remark: "Rem",
			intermission: true,
			size: { width: 20, height: 12 },
			diamondValues: [10, 15],
			diamondsRequired: [12, 12, 12, 12, 12],
			caveTimes: [150, 110, 70, 40, 30],
			colors: ["Orange", "Gray1", "White"],
			randomSeeds: [10, 11, 12, 13, 14],
			randomFill: [
				{ element: "SPACE", probability: 60 },
				{ element: "BOULDER", probability: 50 },
				{ element: "DIAMOND", probability: 9 },
			],
			amoebaTime: 999,
			magicWallTime: 25,
			objects: [],
		});
	});

	test("defaults intermission to false", () => {
		// Arrange
		const input = "[cave]\nName=A\nIntermission=False\n[/cave]";

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.caves[0].intermission).toBe(false);
	});

	test("parses every object type", () => {
		// Arrange
		const input = `
[cave]
Name=A
[objects]
Point=3 2 INBOX
Line=1 7 30 7 WALL
Rectangle=1 2 3 4 STEELWALL
FillRect=21 1 32 16 STEELWALL DIRT
[/objects]
[/cave]
`;

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.caves[0].objects).toEqual([
			{ type: "Point", x: 3, y: 2, element: "INBOX" },
			{ type: "Line", x1: 1, y1: 7, x2: 30, y2: 7, element: "WALL" },
			{
				type: "Rectangle",
				x1: 1,
				y1: 2,
				x2: 3,
				y2: 4,
				element: "STEELWALL",
			},
			{
				type: "FillRect",
				x1: 21,
				y1: 1,
				x2: 32,
				y2: 16,
				borderElement: "STEELWALL",
				fillElement: "DIRT",
			},
		]);
	});

	test("skips unsupported object kinds", () => {
		// Arrange
		const input = `
[cave]
Name=A
[objects]
Raster=16 17 4 1 6 1 FIREFLYr
Point=1 1 DIRT
[/objects]
[/cave]
`;

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.caves[0].objects).toEqual([{ type: "Point", x: 1, y: 1, element: "DIRT" }]);
	});

	test("ignores [demo] content and keeps cave properties separate", () => {
		// Arrange
		const input = `
[cave]
Name=A
[demo]
.30 u1 r7
[/demo]
[/cave]
[cave]
Name=B
[/cave]
`;

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.caves.map((c) => c.name)).toEqual(["A", "B"]);
	});

	test("does not attach objects to the wrong cave", () => {
		// Arrange
		const input = `
[cave]
Name=A
[objects]
Point=1 1 DIRT
[/objects]
[/cave]
[cave]
Name=B
[objects]
Point=2 2 WALL
[/objects]
[/cave]
`;

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.caves[0].objects).toHaveLength(1);
		expect(game.caves[1].objects).toHaveLength(1);
		expect(game.caves[1].objects[0]).toMatchObject({ x: 2, element: "WALL" });
	});

	test("returns an empty game for empty input", () => {
		// Arrange
		const input = "";

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.name).toBe("");
		expect(game.caves).toEqual([]);
	});

	test("parses the BDCFF version and extended game attributes", () => {
		// Arrange
		const input = `
[BDCFF]
Version=0.32
[game]
Name=G
Description=A game
Difficulty=Hard
Lives=5
BonusLife=1000
Levels=3
CaveSize=30 20
IntermissionSize=10 8
[/game]
[/BDCFF]
`;

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game).toMatchObject({
			version: "0.32",
			name: "G",
			description: "A game",
			difficulty: "Hard",
			lives: 5,
			bonusLife: 1000,
			levels: 3,
			caveSize: { width: 30, height: 20 },
			intermissionSize: { width: 10, height: 8 },
		});
	});

	test("parses extended cave attributes", () => {
		// Arrange
		const input = `
[cave]
Name=A
Date=2002-10-31
Author=Me
Difficulty=Easy
Size=6 5
InitialFill=SPACE
CaveDelay=8
AmoebaGrowthProb=0.03 0.25
AmoebaThreshold=0.227
SlimePermeability=0.5
HatchingDelay=2
[/cave]
`;

		// Act
		const [cave] = parser.parse(input).caves;

		// Assert
		expect(cave).toMatchObject({
			date: "2002-10-31",
			author: "Me",
			difficulty: "Easy",
			size: { width: 6, height: 5 },
			initialFill: "SPACE",
			caveDelay: 8,
			amoebaGrowthProbabilities: [0.03, 0.25],
			amoebaThreshold: 0.227,
			slimePermeability: 0.5,
			hatchingDelay: 2,
		});
	});

	test("resolves cave size from game defaults, then format defaults", () => {
		// Arrange
		const withDefaults =
			"[game]\nCaveSize=30 20\nIntermissionSize=10 8\n[cave]\nName=A\n[/cave]\n[cave]\nName=B\nIntermission=true\n[/cave]\n[cave]\nName=C\nSize=3 4\n[/cave]\n[/game]";
		const withoutDefaults = "[cave]\nName=A\n[/cave]\n[cave]\nName=B\nIntermission=true\n[/cave]";

		// Act
		const a = parser.parse(withDefaults).caves.map((c) => c.size);
		const b = parser.parse(withoutDefaults).caves.map((c) => c.size);

		// Assert
		expect(a).toEqual([
			{ width: 30, height: 20 },
			{ width: 10, height: 8 },
			{ width: 3, height: 4 },
		]);
		expect(b).toEqual([
			{ width: 40, height: 22 },
			{ width: 20, height: 12 },
		]);
	});

	test("parses a map-coded cave and preserves whitespace in rows", () => {
		// Arrange
		const input = [
			"[cave]",
			"Name=Mapped",
			"Size=6 5",
			"[map]",
			"WWWWWW",
			"WXd..W",
			"W    W",
			"W   PW",
			"WWWWWW",
			"[/map]",
			"[/cave]",
		].join("\r\n");

		// Act
		const [cave] = parser.parse(input).caves;

		// Assert
		expect(cave.map).toEqual(["WWWWWW", "WXd..W", "W    W", "W   PW", "WWWWWW"]);
		expect(cave.objects).toEqual([]);
	});

	test("keeps rows that are made only of spaces or start with a space", () => {
		// Arrange
		const input = "[cave]\nName=A\n[map]\n   \n .W\n[/map]\n[/cave]";

		// Act
		const [cave] = parser.parse(input).caves;

		// Assert
		expect(cave.map).toEqual(["   ", " .W"]);
	});

	test("does not set a map on object-coded caves", () => {
		// Arrange
		const input = "[cave]\nName=A\n[objects]\nPoint=1 1 DIRT\n[/objects]\n[/cave]";

		// Act
		const [cave] = parser.parse(input).caves;

		// Assert
		expect(cave.map).toBeUndefined();
	});

	test("does not attach maps to the wrong cave", () => {
		// Arrange
		const input = "[cave]\nName=A\n[map]\nWW\n[/map]\n[/cave]\n[cave]\nName=B\n[map]\n..\n[/map]\n[/cave]";

		// Act
		const { caves } = parser.parse(input);

		// Assert
		expect(caves[0].map).toEqual(["WW"]);
		expect(caves[1].map).toEqual([".."]);
	});

	test("uses the default one-character map codes", () => {
		// Arrange
		const input = "[game]\nName=G\n[/game]";

		// Act
		const { mapCodes } = parser.parse(input);

		// Assert
		expect(mapCodes.length).toBe(1);
		expect(mapCodes.codes).toMatchObject({
			" ": "SPACE",
			".": "DIRT",
			W: "STEELWALL",
			w: "WALL",
			r: "BOULDER",
			d: "DIAMOND",
			P: "INBOX",
			X: "OUTBOX",
		});
	});

	test("parses [mapcodes] overrides, including a space code and inline comments", () => {
		// Arrange
		const input = `
[game]
[mapcodes]
Length=1	; The length of the map-codes
; a comment
#=WALL
 =DIRT
[/mapcodes]
[cave]
Name=A
[/cave]
[/game]
`;

		// Act
		const { mapCodes, caves } = parser.parse(input);

		// Assert
		expect(mapCodes.length).toBe(1);
		expect(mapCodes.codes["#"]).toBe("WALL");
		expect(mapCodes.codes[" "]).toBe("DIRT");
		expect(mapCodes.codes["."]).toBe("DIRT");
		expect(caves).toHaveLength(1);
	});

	test("does not apply one-character defaults when map codes are two characters long", () => {
		// Arrange
		const input = "[mapcodes]\nLength=2\n..=DIRT\nWs=STEELWALL\n[/mapcodes]";

		// Act
		const { mapCodes } = parser.parse(input);

		// Assert
		expect(mapCodes).toEqual({ length: 2, codes: { "..": "DIRT", Ws: "STEELWALL" } });
	});

	test("keeps game-level properties declared after a cave out of that cave", () => {
		// Arrange
		const input = "[game]\n[cave]\nName=A\n[/cave]\nLevels=7\n[/game]";

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.levels).toBe(7);
		expect(game.caves[0].name).toBe("A");
	});
});

const files = [
	{
		file: "BoulderDash01.bd",
		text: boulderDash01,
		name: "Boulder Dash",
		firstCave: "Cave A. Intro",
	},
	{
		file: "BoulderDash01_NoOne16BD.bd",
		text: boulderDash01NoOne,
		name: "Boulder Dash (version No One's 16 game BD)",
		firstCave: "Cave A",
	},
	{
		file: "BoulderDash02.bd",
		text: boulderDash02,
		name: "Boulder Dash II",
		firstCave: "Cave A",
	},
	{
		file: "BoulderDash02_SuperBD.bd",
		text: boulderDash02Super,
		name: "Boulder Dash II (from Super Boulder Dash)",
		firstCave: "Cave A",
	},
];

describe.each(files)("asset $file", ({ text, name, firstCave }) => {
	test("parses game header", () => {
		// Arrange
		const input = text;

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.name).toBe(name);
		expect(game.date).toBeTruthy();
		expect(game.author).toBeTruthy();
		expect(game.charset).toMatch(/^Original/);
	});

	test("contains the 20 caves of the original game", () => {
		// Arrange
		const input = text;

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.caves).toHaveLength(20);
		expect(game.caves[0].name).toBe(firstCave);
	});

	test("has 4 intermission caves", () => {
		// Arrange
		const input = text;

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game.caves.filter((c) => c.intermission)).toHaveLength(4);
	});

	test("gives every cave a name, per-level data and objects", () => {
		// Arrange
		const input = text;

		// Act
		const game = parser.parse(input);

		// Assert
		for (const cave of game.caves) {
			expect(cave.name, "name").not.toBe("");
			expect(cave.diamondsRequired, `${cave.name} diamondsRequired`).toHaveLength(5);
			expect(cave.caveTimes, `${cave.name} caveTimes`).toHaveLength(5);
			expect(cave.diamondValues.length, `${cave.name} diamondValues`).toBeGreaterThan(0);
			expect(cave.colors, `${cave.name} colors`).toHaveLength(3);
		}
	});

	test("never produces NaN numbers", () => {
		// Arrange
		const input = text;

		// Act
		const game = parser.parse(input);

		// Assert
		for (const cave of game.caves) {
			const numbers = [
				...cave.diamondValues,
				...cave.diamondsRequired,
				...cave.caveTimes,
				...(cave.randomSeeds ?? []),
				...(cave.randomFill ?? []).map((f) => f.probability),
				...(cave.amoebaTime === undefined ? [] : [cave.amoebaTime]),
				...(cave.magicWallTime === undefined ? [] : [cave.magicWallTime]),
			];

			for (const n of numbers) {
				expect(Number.isFinite(n), `${cave.name}: ${n}`).toBe(true);
			}
		}
	});

	test("produces well-formed objects", () => {
		// Arrange
		const input = text;

		// Act
		const game = parser.parse(input);

		// Assert
		for (const cave of game.caves) {
			for (const obj of cave.objects) {
				const values = Object.entries(obj).filter(([k]) => k !== "type");

				for (const [key, value] of values) {
					if (typeof value === "number") {
						expect(Number.isFinite(value), `${cave.name} ${obj.type}.${key}`).toBe(true);
					} else {
						expect(value, `${cave.name} ${obj.type}.${key}`).toMatch(/^[A-Za-z0-9_]+$/);
					}
				}
			}
		}
	});

	test("places exactly one INBOX and one OUTBOX in each non-intermission cave", () => {
		// Arrange
		const input = text;

		// Act
		const game = parser.parse(input);

		// Assert
		for (const cave of game.caves.filter((c) => !c.intermission)) {
			const points = cave.objects.filter((o) => o.type === "Point");

			expect(
				points.filter((o) => o.element === "INBOX"),
				`${cave.name} INBOX`,
			).toHaveLength(1);
			expect(
				points.filter((o) => o.element === "OUTBOX"),
				`${cave.name} OUTBOX`,
			).toHaveLength(1);
		}
	});
});

describe("asset specifics", () => {
	test("parses the first cave of BoulderDash01.bd", () => {
		// Arrange
		const input = boulderDash01;

		// Act
		const [cave] = parser.parse(input).caves;

		// Assert
		expect(cave).toMatchObject({
			name: "Cave A. Intro",
			description: "Pick up jewels and exit before time is up",
			intermission: false,
			diamondValues: [10, 15],
			diamondsRequired: [12, 12, 12, 12, 12],
			caveTimes: [150, 110, 70, 40, 30],
			colors: ["Orange", "Gray1", "White"],
			randomSeeds: [10, 11, 12, 13, 14],
			randomFill: [
				{ element: "SPACE", probability: 60 },
				{ element: "BOULDER", probability: 50 },
				{ element: "DIAMOND", probability: 9 },
			],
		});
		expect(cave.objects).toEqual([
			{ type: "Line", x1: 1, y1: 7, x2: 30, y2: 7, element: "WALL" },
			{ type: "Line", x1: 9, y1: 14, x2: 38, y2: 14, element: "WALL" },
			{ type: "Point", x: 3, y: 2, element: "INBOX" },
			{ type: "Point", x: 38, y: 16, element: "OUTBOX" },
		]);
	});

	test("tolerates trailing whitespace in RandomFill", () => {
		// Arrange
		const input = boulderDash01NoOne;

		// Act
		const [cave] = parser.parse(input).caves;

		// Assert
		expect(cave.randomFill).toHaveLength(3);
	});

	test("uses the border element as fill when FillRect has no fill element", () => {
		// Arrange
		const input = boulderDash02;

		// Act
		const [cave] = parser.parse(input).caves;

		// Assert
		expect(cave.magicWallTime).toBe(25);
		expect(cave.objects).toContainEqual({
			type: "FillRect",
			x1: 21,
			y1: 1,
			x2: 32,
			y2: 16,
			borderElement: "DIRT",
			fillElement: "DIRT",
		});
	});
});

describe("asset ArnoDash01.bd (map-coded)", () => {
	test("parses game header", () => {
		// Arrange
		const input = arnoDash01;

		// Act
		const game = parser.parse(input);

		// Assert
		expect(game).toMatchObject({
			name: "Arno Dash",
			author: "Arno Weber",
			charset: "Original",
			fontset: "Original",
			levels: 1,
		});
	});

	test("contains 20 caves of which 4 are intermissions", () => {
		// Arrange
		const input = arnoDash01;

		// Act
		const { caves } = parser.parse(input);

		// Assert
		expect(caves).toHaveLength(20);
		expect(caves.filter((c) => c.intermission)).toHaveLength(4);
		expect(caves[0].name).toBe("Cave 1");
	});

	test("parses the first cave attributes with single-value per-level lists", () => {
		// Arrange
		const input = arnoDash01;

		// Act
		const [cave] = parser.parse(input).caves;

		// Assert
		expect(cave).toMatchObject({
			name: "Cave 1",
			intermission: false,
			caveDelay: 8,
			caveTimes: [120],
			diamondsRequired: [18],
			diamondValues: [15, 20],
			colors: ["Black", "Black", "Gray1", "LightGreen", "Yellow"],
			size: { width: 40, height: 22 },
		});
		expect(cave.objects).toEqual([]);
	});

	test("parses cave-specific attributes", () => {
		// Arrange
		const input = arnoDash01;

		// Act
		const { caves } = parser.parse(input);

		// Assert
		expect(caves[1].magicWallTime).toBe(16);
		expect(caves[4]).toMatchObject({ name: "Cave 5", intermission: true, amoebaTime: 255 });
	});

	test("gives every cave a map whose rows match the cave size", () => {
		// Arrange
		const input = arnoDash01;

		// Act
		const { caves } = parser.parse(input);

		// Assert
		for (const cave of caves) {
			expect(cave.map, `${cave.name} map`).toBeDefined();
			expect(cave.map, `${cave.name} height`).toHaveLength(cave.size.height);

			for (const row of cave.map ?? []) {
				expect(row, `${cave.name} width`).toHaveLength(cave.size.width);
			}
		}
	});

	test("sizes regular caves 40x22 and intermissions 20x12 by default", () => {
		// Arrange
		const input = arnoDash01;

		// Act
		const { caves } = parser.parse(input);

		// Assert
		for (const cave of caves) {
			expect(cave.size, cave.name).toEqual(cave.intermission ? { width: 20, height: 12 } : { width: 40, height: 22 });
		}
	});

	test("preserves space cells inside map rows", () => {
		// Arrange
		const input = arnoDash01;

		// Act
		const [cave] = parser.parse(input).caves;

		// Assert
		expect(cave.map?.[1]).toBe("W..d...r.rdr.......... ..r. .......r..rW");
	});

	test("only uses known map codes and places one INBOX and one OUTBOX per cave", () => {
		// Arrange
		const input = arnoDash01;

		// Act
		const { caves, mapCodes } = parser.parse(input);

		// Assert
		for (const cave of caves) {
			const cells = (cave.map ?? []).join("");

			for (const char of new Set(cells)) {
				expect(mapCodes.codes[char], `${cave.name} code "${char}"`).toBeDefined();
			}

			expect(cells.split("P").length - 1, `${cave.name} INBOX`).toBe(1);
			expect(cells.split("X").length - 1, `${cave.name} OUTBOX`).toBe(1);
		}
	});

	test("never produces NaN numbers", () => {
		// Arrange
		const input = arnoDash01;

		// Act
		const { caves } = parser.parse(input);

		// Assert
		for (const cave of caves) {
			const numbers = [
				...cave.diamondValues,
				...cave.diamondsRequired,
				...cave.caveTimes,
				cave.caveDelay ?? 0,
				cave.size.width,
				cave.size.height,
			];

			for (const n of numbers) {
				expect(Number.isFinite(n), `${cave.name}: ${n}`).toBe(true);
			}
		}
	});
});
