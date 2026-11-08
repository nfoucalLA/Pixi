import type { Point, Size } from "../types";
import type { PlayerDefinition, PlayerState } from "./Player";
import { clampRectanglePositionToWorld } from "./worldUtils";

export function createPlayerState(initialPosition: Point): PlayerState {
	return {
		position: {
			x: initialPosition.x,
			y: initialPosition.y,
		},
		velocity: {
			x: 0,
			y: 0,
		},
		grounded: false,
	};
}

export interface UpdatePlayerArguments {
	state: PlayerState;
	definition: PlayerDefinition;
	movementDirection: Point;
	deltaSeconds: number;
	worldSize: Size;
}

export function updatePlayer({ state, definition, movementDirection, deltaSeconds, worldSize }: UpdatePlayerArguments): void {
	state.velocity.x = movementDirection.x * definition.physics.speed;

	state.velocity.y = movementDirection.y * definition.physics.speed;

	const requestedPosition: Point = {
		x: state.position.x + state.velocity.x * deltaSeconds,
		y: state.position.y + state.velocity.y * deltaSeconds,
	};

	const clampedPosition = clampRectanglePositionToWorld(requestedPosition, definition.physics.hitboxSize, worldSize);

	state.position.x = clampedPosition.x;
	state.position.y = clampedPosition.y;
}
