import type { Point, Rectangle, Size } from "../types";

export type PlayerAnchorPreset = "top-left" | "center" | "bottom-center";

export interface PlayerPhysicsDefinition {
	/**
	 * Logical collision box dimensions.
	 */
	readonly hitboxSize: Size;

	/**
	 * Maximum horizontal and vertical movement speed,
	 * expressed in world pixels per second.
	 */
	readonly speed: number;
}

export interface PlayerVisualDefinition {
	/**
	 * Displayed sprite dimensions.
	 */
	readonly spriteSize: Size;

	/**
	 * Position of the hitbox relative to the top-left
	 * corner of the unanchored sprite.
	 */
	readonly hitboxOffset: Point;

	/**
	 * Pixi anchor used to display the sprite.
	 */
	readonly anchorPreset: PlayerAnchorPreset;
}

export interface PlayerDefinition {
	readonly physics: PlayerPhysicsDefinition;
	readonly visual: PlayerVisualDefinition;
}

export interface PlayerState {
	/**
	 * Top-left corner of the logical hitbox in world coordinates.
	 */
	position: Point;

	/**
	 * Current velocity in world pixels per second.
	 */
	velocity: Point;

	/**
	 * Will be used later by platform physics.
	 */
	grounded: boolean;
}

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

export function getPlayerHitbox(state: PlayerState, definition: PlayerDefinition): Rectangle {
	return {
		x: state.position.x,
		y: state.position.y,
		width: definition.physics.hitboxSize.width,
		height: definition.physics.hitboxSize.height,
	};
}
