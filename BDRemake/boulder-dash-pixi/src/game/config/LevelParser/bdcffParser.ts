export interface BDCFFSize {
	width: number;
	height: number;
}

export interface BDCFFMapCodes {
	/** Number of characters per map cell (1 or 2). */
	length: number;
	/** Map code -> element name. */
	codes: Record<string, string>;
}

export interface BDCFFGame {
	name: string;
	version?: string;
	date?: string;
	author?: string;
	website?: string;
	description?: string;
	difficulty?: string;

	charset?: string;
	fontset?: string;

	lives?: number;
	bonusLife?: number;
	levels?: number;

	/** Default size of regular caves. */
	caveSize?: BDCFFSize;
	/** Default size of intermission caves. */
	intermissionSize?: BDCFFSize;

	mapCodes: BDCFFMapCodes;

	caves: BDCFFCave[];
}

export interface BDCFFCave {
	name: string;

	date?: string;
	author?: string;
	difficulty?: string;

	description?: string;
	remark?: string;

	intermission: boolean;

	/** Resolved from `Size`, then the game defaults, then the format defaults. */
	size: BDCFFSize;

	diamondValues: number[];
	diamondsRequired: number[];
	caveTimes: number[];
	caveDelay?: number;

	colors?: string[];

	initialFill?: string;

	randomSeeds?: number[];

	randomFill?: RandomFillEntry[];

	amoebaTime?: number;
	amoebaGrowthProbabilities?: number[];
	amoebaThreshold?: number;
	magicWallTime?: number;
	slimePermeability?: number;
	hatchingDelay?: number;

	/** Object-coded caves only. */
	objects: CaveObject[];

	/** Map-coded caves only: raw rows, whitespace preserved. */
	map?: string[];
}

export interface RandomFillEntry {
	element: string;
	probability: number;
}

export type CaveObject = PointObject | LineObject | RectangleObject | FillRectObject;

export interface PointObject {
	type: "Point";
	x: number;
	y: number;
	element: string;
}

export interface LineObject {
	type: "Line";
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	element: string;
}

export interface RectangleObject {
	type: "Rectangle";
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	element: string;
}

export interface FillRectObject {
	type: "FillRect";
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	borderElement: string;
	fillElement: string;
}

export const DEFAULT_CAVE_SIZE: Readonly<BDCFFSize> = { width: 40, height: 22 };
export const DEFAULT_INTERMISSION_SIZE: Readonly<BDCFFSize> = { width: 20, height: 12 };

/** Default one-character map codes. */
export const DEFAULT_MAP_CODES: Readonly<Record<string, string>> = {
	" ": "SPACE",
	".": "DIRT",
	w: "WALL",
	M: "MAGICWALL",
	X: "OUTBOX",
	H: "HIDDENOUTBOX",
	W: "STEELWALL",
	Q: "FIREFLYl",
	o: "FIREFLYu",
	O: "FIREFLYr",
	q: "FIREFLYd",
	r: "BOULDER",
	d: "DIAMOND",
	P: "INBOX",
	x: "HEXPANDINGWALL",
	v: "VEXPANDINGWALL",
	V: "EXPANDINGWALL",
	c: "BUTTERFLYd",
	C: "BUTTERFLYl",
	b: "BUTTERFLYu",
	B: "BUTTERFLYr",
	a: "AMOEBA",
	s: "SLIME",
};

type Section = "" | "bdcff" | "game" | "mapcodes" | "cave" | "demo" | "objects" | "map";

const TAG_PATTERN = /^\[(\/?)([A-Za-z]+)\]$/;

function splitKeyValue(line: string): [string, string] {
	const index = line.indexOf("=");

	return [line.substring(0, index), line.substring(index + 1)];
}

function parseNumbers(value: string): number[] {
	return value.split(/\s+/).map(Number);
}

function parseSize(value: string): BDCFFSize {
	const [width, height] = parseNumbers(value);

	return { width, height };
}

