import { Schema as S, Array as EffectArray } from "effect"
import * as settingsRaw from "../../settings.json"

// Robustly handle JSON import (works whether default export is synthesized or not)
const settings = (settingsRaw as any).default || settingsRaw

// Constants
export const GRID_ROWS = 13
export const GRID_COLS = 15
export const CELL_SIZE = 40
export const FPS = 30
export const BOMB_TIMER = 3
export const EXPLOSION_DURATION = 1
export const BASE_SPEED = 0.15
export const SPEED_INCREMENT = 0.05
export const DESTRUCTION_DELAY = 1.1
export const WARMUP_SECONDS = 3
export const GAME_DURATION = 180

// Position
export type Position = typeof Position.Type
export const Position = S.Struct({
    row: S.Number,
    col: S.Number,
})

// Cell
export type Cell = typeof Cell.Type
export const Cell = S.Struct({
    type: S.Literal("empty", "hard", "soft"),
    hasExplosion: S.Boolean,
    isDestroying: S.Boolean,
    destroyTimer: S.Number,
    powerup: S.Union(
        S.Literal("FireUp", "BombUp", "SpeedUp", "Rainbow", "Vest"),
        S.Null
    ),
})

// Player
export type Player = typeof Player.Type
export const Player = S.Struct({
    id: S.Int,
    label: S.String,
    position: Position,
    isAlive: S.Boolean,
    isHuman: S.Boolean,

    // Bot Configuration
    botType: S.Union(S.Literal("hostile", "careful", "greedy", "extreme"), S.Null),
    botState: S.Union(S.Literal("WANDER", "ATTACK", "ESCAPE", "GET_POWERUP"), S.Null),
    botGoal: Position,
    botPath: S.Array(Position),
    lastReevaluation: S.Int,
    aiDirection: S.Union(S.Literal("up", "down", "left", "right"), S.Null),

    // Bot Configuration Parameters
    reevaluationInterval: S.Number,
    reevaluationChance: S.Number,
    dangerCheckDistance: S.Int,
    attackPlantDistance: S.Int,
    attackTargetDistance: S.Int,
    dangerDetectionPolicy: S.Union(S.Literal("bombs_only", "explosion_range"), S.Null),
    attackPolicy: S.Union(S.Literal("first", "second"), S.Null),
    powerupPolicy: S.Union(S.Literal("first", "second"), S.Null),
    powerupPolicyChance: S.Number,

    // Stats
    speed: S.Number,
    bombRange: S.Int,
    maxBombs: S.Int,
    activeBombs: S.Int,

    // Powerup Effects
    hasVest: S.Boolean,
    vestTimer: S.Number,
    rainbowTimers: S.Struct({
        FireUp: S.Number,
        BombUp: S.Number,
        SpeedUp: S.Number
    }),

    // Visuals
    color: S.String,
    subColor: S.String,
    direction: S.Literal("up", "down", "left", "right"),
    isMoving: S.Boolean,

    // Meta
    startPosition: Position,
    wins: S.Int
})

// Bomb
export type Bomb = typeof Bomb.Type
export const Bomb = S.Struct({
    position: Position,
    plantedAt: S.Int,
    range: S.Int,
    playerId: S.Int,
})

// Explosion
export type Explosion = typeof Explosion.Type
export const Explosion = S.Struct({
    cells: S.Array(Position),
    createdAt: S.Int,
})

// Game Model
export type Model = typeof Model.Type
export const Model = S.Struct({
    grid: S.Array(S.Array(Cell)),
    players: S.Array(Player),
    bombs: S.Array(Bomb),
    explosions: S.Array(Explosion),
    keys: S.Set(S.String),
    currentTime: S.Int,

    // Phase 5 Multi-round System
    state: S.Literal("warmup", "playing", "roundOver", "matchOver"),
    roundTimer: S.Int,
    roundNumber: S.Int,
    roundWinner: S.Union(S.String, S.Null),
    roundsToWin: S.Int,
    isDebugMode: S.Boolean,

    // Death handling
    deathTimer: S.Union(S.Int, S.Null),
    gamePhase: S.Union(S.Literal("active"), S.Literal("gameOver")),
    gameOverMessage: S.String
})

// --- Initialization Helpers ---

export const createGrid = (): Cell[][] => {
    const grid = EffectArray.makeBy(GRID_ROWS, (r) =>
        EffectArray.makeBy(GRID_COLS, (c) => {
            let type: "empty" | "hard" | "soft" = "empty"

            // Border walls
            if (r === 0 || r === GRID_ROWS - 1 || c === 0 || c === GRID_COLS - 1) {
                type = "hard"
            }
            // Interior checkerboard pattern
            else if (r % 2 === 0 && c % 2 === 0) {
                type = "hard"
            }

            return Cell.make({
                type,
                hasExplosion: false,
                powerup: null,
                isDestroying: false,
                destroyTimer: 0
            })
        })
    )

    // Add soft blocks
    for (let r = 1; r < GRID_ROWS - 1; r++) {
        for (let c = 1; c < GRID_COLS - 1; c++) {
            if (grid[r][c].type === "hard") continue

            const isSafeZone =
                (r <= 2 && c <= 2) ||
                (r <= 2 && c >= GRID_COLS - 3) ||
                (r >= GRID_ROWS - 3 && c <= 2) ||
                (r >= GRID_ROWS - 3 && c >= GRID_COLS - 3)

            if (!isSafeZone && Math.random() * 100 < settings.softBlockSpawnChance) {
                // Use EffectArray.map instead of native map or direct assignment for strict purity if desired,
                // but direct index assignment on local mutable array during initialization loop is standard.
                // To be strictly functional:
                grid[r] = EffectArray.map(grid[r], (cell, idx) =>
                    idx === c ? Cell.make({ ...cell, type: "soft" }) : cell
                )
            }
        }
    }

    return grid
}

