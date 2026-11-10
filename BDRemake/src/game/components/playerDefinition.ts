import type { PlayerDefinition } from "./Player";

export const PLAYER_DEFINITION: PlayerDefinition = {
	physics: {
		hitboxSize: {
			width: 16,
			height: 24,
		},
		speed: 180,
	},

	visual: {
		spriteSize: {
			width: 24,
			height: 32,
		},

		/*
		 * The hitbox starts at (x, y) relative to the top-left corner of the sprite.
		 */
		hitboxOffset: {
			x: 4,
			y: 6,
		},

		anchorPreset: "bottom-center",
	},
};