function parseRandomFill(value: string): RandomFillEntry[] {
	const tokens = value.split(/\s+/);

	const result: RandomFillEntry[] = [];

	for (let i = 0; i < tokens.length; i += 2) {
		result.push({
			element: tokens[i],
			probability: Number(tokens[i + 1]),
		});
	}

	return result;
}

export class BDCFFParser {
	parse(text: string): BDCFFGame {
		const game: BDCFFGame = {
			name: "",
			mapCodes: { length: 1, codes: {} },
			caves: [],
		};

		let currentCave: BDCFFCave | undefined;
		let section: Section = "";

		for (const rawLine of text.split(/\r?\n/)) {
			const line = rawLine.trim();

			const tag = TAG_PATTERN.exec(line);

			if (tag) {
				const tagName = tag[2].toLowerCase();

				if (tag[1]) {
					section = this.sectionAfterClosing(tagName, section);

					if (tagName === "cave") {
						currentCave = undefined;
					}
				} else {
					section = this.sectionAfterOpening(tagName, section, currentCave);

					if (tagName === "cave") {
						currentCave = this.createCave();
						game.caves.push(currentCave);
					}
				}

				continue;
			}

			// Map rows and map codes can legitimately start or end with a space (SPACE element).
			if (section === "map" && currentCave) {
				if (rawLine !== "" && !rawLine.startsWith(";")) {
					currentCave.map ??= [];
					currentCave.map.push(rawLine);
				}

				continue;
			}

			if (section === "mapcodes") {
				this.parseMapCode(game, rawLine);
				continue;
			}

			if (line === "" || line.startsWith(";")) {
				continue;
			}

			if (section === "bdcff") {
				this.parseHeaderProperty(game, line);
			} else if (section === "game") {
				this.parseGameProperty(game, line);
			} else if (section === "cave" && currentCave) {
				this.parseCaveProperty(currentCave, line);
			} else if (section === "objects" && currentCave) {
				const obj = this.parseObject(line);

				if (obj) {
					currentCave.objects.push(obj);
				}
			}
		}

		this.finalize(game);

		return game;
	}

	private createCave(): BDCFFCave {
		return {
			name: "",
			intermission: false,
			// Placeholder, resolved in finalize() unless the cave declares its own Size.
			size: { width: 0, height: 0 },
			diamondValues: [],
			diamondsRequired: [],
			caveTimes: [],
			objects: [],
		};
	}

	private sectionAfterOpening(tagName: string, current: Section, cave: BDCFFCave | undefined): Section {
		switch (tagName) {
			case "bdcff":
			case "game":
			case "mapcodes":
			case "cave":
				return tagName;

			case "demo":
			case "objects":
			case "map":
				return cave ? tagName : current;

			default:
				return current;
		}
	}

	private sectionAfterClosing(tagName: string, current: Section): Section {
		switch (tagName) {
			case "bdcff":
			case "game":
				return "";

			case "mapcodes":
			case "cave":
				return "game";

			case "demo":
			case "objects":
			case "map":
				return "cave";

			default:
				return current;
		}
	}

	private finalize(game: BDCFFGame): void {
		const { length, codes } = game.mapCodes;

		game.mapCodes = {
			length,
			codes: length === 1 ? { ...DEFAULT_MAP_CODES, ...codes } : codes,
		};

		for (const cave of game.caves) {
			if (cave.size.width === 0 && cave.size.height === 0) {
				const fallback = cave.intermission ? (game.intermissionSize ?? DEFAULT_INTERMISSION_SIZE) : (game.caveSize ?? DEFAULT_CAVE_SIZE);

				cave.size = { ...fallback };
			}
		}
	}

	private parseHeaderProperty(game: BDCFFGame, line: string): void {
		const [key, value] = splitKeyValue(line);

		if (key === "Version") {
			game.version = value;
		}
	}

	private parseMapCode(game: BDCFFGame, rawLine: string): void {
		if (rawLine.trim() === "" || rawLine.startsWith(";")) {
			return;
		}

		const index = rawLine.indexOf("=");

		if (index < 0) {
			return;
		}

		const key = rawLine.substring(0, index);
		const value = rawLine
			.substring(index + 1)
			.replace(/\s*;.*$/, "")
			.trim();

		if (key.trim() === "Length") {
			game.mapCodes.length = Number.parseInt(value, 10);
		} else {
			game.mapCodes.codes[key] = value;
		}
	}