// Bot configuration presets
const botConfigs: Record<string, any> = {
    hostile: {
        reevaluationInterval: 0.5,
        reevaluationChance: 0.25,
        dangerCheckDistance: 0,
        attackPlantDistance: 2,
        attackTargetDistance: 15,
        dangerDetectionPolicy: "bombs_only",
        attackPolicy: "second",
        powerupPolicy: "second",
        powerupPolicyChance: 0.2
    },
    careful: {
        reevaluationInterval: 0.25,
        reevaluationChance: 1.0,
        dangerCheckDistance: 4,
        attackPlantDistance: 4,
        attackTargetDistance: 3,
        dangerDetectionPolicy: "explosion_range",
        attackPolicy: "first",
        powerupPolicy: "second",
        powerupPolicyChance: 1.0
    },
    greedy: {
        reevaluationInterval: 1.0,
        reevaluationChance: 1.0,
        dangerCheckDistance: 2,
        attackPlantDistance: 3,
        attackTargetDistance: 6,
        dangerDetectionPolicy: "explosion_range",
        attackPolicy: "first",
        powerupPolicy: "first",
        powerupPolicyChance: 1.0
    },
    extreme: {
        reevaluationInterval: 0.1,
        reevaluationChance: 0.1,
        dangerCheckDistance: 10,
        attackPlantDistance: 10,
        attackTargetDistance: 15,
        dangerDetectionPolicy: "explosion_range",
        attackPolicy: "second",
        powerupPolicy: "first",
        powerupPolicyChance: 1.0
    }
}

export const initPlayers = (): Player[] => {
    const players: Player[] = []
    const humanCount = Math.min(2, Math.max(0, settings.humanPlayers))

    const botTypes: string[] = S.is(S.Array(S.String))(settings.botTypes) ? settings.botTypes : []
    
    const totalPlayers = Math.min(4, humanCount + botTypes.length)

    const positions = [
        { row: 1, col: 1 },
        { row: 1, col: GRID_COLS - 2 },
        { row: GRID_ROWS - 2, col: 1 },
        { row: GRID_ROWS - 2, col: GRID_COLS - 2 }
    ]

    const colors = [
        { main: "#FFFFFF", sub: "#0000FF" },
        { main: "#000000", sub: "#FF0000" },
        { main: "#008000", sub: "#FFA500" },
        { main: "#FFFF00", sub: "#800080" }
    ]

    return EffectArray.makeBy(totalPlayers, (i) => {
        const isHuman = i < humanCount
        const botTypeIndex = i - humanCount
        const botType = isHuman ? null : (botTypes[botTypeIndex] as string)

        const config = botType && botConfigs[botType] ? botConfigs[botType] : (isHuman ? null : botConfigs["hostile"])
        const appliedBotType = isHuman ? null : (botType || "hostile")

        return Player.make({
            id: i + 1,
            label: `P${i + 1}`,
            position: Position.make(positions[i]),
            startPosition: Position.make(positions[i]),
            isAlive: true,
            isHuman,
            botType: appliedBotType as any,
            botState: appliedBotType ? "WANDER" : null,
            botGoal: Position.make({ row: -1, col: -1 }),
            botPath: [],
            lastReevaluation: 0,
            aiDirection: null,
            reevaluationInterval: config?.reevaluationInterval || 0,
            reevaluationChance: config?.reevaluationChance || 0,
            dangerCheckDistance: config?.dangerCheckDistance || 0,
            attackPlantDistance: config?.attackPlantDistance || 0,
            attackTargetDistance: config?.attackTargetDistance || 0,
            dangerDetectionPolicy: config?.dangerDetectionPolicy || null,
            attackPolicy: config?.attackPolicy || null,
            powerupPolicy: config?.powerupPolicy || null,
            powerupPolicyChance: config?.powerupPolicyChance || 0,
            speed: BASE_SPEED,
            bombRange: 1,
            maxBombs: 1,
            activeBombs: 0,
            hasVest: false,
            vestTimer: 0,
            rainbowTimers: { FireUp: 0, BombUp: 0, SpeedUp: 0 },
            color: colors[i].main,
            subColor: colors[i].sub,
            direction: "down",
            isMoving: false,
            wins: 0
        })
    })
}

export const initModel = Model.make({
    grid: createGrid(),
    players: initPlayers(),
    bombs: [],
    explosions: [],
    keys: new Set(),
    currentTime: 0,
    state: "warmup",
    roundTimer: WARMUP_SECONDS * FPS,
    roundNumber: 1,
    roundWinner: null,
    roundsToWin: settings.roundsToWin,
    isDebugMode: false,
    deathTimer: null,
    gamePhase: "active",
    gameOverMessage: ""
})
