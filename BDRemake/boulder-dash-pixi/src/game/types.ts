export interface LevelDefinition {
	readonly id: string;
	readonly widthInTiles: number;
	readonly heightInTiles: number;
	readonly tileSize: number;
	readonly playerStart: { readonly column: number; readonly row: number };
}

export interface Point {
	readonly x: number;
	readonly y: number;
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
