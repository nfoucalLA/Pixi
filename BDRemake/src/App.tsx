import { Application, extend } from "@pixi/react";
import { Graphics, Container, Sprite } from "pixi.js";

import { GameWorld } from "./game/components/GameWorld";
import { level01 } from "./game/config/level";

extend({ Container, Graphics, Sprite });

const VIEWPORT_WIDTH = 960;
const VIEWPORT_HEIGHT = 540;

export default function App() {
	return (
		<main className="application">
			<h1>Boulder Dash Pixi</h1>

			<div className="game-container">
				<Application
					width={VIEWPORT_WIDTH}
					height={VIEWPORT_HEIGHT}
					backgroundColor={0x101510}
					antialias={false}
					resolution={window.devicePixelRatio}
					autoDensity
				>
					<GameWorld level={level01} viewportWidth={VIEWPORT_WIDTH} viewportHeight={VIEWPORT_HEIGHT} />
				</Application>
			</div>
		</main>
	);
}
