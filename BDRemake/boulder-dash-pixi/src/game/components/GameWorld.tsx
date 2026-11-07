import { extend, useTick } from "@pixi/react";
import { Container, Graphics, Sprite, type Ticker, type Texture } from "pixi.js";
import { useCallback, useEffect, useMemo, useRef } from "react";

import type { LevelDefinition } from "../types";
import { Keyboard } from "../input/Keyboard";
import { createAdventurerTexture } from "../rendering/createAdventurerTexture";

extend({ Container, Graphics, Sprite });

export interface GameWorldProps {
	level: LevelDefinition;
	viewportWidth: number;
	viewportHeight: number;
}

const PLAYER_SIZE = 32;
const PLAYER_SPEED = 180;

function clamp(value: number, minimum: number, maximum: number): number {
	if (maximum < minimum) {
		return minimum;
	}

	return Math.max(minimum, Math.min(value, maximum));
}

export function GameWorld({ level, viewportWidth, viewportHeight }: GameWorldProps) {
	const worldRef = useRef<Container>(null);
	const playerRef = useRef<Sprite>(null);

	const keyboard = useMemo(() => new Keyboard(), []);

	const adventurerTexture = useMemo<Texture>(() => createAdventurerTexture(), []);

	const worldWidth = level.widthInTiles * level.tileSize;
	const worldHeight = level.heightInTiles * level.tileSize;

	const initialPlayerX = level.playerStart.column * level.tileSize + level.tileSize / 2;

	const initialPlayerY = level.playerStart.row * level.tileSize + level.tileSize / 2;

	useEffect(() => {
		keyboard.attach();

		return () => {
			keyboard.detach();
		};
	}, [keyboard]);

	useEffect(() => {
		return () => {
			adventurerTexture.destroy(true);
		};
	}, [adventurerTexture]);

	const drawMap = useCallback(
		(graphics: Graphics): void => {
			graphics.clear();

			// Fond général.
			graphics.rect(0, 0, worldWidth, worldHeight).fill({ color: 0x17211c });

			// Cases temporaires pour visualiser la map.
			for (let row = 0; row < level.heightInTiles; row += 1) {
				for (let column = 0; column < level.widthInTiles; column += 1) {
					const isDark = (column + row) % 2 === 0;
					const color = isDark ? 0x24352b : 0x2a3d31;

					graphics.rect(column * level.tileSize, row * level.tileSize, level.tileSize, level.tileSize).fill({ color });
				}
			}

			// Limite visuelle du niveau.
			graphics.rect(0, 0, worldWidth, worldHeight).stroke({
				color: 0xd6b45a,
				width: 2,
			});
		},
		[level.heightInTiles, level.tileSize, level.widthInTiles, worldHeight, worldWidth],
	);

	const update = useCallback(
		(ticker: Ticker): void => {
			const player = playerRef.current;
			const world = worldRef.current;

			if (!player || !world) {
				return;
			}

			const direction = keyboard.getMovementDirection();

			// On limite volontairement les très grands deltas.
			// Cela évite un bond important après un breakpoint.
			const deltaSeconds = Math.min(ticker.deltaMS / 1000, 0.05);

			const nextX = player.x + direction.x * PLAYER_SPEED * deltaSeconds;

			const nextY = player.y + direction.y * PLAYER_SPEED * deltaSeconds;

			const playerHalfSize = PLAYER_SIZE / 2;

			// Seule collision actuelle : les limites de la map.
			player.x = clamp(nextX, playerHalfSize, worldWidth - playerHalfSize);

			player.y = clamp(nextY, playerHalfSize, worldHeight - playerHalfSize);

			// Caméra centrée sur le joueur.
			const desiredCameraX = viewportWidth / 2 - player.x;

			const desiredCameraY = viewportHeight / 2 - player.y;

			const minimumCameraX = Math.min(0, viewportWidth - worldWidth);

			const minimumCameraY = Math.min(0, viewportHeight - worldHeight);

			world.x = clamp(desiredCameraX, minimumCameraX, 0);

			world.y = clamp(desiredCameraY, minimumCameraY, 0);
		},
		[keyboard, viewportHeight, viewportWidth, worldHeight, worldWidth],
	);

	useTick(update);

	return (
		<pixiContainer ref={worldRef}>
			<pixiGraphics draw={drawMap} />

			<pixiSprite
				ref={playerRef}
				texture={adventurerTexture}
				x={initialPlayerX}
				y={initialPlayerY}
				width={PLAYER_SIZE}
				height={PLAYER_SIZE}
				anchor={0.5}
			/>
		</pixiContainer>
	);
}
