// src/game/audio.ts
import { SOUNDS } from "./assets";

export const audioManager = {
    playSFX: (key: keyof typeof SOUNDS) => {
        // Clone the node to allow overlapping sounds (multiple explosions)
        const sfx = new Audio(SOUNDS[key]);
        sfx.volume = 0.8;
        sfx.play().catch(e => {}); // Ignore play errors if user hasn't interacted
    }
}