export class Input {
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();
  private mouseX = 0;
  private mouseY = 0;

  constructor(private readonly canvas: HTMLElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    canvas.addEventListener("click", this.capturePointer);
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
    if (!this.keys.has(event.code)) this.pressed.add(event.code);
    this.keys.add(event.code);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (document.pointerLockElement !== this.canvas) return;
    this.mouseX += event.movementX;
    this.mouseY += event.movementY;
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) this.clear();
  };

  private capturePointer = (): void => {
    if (document.pointerLockElement !== this.canvas && this.canvas.requestPointerLock) {
      void this.canvas.requestPointerLock();
    }
  };

  down(...codes: string[]): boolean {
    return codes.some((code) => this.keys.has(code));
  }

  consume(code: string): boolean {
    const exists = this.pressed.has(code);
    this.pressed.delete(code);
    return exists;
  }

  takeMouseDelta(): { x: number; y: number } {
    const delta = { x: this.mouseX, y: this.mouseY };
    this.mouseX = 0;
    this.mouseY = 0;
    return delta;
  }

  clear = (): void => {
    this.keys.clear();
    this.pressed.clear();
    this.mouseX = 0;
    this.mouseY = 0;
  };

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    this.canvas.removeEventListener("click", this.capturePointer);
  }
}
