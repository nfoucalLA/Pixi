export const CellType = {
	Space: 0,
	Dirt: 1,
	Wall: 2,

	Boulder: 3,
	Diamond: 4,

	RockfordSpawn: 5,
	Exit: 6,

	Firefly: 7,
	Butterfly: 8,

	Amoeba: 9,
	MagicWall: 10,
} as const;

export type CellType = (typeof CellType)[keyof typeof CellType];
