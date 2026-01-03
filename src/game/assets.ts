// src/game/assets.ts

export const SOUNDS = {
    // Correct path: stepping out of 'game/' to 'src/', then into 'assets/'
    EXPLODE: new URL('../assets/sfx/explode.wav', import.meta.url).href,
    POWERUP: new URL('../assets/sfx/powerup.wav', import.meta.url).href,
    DEATH: new URL('../assets/sfx/death.mp3', import.meta.url).href,
}