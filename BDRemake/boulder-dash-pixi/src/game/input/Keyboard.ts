export interface MovementDirection {
	x: number;
	y: number;
}

const CONTROLLED_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

export class Keyboard {
	private readonly pressedKeys = new Set<string>();

	private readonly handleKeyDown = (event: KeyboardEvent): void => {
		if (!CONTROLLED_KEYS.has(event.code)) {
			return;
		}

		event.preventDefault();
		this.pressedKeys.add(event.code);
	};

	private readonly handleKeyUp = (event: KeyboardEvent): void => {
		if (!CONTROLLED_KEYS.has(event.code)) {
			return;
		}

		event.preventDefault();
		this.pressedKeys.delete(event.code);
	};

	private readonly handleBlur = (): void => {
		this.pressedKeys.clear();
	};

	public attach(): void {
		window.addEventListener("keydown", this.handleKeyDown);
		window.addEventListener("keyup", this.handleKeyUp);
		window.addEventListener("blur", this.handleBlur);
	}

	public detach(): void {
		window.removeEventListener("keydown", this.handleKeyDown);
		window.removeEventListener("keyup", this.handleKeyUp);
		window.removeEventListener("blur", this.handleBlur);

		this.pressedKeys.clear();
	}

	public getMovementDirection(): MovementDirection {
		let x = 0;
		let y = 0;

		if (this.pressedKeys.has("ArrowLeft")) {
			x -= 1;
		}

		if (this.pressedKeys.has("ArrowRight")) {
			x += 1;
		}

		if (this.pressedKeys.has("ArrowUp")) {
			y -= 1;
		}

		if (this.pressedKeys.has("ArrowDown")) {
			y += 1;
		}

		// Évite que les diagonales soient plus rapides.
		const length = Math.hypot(x, y);

		if (length > 0) {
			x /= length;
			y /= length;
		}

		return { x, y };
	}
}