	private parseGameProperty(game: BDCFFGame, line: string): void {
		const [key, value] = splitKeyValue(line);

		switch (key) {
			case "Name":
				game.name = value;
				break;

			case "Date":
				game.date = value;
				break;

			case "Author":
				game.author = value;
				break;

			case "WWW":
				game.website = value;
				break;

			case "Description":
				game.description = value;
				break;

			case "Difficulty":
				game.difficulty = value;
				break;

			case "Charset":
				game.charset = value;
				break;

			case "Fontset":
				game.fontset = value;
				break;

			case "Lives":
				game.lives = Number(value);
				break;

			case "BonusLife":
				game.bonusLife = Number(value);
				break;

			case "Levels":
				game.levels = Number(value);
				break;

			case "CaveSize":
				game.caveSize = parseSize(value);
				break;

			case "IntermissionSize":
				game.intermissionSize = parseSize(value);
				break;
		}
	}

	private parseCaveProperty(cave: BDCFFCave, line: string): void {
		const [key, value] = splitKeyValue(line);

		switch (key) {
			case "Name":
				cave.name = value;
				break;

			case "Date":
				cave.date = value;
				break;

			case "Author":
				cave.author = value;
				break;

			case "Difficulty":
				cave.difficulty = value;
				break;

			case "Description":
				cave.description = value;
				break;

			case "Remark":
				cave.remark = value;
				break;

			case "Intermission":
				cave.intermission = value.toLowerCase() === "true";
				break;

			case "Size":
				cave.size = parseSize(value);
				break;

			case "DiamondValue":
				cave.diamondValues = parseNumbers(value);
				break;

			case "DiamondsRequired":
				cave.diamondsRequired = parseNumbers(value);
				break;

			case "CaveTime":
				cave.caveTimes = parseNumbers(value);
				break;

			case "CaveDelay":
				cave.caveDelay = Number(value);
				break;

			case "Colors":
				cave.colors = value.split(/\s+/);
				break;

			case "InitialFill":
				cave.initialFill = value;
				break;

			case "RandSeed":
				cave.randomSeeds = parseNumbers(value);
				break;

			case "RandomFill":
				cave.randomFill = parseRandomFill(value);
				break;

			case "AmoebaTime":
				cave.amoebaTime = Number(value);
				break;

			case "AmoebaGrowthProb":
				cave.amoebaGrowthProbabilities = parseNumbers(value);
				break;

			case "AmoebaThreshold":
				cave.amoebaThreshold = Number(value);
				break;

			case "MagicWallTime":
				cave.magicWallTime = Number(value);
				break;

			case "SlimePermeability":
				cave.slimePermeability = Number(value);
				break;

			case "HatchingDelay":
				cave.hatchingDelay = Number(value);
				break;
		}
	}

	private parseObject(line: string): CaveObject | null {
		const [kind, data] = splitKeyValue(line);

		const p = data.split(/\s+/);

		switch (kind) {
			case "Point":
				return {
					type: "Point",
					x: Number(p[0]),
					y: Number(p[1]),
					element: p[2],
				};

			case "Line":
				return {
					type: "Line",
					x1: Number(p[0]),
					y1: Number(p[1]),
					x2: Number(p[2]),
					y2: Number(p[3]),
					element: p[4],
				};

			case "Rectangle":
				return {
					type: "Rectangle",
					x1: Number(p[0]),
					y1: Number(p[1]),
					x2: Number(p[2]),
					y2: Number(p[3]),
					element: p[4],
				};

			case "FillRect":
				return {
					type: "FillRect",
					x1: Number(p[0]),
					y1: Number(p[1]),
					x2: Number(p[2]),
					y2: Number(p[3]),
					borderElement: p[4],
					fillElement: p[5] ?? p[4],
				};

			default:
				return null;
		}
	}
}
