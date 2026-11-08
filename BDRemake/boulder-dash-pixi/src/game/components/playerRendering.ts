import type { Point } from "../types";
import { PLAYER_ANCHORS, type PlayerDefinition, type PlayerState } from "./Player";

/**
 * Converts the logical hitbox position into the position expected by the anchored Pixi sprite.
 */
export function getPlayerSpritePosition(state: PlayerState, definition: PlayerDefinition): Point {
	const { spriteSize, hitboxOffset, anchorPreset } = definition.visual;

	const anchor = PLAYER_ANCHORS[anchorPreset];

	/*
	 * PlayerState.position identifies the top-left corner of the hitbox.
	 *
	 * First, recover the top-left corner of the sprite.
	 */
	const spriteTopLeftX = state.position.x - hitboxOffset.x;

	const spriteTopLeftY = state.position.y - hitboxOffset.y;

	/*
	 * Then convert the sprite top-left position into its anchored Pixi position.
	 */
	return {
		x: spriteTopLeftX + spriteSize.width * anchor.x,
		y: spriteTopLeftY + spriteSize.height * anchor.y,
	};
}
