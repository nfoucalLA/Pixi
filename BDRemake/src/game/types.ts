import type { CellType } from "./config/CellType";

export interface LevelDefinition {
	readonly id: string;
	readonly title: string;
	readonly widthInTiles: number;
	readonly heightInTiles: number;
	readonly tileSize: number;
	readonly map: CellType[][];
	readonly diamondsRequired: number;
	readonly timeLimit: number; // in seconds
	readonly playerStart: { readonly column: number; readonly row: number };
}

export interface Point {
	x: number;
	y: number;
}

export interface Size {
	readonly width: number;
	readonly height: number;
}

export interface Rectangle {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}
