import { Application, extend } from "@pixi/react";
import { Graphics } from "pixi.js";
import { useCallback } from "react";

extend({ Graphics });

const VIEWPORT_WIDTH = 960;
const VIEWPORT_HEIGHT = 540;

export default function App() {
	const drawScene = useCallback((graphics: Graphics): void => {
		graphics.clear();
		graphics.rect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT).fill({ color: 0x17211c });
		graphics.rect(100, 100, 64, 64).fill({ color: 0xd6b45a });
	}, []);

	return (
		<main className="application">
			<h1>Boulder Dash Pixi</h1>

			<div className="game-container">
				<Application width={VIEWPORT_WIDTH} height={VIEWPORT_HEIGHT} backgroundColor={0x17211c} antialias={false}>
					<pixiGraphics draw={drawScene} />
				</Application>
			</div>
		</main>
	);
}
