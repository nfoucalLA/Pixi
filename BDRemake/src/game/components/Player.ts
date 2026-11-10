import type { Point, Rectangle, Size } from "../types";
import { clampRectanglePositionToWorld } from "./worldUtils";

const PLAYER_ANCHORS: Record<PlayerAnchorPreset, Point> = {
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

type PlayerAnchorPreset = "top-left" | "center" | "bottom-center";

export interface PlayerPhysicsDefinition {
	/**
	 * Logical collision box dimensions.
	 */
	readonly hitboxSize: Size;

	/**
	 * Maximum horizontal and vertical movement speed, expressed in world pixels per second.
	 */
	readonly speed: number;
}

export interface PlayerVisualDefinition {
	/**
	 * Displayed sprite dimensions.
	 */
	readonly spriteSize: Size;

	/**
	 * Position of the hitbox relative to the top-left corner of the unanchored sprite.
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

/**
 * Represents the player character, including its logical state, physics, and visual representation.
 */
export class Player {
	public readonly state: PlayerState;
	public readonly physics: PlayerPhysicsDefinition;
	public readonly visual: PlayerVisualDefinition;

	constructor(initialPosition: Point, physics: PlayerPhysicsDefinition, visual: PlayerVisualDefinition) {
		this.state = {
			position: { ...initialPosition },
			velocity: { x: 0, y: 0 },
			grounded: false,
		};
		this.physics = physics;
		this.visual = visual;
	}

	/**
	 * Puts the player back at the given hitbox top-left position with no velocity.
	 */
	public reset(position: Point): void {
		this.state.position.x = position.x;
		this.state.position.y = position.y;
		this.state.velocity.x = 0;
		this.state.velocity.y = 0;
		this.state.grounded = false;
	}

	/**
	 * Updates the logical state from the input. Knows nothing about Pixi.
	 */
	public update(movementDirection: Point, deltaSeconds: number, worldSize: Size): void {
		const { position, velocity } = this.state;

		velocity.x = movementDirection.x * this.physics.speed;
		velocity.y = movementDirection.y * this.physics.speed;

		const clampedPosition = clampRectanglePositionToWorld(
			{
				x: position.x + velocity.x * deltaSeconds,
				y: position.y + velocity.y * deltaSeconds,
			},
			this.physics.hitboxSize,
			worldSize,
		);

		position.x = clampedPosition.x;
		position.y = clampedPosition.y;
	}

	/**
	 * Returns the current logical hitbox of the player in world coordinates.
	 */
	public getHitbox(): Rectangle {
		return {
			x: this.state.position.x,
			y: this.state.position.y,
			width: this.physics.hitboxSize.width,
			height: this.physics.hitboxSize.height,
		};
	}

	/**
	 * Returns the anchor point of the player sprite relative to its hitbox.
	 */
	public getAnchor(): Point {
		return PLAYER_ANCHORS[this.visual.anchorPreset];
	}

	/**
	 * Converts the hitbox position into the position expected by the anchored Pixi sprite.
	 */
	public getSpritePosition(): Point {
		const { spriteSize, hitboxOffset } = this.visual;
		const anchor = this.getAnchor();

		return {
			x: this.state.position.x - hitboxOffset.x + spriteSize.width * anchor.x,
			y: this.state.position.y - hitboxOffset.y + spriteSize.height * anchor.y,
		};
	}
}
