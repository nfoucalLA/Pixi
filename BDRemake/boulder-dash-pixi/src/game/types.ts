export interface LevelDefinition {
	readonly id: string;
	readonly widthInTiles: number;
	readonly heightInTiles: number;
	readonly tileSize: number;
	readonly playerStart: {
		readonly column: number;
		readonly row: number;
	};
}
