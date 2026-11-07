import { Texture } from "pixi.js";

const PIXEL_ART = [
	"................",
	"......HHHH......",
	".....HHHHHH.....",
	".....HSSSSH.....",
	".....SSEESS.....",
	"......SSSS......",
	".....BBBBBB.....",
	"....BBRBBRBB....",
	"....BBBBBBBB....",
	".....BBBBBB.....",
	".....BB..BB.....",
	"....BBB..BBB....",
	"....LL....LL....",
	"...LLL....LLL...",
	"...DDD....DDD...",
	"................",
] as const;

const COLORS: Record<string, string> = {
	H: "#5b3219", // cheveux
	S: "#efb27f", // peau
	E: "#20202a", // yeux
	B: "#2766a8", // tunique
	R: "#c83c3c", // sac ou ceinture
	L: "#5d3a24", // jambes
	D: "#25212a", // bottes
};

export function createAdventurerTexture(): Texture {
	const canvas = document.createElement("canvas");

	canvas.width = 16;
	canvas.height = 16;

	const context = canvas.getContext("2d");

	if (!context) {
		throw new Error("Impossible de créer le contexte 2D du sprite.");
	}

	context.imageSmoothingEnabled = false;
	context.clearRect(0, 0, canvas.width, canvas.height);

	for (let y = 0; y < PIXEL_ART.length; y += 1) {
		const row = PIXEL_ART[y];

		for (let x = 0; x < row.length; x += 1) {
			const color = COLORS[row[x]];

			if (!color) {
				continue;
			}

			context.fillStyle = color;
			context.fillRect(x, y, 1, 1);
		}
	}

	const texture = Texture.from(canvas);
	texture.source.scaleMode = "nearest";

	return texture;
}
