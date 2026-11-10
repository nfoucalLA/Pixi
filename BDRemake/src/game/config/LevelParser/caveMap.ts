import type { BDCFFCave, BDCFFMapCodes, CaveObject } from "./BDCFF_Parser";

const DEFAULT_INITIAL_FILL = "DIRT";

/** Names are matched ignoring case and underscores (FIREFLYD, HEXPANDING_WALL in some files). */
function normalizeElement(name: string): string {
	return name.replace(/_/g, "").toLowerCase();
}

function createEncoder({ codes }: BDCFFMapCodes): (element: string) => string {
	const byElement = new Map<string, string>();

	// Later entries (custom [mapcodes]) win over the defaults.
	for (const [code, element] of Object.entries(codes).reverse()) {
		const key = normalizeElement(element);

		if (!byElement.has(key)) {
			byElement.set(key, code);
		}
	}

	return (element) => {
		const code = byElement.get(normalizeElement(element));

		if (code === undefined) {
			throw new Error(`No map code defined for element "${element}"`);
		}

		return code;
	};
}

/** C64 Boulder Dash pseudo-random generator, as used for RandomFill. */
function createRandom(seed: number): () => number {
	let seed1 = 0;
	let seed2 = seed & 0xff;

	return () => {
		const temp1 = (seed1 & 1) * 0x80;
		const temp2 = (seed2 >> 1) & 0x7f;

		let result = seed2 + (seed2 & 1) * 0x80;
		let carry = result > 0xff ? 1 : 0;

		result = (result & 0xff) + carry + 0x13;
		carry = result > 0xff ? 1 : 0;
		seed2 = result & 0xff;

		result = seed1 + carry + temp1;
		carry = result > 0xff ? 1 : 0;

		seed1 = ((result & 0xff) + carry + temp2) & 0xff;

		return seed1;
	};
}

type Cells = string[][];

function setCell(cells: Cells, x: number, y: number, element: string): void {
	if (y >= 0 && y < cells.length && x >= 0 && x < cells[y].length) {
		cells[y][x] = element;
	}
}

function drawLine(cells: Cells, x1: number, y1: number, x2: number, y2: number, element: string): void {
	const dx = Math.abs(x2 - x1);
	const dy = Math.abs(y2 - y1);
	const sx = x1 < x2 ? 1 : -1;
	const sy = y1 < y2 ? 1 : -1;

	let error = dx - dy;
	let x = x1;
	let y = y1;

	for (;;) {
		setCell(cells, x, y, element);

		if (x === x2 && y === y2) {
			return;
		}

		const doubled = 2 * error;

		if (doubled > -dy) {
			error -= dy;
			x += sx;
		}

		if (doubled < dx) {
			error += dx;
			y += sy;
		}
	}
}

function drawObject(cells: Cells, object: CaveObject): void {
	switch (object.type) {
		case "Point":
			setCell(cells, object.x, object.y, object.element);
			break;

		case "Line":
			drawLine(cells, object.x1, object.y1, object.x2, object.y2, object.element);
			break;

		case "Rectangle": {
			const { x1, y1, x2, y2, element } = object;

			drawLine(cells, x1, y1, x2, y1, element);
			drawLine(cells, x1, y2, x2, y2, element);
			drawLine(cells, x1, y1, x1, y2, element);
			drawLine(cells, x2, y1, x2, y2, element);
			break;
		}

		case "FillRect": {
			const [left, right] = [Math.min(object.x1, object.x2), Math.max(object.x1, object.x2)];
			const [top, bottom] = [Math.min(object.y1, object.y2), Math.max(object.y1, object.y2)];

			for (let y = top; y <= bottom; y++) {
				for (let x = left; x <= right; x++) {
					const isBorder = x === left || x === right || y === top || y === bottom;

					setCell(cells, x, y, isBorder ? object.borderElement : object.fillElement);
				}
			}
			break;
		}

		case "Raster":
			for (let j = 0; j < object.countY; j++) {
				for (let i = 0; i < object.countX; i++) {
					setCell(cells, object.x + i * object.stepX, object.y + j * object.stepY, object.element);
				}
			}
			break;
	}
}

/**
 * Builds the cave grid (rows of map codes) for a 1-based level.
 * Map-coded caves return their map; object-coded ones are rendered as
 * InitialFill, then RandomFill (seeded per level), then the objects in order.
 */
export function buildCaveMap(cave: BDCFFCave, mapCodes: BDCFFMapCodes, level = 1): string[] {
	if (cave.coding === "map") {
		return cave.map;
	}

	const { width, height } = cave.size;
	const initialFill = cave.initialFill ?? DEFAULT_INITIAL_FILL;

	const cells: Cells = Array.from({ length: height }, () => Array.from({ length: width }, () => initialFill));

	if (cave.randomFill?.length) {
		const seeds = cave.randomSeeds ?? [];
		const random = createRandom(seeds[level - 1] ?? seeds[0] ?? 0);

		// The first and last rows are not randomized.
		for (let y = 1; y < height - 1; y++) {
			for (let x = 0; x < width; x++) {
				const value = random();

				// Entries are thresholds: the last one matching wins.
				for (const { element, probability } of cave.randomFill) {
					if (value < probability) {
						cells[y][x] = element;
					}
				}
			}
		}
	}

	for (const object of cave.objects) {
		drawObject(cells, object);
	}

	const encode = createEncoder(mapCodes);

	return cells.map((row) => row.map(encode).join(""));
}
