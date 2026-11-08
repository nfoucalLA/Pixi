import type { Point, Rectangle, Size } from "../types";

export function clamp(value: number, minimum: number, maximum: number): number {
	if (maximum < minimum) {
		return minimum;
	}

	return Math.max(minimum, Math.min(value, maximum));
}

/**
 * Clamps the top-left position of a rectangle so the rectangle stays entirely inside the world.
 */
export function clampRectanglePositionToWorld(position: Point, rectangleSize: Size, worldSize: Size): Point {
	return {
		x: clamp(position.x, 0, worldSize.width - rectangleSize.width),
		y: clamp(position.y, 0, worldSize.height - rectangleSize.height),
	};
}

/**
 * Returns a rectangle whose position corresponds to its top-left corner in world coordinates.
 */
export function createWorldRectangle(position: Point, size: Size): Rectangle {
	return {
		x: position.x,
		y: position.y,
		width: size.width,
		height: size.height,
	};
}
