import { useTick } from "@pixi/react";
import { Container, Graphics, Sprite, type Ticker, type Texture } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { LevelDefinition, Point, Size } from "../types";
import { PLAYER_ANCHORS, type PlayerDefinition } from "./Player";
import { Keyboard } from "../input/Keyboard";
import { createAdventurerTexture } from "../rendering/createAdventurerTexture";
import { clamp, clampHitboxPositionToWorld, getHitboxWorldRectangle } from "./worldUtils";

// DEBUG: Show player hitbox for debugging purposes
const SHOW_PLAYER_HITBOX = false;

const PLAYER: PlayerDefinition = {
	spriteSize: {
		width: 24,
		height: 32,
	},
	hitbox: {
		x: 4,
		y: 6,
		width: 16,
		height: 24,
	},
	speed: 180,
	anchorPreset: "bottom-center",
};

export interface GameWorldProps {
	level: LevelDefinition;
	viewportWidth: number;
	viewportHeight: number;
}

/**
 * GameWorld component.
 * @param level The level definition.
 * @param viewportWidth The width of the viewport.
 * @param viewportHeight The height of the viewport.
 */
export function GameWorld({ level, viewportWidth, viewportHeight }: GameWorldProps) {
	const worldRef = useRef<Container>(null);
	const playerRef = useRef<Sprite>(null);
	const playerHitboxRef = useRef<Graphics>(null);

	const keyboard = useMemo(() => new Keyboard(), []);
	const adventurerTexture = useMemo<Texture>(() => createAdventurerTexture(), []);
	const playerAnchor = PLAYER_ANCHORS[PLAYER.anchorPreset];

	const worldWidth = level.widthInTiles * level.tileSize;
	const worldHeight = level.heightInTiles * level.tileSize;

	const worldSize = useMemo<Size>(
		() => ({
			width: worldWidth,
			height: worldHeight,
		}),
		[worldWidth, worldHeight],
	);

	/*
	 * playerStart identifies the top-left corner of the spawn cell.
	 * The sprite position is derived so the hitbox starts precisely
	 * at this position, regardless of the anchor preset or hitbox offset.
	 */
	const initialPlayerX = level.playerStart.column * level.tileSize - PLAYER.hitbox.x + PLAYER.spriteSize.width * playerAnchor.x;
	const initialPlayerY = level.playerStart.row * level.tileSize - PLAYER.hitbox.y + PLAYER.spriteSize.height * playerAnchor.y;

	// Inputs
	useEffect(() => {
		keyboard.attach();

		return () => {
			keyboard.detach();
		};
	}, [keyboard]);

	// Player resources
	useEffect(() => {
		return () => {
			adventurerTexture.destroy(true);
		};
	}, [adventurerTexture]);

	/**
	 * Draw the game map background.
	 */
	const drawMap = useCallback(
		(graphics: Graphics): void => {
			graphics.clear();
			graphics.rect(0, 0, worldWidth, worldHeight).fill({ color: 0x17211c });

			for (let row = 0; row < level.heightInTiles; row += 1) {
				for (let column = 0; column < level.widthInTiles; column += 1) {
					const isDark = (column + row) % 2 === 0;
					const color = isDark ? 0x24352b : 0x2a3d31;
					graphics.rect(column * level.tileSize, row * level.tileSize, level.tileSize, level.tileSize).fill({ color });
				}
			}

			graphics.rect(0, 0, worldWidth, worldHeight).stroke({ color: 0xd6b45a, width: 2, alignment: 0 });
		},
		[level.heightInTiles, level.tileSize, level.widthInTiles, worldHeight, worldWidth],
	);

	/**
	 * Draw the player hitbox around its local origin.
	 * Its world position is updated during the game loop.
	 */
	const drawPlayerHitbox = useCallback((graphics: Graphics): void => {
		graphics.clear();

		if (!SHOW_PLAYER_HITBOX) {
			return;
		}

		graphics.rect(0, 0, PLAYER.hitbox.width, PLAYER.hitbox.height).stroke({
			color: 0xff3b30,
			width: 1,
			alignment: 1,
			alpha: 0.9,
		});
	}, []);

	/**
	 * Main game loop.
	 * Update the player position and camera based on input and collisions.
	 */
	const gameLoop = useCallback(
		(ticker: Ticker): void => {
			const player = playerRef.current;
			const playerHitbox = playerHitboxRef.current;
			const world = worldRef.current;

			if (!player || !world) {
				return;
			}

			// Limit very large deltas, for example after the JavaScript debugger has stopped execution on a breakpoint.
			const deltaSeconds = Math.min(ticker.deltaMS / 1000, 0.05);

			const playerDirection = keyboard.getMovementDirection();

			const requestedPlayerPosition: Point = {
				x: player.x + playerDirection.x * PLAYER.speed * deltaSeconds,
				y: player.y + playerDirection.y * PLAYER.speed * deltaSeconds,
			};

			// The collisions use the logical hitbox, not the sprite size.
			const newPlayerPosition = clampHitboxPositionToWorld(
				requestedPlayerPosition,
				PLAYER.spriteSize,
				playerAnchor,
				PLAYER.hitbox,
				worldSize,
			);
			player.x = newPlayerPosition.x;
			player.y = newPlayerPosition.y;

			const hitbox = getHitboxWorldRectangle(newPlayerPosition, PLAYER.spriteSize, playerAnchor, PLAYER.hitbox);

			if (playerHitbox) {
				playerHitbox.x = hitbox.x;
				playerHitbox.y = hitbox.y;
			}

			// Center the camera on the logical hitbox
			const playerCenterX = hitbox.x + hitbox.width / 2;
			const playerCenterY = hitbox.y + hitbox.height / 2;

			const desiredCameraX = viewportWidth / 2 - playerCenterX;
			const desiredCameraY = viewportHeight / 2 - playerCenterY;

			const minimumCameraX = Math.min(0, viewportWidth - worldWidth);
			const minimumCameraY = Math.min(0, viewportHeight - worldHeight);

			world.x = clamp(desiredCameraX, minimumCameraX, 0);
			world.y = clamp(desiredCameraY, minimumCameraY, 0);
		},
		[keyboard, playerAnchor, viewportHeight, viewportWidth, worldHeight, worldSize, worldWidth],
	);

	// Game loop subscription
	useTick(gameLoop);

	return (
		<pixiContainer ref={worldRef}>
			<pixiGraphics draw={drawMap} />

			{/* Main player */}
			<pixiSprite
				ref={playerRef}
				texture={adventurerTexture}
				x={initialPlayerX}
				y={initialPlayerY}
				width={PLAYER.spriteSize.width}
				height={PLAYER.spriteSize.height}
				anchor={playerAnchor}
			/>

			{/* Temporary debug display */}
			{SHOW_PLAYER_HITBOX && <pixiGraphics ref={playerHitboxRef} draw={drawPlayerHitbox} />}
		</pixiContainer>
	);
}
