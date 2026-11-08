import type { Point, Rectangle, Size } from "../types";

export function clamp(value: number, minimum: number, maximum: number): number {
	if (maximum < minimum) {
		return minimum;
	}

	return Math.max(minimum, Math.min(value, maximum));
}

/**
 * Offset from the sprite anchor point to the top-left corner of the hitbox.
 * @param spriteSize The size of the sprite.
 * @param anchor The sprite anchor, with (0,0) being top-left and (1,1) being bottom-right.
 * @param hitbox The hitbox, relative to the top-left corner of the sprite.
 */
function getHitboxOffset(spriteSize: Size, anchor: Point, hitbox: Rectangle): Point {
	return {
		x: hitbox.x - spriteSize.width * anchor.x,
		y: hitbox.y - spriteSize.height * anchor.y,
	};
}

/**
 * Returns the hitbox in world coordinates.
 * @param position The position of the sprite anchor point in world coordinates.
 */
export function getHitboxWorldRectangle(position: Point, spriteSize: Size, anchor: Point, hitbox: Rectangle): Rectangle {
	const offset = getHitboxOffset(spriteSize, anchor, hitbox);

	return {
		x: position.x + offset.x,
		y: position.y + offset.y,
		width: hitbox.width,
		height: hitbox.height,
	};
}

/**
 * Clamps the sprite anchor position so that the hitbox stays inside the world.
 */
export function clampHitboxPositionToWorld(position: Point, spriteSize: Size, anchor: Point, hitbox: Rectangle, worldSize: Size): Point {
	const offset = getHitboxOffset(spriteSize, anchor, hitbox);

	return {
		x: clamp(position.x, -offset.x, worldSize.width - hitbox.width - offset.x),
		y: clamp(position.y, -offset.y, worldSize.height - hitbox.height - offset.y),
	};
}
