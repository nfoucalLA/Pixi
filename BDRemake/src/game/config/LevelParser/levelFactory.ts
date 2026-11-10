import type { LevelDefinition } from "../../types";
import { CellType } from "../CellType";
import type { BDCFFCave, BDCFFGame } from "./BDCFF_Parser";
import { buildCaveMap } from "./caveMap";

const TILE_SIZE = 32;

/** Element names are matched ignoring case and underscores, like in caveMap. */
function toCellType(element: string): CellType {
	const name = element.replace(/_/g, "").toLowerCase();

	if (name.startsWith("firefly")) {
		return CellType.Firefly;
	}

	if (name.startsWith("butterfly")) {
		return CellType.Butterfly;
	}

	switch (name) {
		case "space":
			return CellType.Space;

		case "dirt":
			return CellType.Dirt;

		// No distinct steel wall or expanding wall cell type yet.
		case "wall":
		case "steelwall":
		case "expandingwall":
		case "hexpandingwall":
		case "vexpandingwall":
			return CellType.Wall;

		case "magicwall":
			return CellType.MagicWall;

		case "boulder":
			return CellType.Boulder;

		case "diamond":
			return CellType.Diamond;

		case "inbox":
			return CellType.RockfordSpawn;

		case "outbox":
		case "hiddenoutbox":
			return CellType.Exit;

		case "amoeba":
			return CellType.Amoeba;

		default:
			throw new Error(`No CellType defined for BDCFF element "${element}"`);
	}
}

function decodeRow(row: string, game: BDCFFGame): CellType[] {
	const { length, codes } = game.mapCodes;
	const cells: CellType[] = [];

	for (let i = 0; i < row.length; i += length) {
		const code = row.substring(i, i + length);
		const element = codes[code];

		if (element === undefined) {
			throw new Error(`Unknown map code "${code}"`);
		}

		cells.push(toCellType(element));
	}

	return cells;
}

/** Object-coded caves leave the outer ring to the engine, which draws it as steel wall. */
function addSteelBorder(map: CellType[][]): void {
	const lastRow = map.length - 1;

	for (let y = 0; y <= lastRow; y++) {
		const lastColumn = map[y].length - 1;

		for (let x = 0; x <= lastColumn; x++) {
			if (y === 0 || y === lastRow || x === 0 || x === lastColumn) {
				map[y][x] = CellType.Wall;
			}
		}
	}
}

function findPlayerStart(map: CellType[][], title: string): LevelDefinition["playerStart"] {
	for (let row = 0; row < map.length; row++) {
		const column = map[row].indexOf(CellType.RockfordSpawn);

		if (column >= 0) {
			return { column, row };
		}
	}

	throw new Error(`Cave "${title}" has no INBOX`);
}

function pickForLevel(values: number[], level: number, fallback: number): number {
	return values[level - 1] ?? values[values.length - 1] ?? fallback;
}

/** Converts a BDCFF cave to a LevelDefinition for the given 1-based difficulty level. */
export function createLevelDefinition(cave: BDCFFCave, game: BDCFFGame, index: number, level = 1): LevelDefinition {
	const rows = buildCaveMap(cave, game.mapCodes, level);
	const map = rows.map((row) => decodeRow(row, game));

	if (cave.coding === "objects") {
		addSteelBorder(map);
	}

	return {
		id: `level-${String(index + 1).padStart(2, "0")}`,
		title: cave.name,
		widthInTiles: cave.size.width,
		heightInTiles: cave.size.height,
		tileSize: TILE_SIZE,
		map,
		playerStart: findPlayerStart(map, cave.name),
		diamondsRequired: pickForLevel(cave.diamondsRequired, level, 0),
		timeLimit: pickForLevel(cave.caveTimes, level, 0),
	};
}

export function createLevelDefinitions(game: BDCFFGame, level = 1): LevelDefinition[] {
	return game.caves.map((cave, index) => createLevelDefinition(cave, game, index, level));
}
