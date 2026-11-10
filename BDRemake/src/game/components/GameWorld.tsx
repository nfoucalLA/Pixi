import { useTick } from "@pixi/react";
import { Container, Graphics, Sprite, type Texture, type Ticker } from "pixi.js";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";

import { Keyboard } from "../input/Keyboard";
import { createAdventurerTexture } from "../rendering/createAdventurerTexture";
import type { LevelDefinition, Rectangle, Size } from "../types";
import { Player } from "./Player";
import { PLAYER_DEFINITION } from "./playerDefinition";
import { clamp } from "./worldUtils";
import bdcffText from "../../assets/BoulderDash01.bd?raw"; // BoulderDash level 1 BDCFF format
import { BDCFFParser } from "../config/LevelParser/BDCFF_Parser";

// DEBUG: Show player hitbox for debugging purposes.
const SHOW_PLAYER_HITBOX = true;

const parser = new BDCFFParser();
const game = parser.parse(bdcffText);

console.log(game.caves.length);
console.log(game.caves[0].name);
console.log(game.caves[0].map);

export interface GameWorldProps {
	level: LevelDefinition;
	viewportWidth: number;
	viewportHeight: number;
}

/**
 * Game world component.
 *
 * React owns the lifecycle of the world, while the Player instance is the
 * source of truth for the logical player position.
 *
 * Pixi objects are updated from the logical state and are used only
 * for rendering.
 */
export function GameWorld({ level, viewportWidth, viewportHeight }: GameWorldProps) {
	const worldRef = useRef<Container>(null);
	const playerSpriteRef = useRef<Sprite>(null);
	const playerHitboxGraphicsRef = useRef<Graphics>(null);

	const keyboard = useMemo(() => new Keyboard(), []);

	const adventurerTexture = useMemo<Texture>(() => createAdventurerTexture(), []);

	/*
	 * Player.state.position represents the top-left corner of the logical hitbox in world coordinates.
	 * It does not represent the Pixi sprite position.
	 */
	const player = useMemo(() => new Player({ x: 0, y: 0 }, PLAYER_DEFINITION.physics, PLAYER_DEFINITION.visual), []);

	const worldWidth = level.widthInTiles * level.tileSize;
	const worldHeight = level.heightInTiles * level.tileSize;

	const worldSize = useMemo<Size>(
		() => ({
			width: worldWidth,
			height: worldHeight,
		}),
		[worldWidth, worldHeight],
	);

	const playerAnchor = player.getAnchor();

	/**
	 * Synchronizes the Pixi display objects with the logical player state.
	 * This function does not update the simulation.
	 */
	const synchronizePlayerRendering = useCallback((): Rectangle => {
		const playerSprite = playerSpriteRef.current;
		const playerHitboxGraphics = playerHitboxGraphicsRef.current;
		const spritePosition = player.getSpritePosition();
		const playerHitbox = player.getHitbox();

		if (playerSprite) {
			playerSprite.x = spritePosition.x;
			playerSprite.y = spritePosition.y;
		}

		if (playerHitboxGraphics) {
			playerHitboxGraphics.x = playerHitbox.x;
			playerHitboxGraphics.y = playerHitbox.y;
		}

		return playerHitbox;
	}, [player]);

	/**
	 * Positions the camera so that it follows the center of the logical player hitbox.
	 */
	const updateCamera = useCallback(
		(world: Container, playerHitbox: Rectangle): void => {
			const playerCenterX = playerHitbox.x + playerHitbox.width / 2;
			const playerCenterY = playerHitbox.y + playerHitbox.height / 2;

			const desiredCameraX = viewportWidth / 2 - playerCenterX;
			const desiredCameraY = viewportHeight / 2 - playerCenterY;

			const minimumCameraX = Math.min(0, viewportWidth - worldWidth);
			const minimumCameraY = Math.min(0, viewportHeight - worldHeight);

			world.x = clamp(desiredCameraX, minimumCameraX, 0);
			world.y = clamp(desiredCameraY, minimumCameraY, 0);
		},
		[viewportHeight, viewportWidth, worldHeight, worldWidth],
	);

	/*
	 * Attach keyboard inputs.
	 */
	useEffect(() => {
		keyboard.attach();

		return () => {
			keyboard.detach();
		};
	}, [keyboard]);

	/*
	 * Destroy the dynamically created player texture when the component is unmounted.
	 */
	useEffect(() => {
		return () => {
			adventurerTexture.destroy(true);
		};
	}, [adventurerTexture]);

	/*
	 * Reset the logical player state when the level or its spawn position changes.
	 * The level spawn position represents the top-left corner of the player hitbox.
	 */
	useLayoutEffect(() => {
		player.reset({
			x: level.playerStart.column * level.tileSize,
			y: level.playerStart.row * level.tileSize,
		});

		const playerHitbox = synchronizePlayerRendering();

		const world = worldRef.current;

		if (world) {
			updateCamera(world, playerHitbox);
		}
	}, [level.id, level.playerStart.column, level.playerStart.row, level.tileSize, player, synchronizePlayerRendering, updateCamera]);

	/**
	 * Draws the game map background.
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
	 * Draws the player hitbox around the local Graphics origin.
	 * The Graphics world position is synchronized with the logical hitbox position during the game loop.
	 */
	const drawPlayerHitbox = useCallback(
		(graphics: Graphics): void => {
			graphics.clear();

			const hitboxSize = player.physics.hitboxSize;

			graphics.rect(0, 0, hitboxSize.width, hitboxSize.height).stroke({
				color: 0xff3b30,
				width: 1,
				alignment: 1,
				alpha: 0.9,
			});
		},
		[player],
	);

	/**
	 * Main game loop.
	 *
	 * The update order is:
	 *
	 * 1. Read inputs.
	 * 2. Update the logical player state.
	 * 3. Synchronize the Pixi rendering.
	 * 4. Update the camera.
	 */
	const gameLoop = useCallback(
		(ticker: Ticker): void => {
			const world = worldRef.current;
			const playerSprite = playerSpriteRef.current;

			if (!world || !playerSprite) {
				return;
			}

			/*
			 * Limit very large deltas, for example after the debugger has stopped on a breakpoint.
			 */
			const deltaSeconds = Math.min(ticker.deltaMS / 1000, 0.05);

			const movementDirection = keyboard.getMovementDirection();

			player.update(movementDirection, deltaSeconds, worldSize);

			/*
			 * Synchronize the Pixi representation with the updated logical state.
			 */
			const playerHitbox = synchronizePlayerRendering();

			/*
			 * Follow the logical hitbox rather than the visual sprite bounds.
			 */
			updateCamera(world, playerHitbox);
		},
		[keyboard, player, synchronizePlayerRendering, updateCamera, worldSize],
	);

	// Game loop ticker subscription.
	useTick(gameLoop);

	return (
		<pixiContainer ref={worldRef}>
			<pixiGraphics draw={drawMap} />

			{/* Main player visual representation */}
			<pixiSprite
				ref={playerSpriteRef}
				texture={adventurerTexture}
				width={player.visual.spriteSize.width}
				height={player.visual.spriteSize.height}
				anchor={playerAnchor}
			/>

			{/* Temporary hitbox debug display */}
			{SHOW_PLAYER_HITBOX && <pixiGraphics ref={playerHitboxGraphicsRef} draw={drawPlayerHitbox} />}
		</pixiContainer>
	);
}
