import type { Point, Rectangle, Size } from "../types";

export interface PlayerDefinition {
	readonly spriteSize: Size;
	readonly hitbox: Rectangle;
	readonly speed: number;
	readonly anchorPreset: PlayerAnchorPreset;
}

export type PlayerAnchorPreset = "top-left" | "center" | "bottom-center";

export const PLAYER_ANCHORS: Record<PlayerAnchorPreset, Point> = {
	"top-left": {
		x: 0,
		y: 0,
	},
	center: {
		x: 0.5,
		y: 0.5,
	},
	"bottom-center": {
		x: 0.5,
		y: 1,
	},
};
