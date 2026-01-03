import { Array as EffectArray } from "effect"
import { Model, GRID_ROWS, GRID_COLS, CELL_SIZE, FPS, Player, BASE_SPEED, EXPLOSION_DURATION } from "./model"
import { Msg } from "./msg"
import { h } from "cs12251-mvu/src"

export const view = (model: Model, dispatch: (msg: Msg) => void) => {
    const timeToDisplay = model.state === "warmup" ? model.roundTimer : model.roundTimer
    const seconds = Math.ceil(timeToDisplay / FPS)

    let timeStr = `${Math.floor(seconds/60)}:${(seconds%60).toString().padStart(2,'0')}`
    if (model.state === "warmup") {
        if (seconds > 2) timeStr = "Ready..."
        else if (seconds > 1) timeStr = "Set..."
        else timeStr = "GO!"
    }

    return h("div", {
        style: {
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontFamily: "'Courier New', monospace",
            backgroundColor: "#222",
            minHeight: "100vh",
            padding: "20px"
        }
    }, [
        h("div", {
            style: {
                display: "flex", justifyContent: "space-between", alignItems: "center",
                width: `${GRID_COLS * CELL_SIZE}px`,
                backgroundColor: "#00AAAA",
                border: "3px solid #ECECEC", borderBottom: "3px solid #000",
                padding: "5px 15px", marginBottom: "0px", boxSizing: "border-box", height: "50px"
            }
        }, [
            h("div", { style: { display: "flex", alignItems: "center", fontWeight: "bold", color: "#FFF" } }, [
                 h("div", { style: { marginRight: "10px" } }, `R${model.roundNumber}`),
                 h("div", {
                     style: {
                         backgroundColor: "#000", color: "#fff", padding: "2px 5px",
                         fontFamily: "monospace", fontSize: "20px", fontWeight: "bold",
                         border: "2px solid #ECECEC",
                         minWidth: "80px", textAlign: "center"
                     }
                 }, timeStr)
            ]),
            h("div", { style: { display: "flex", gap: "10px" } },
                EffectArray.map(model.players, p =>
                    h("div", { style: { display: "flex", alignItems: "center", opacity: p.isAlive ? 1 : 0.5 } }, [
                        h("div", {
                            style: {
                                width: "20px", height: "20px", backgroundColor: p.color,
                                border: "2px solid #000", borderRadius: "50%", marginRight: "5px"
                            }
                        }),
                        h("div", {
                            style: { backgroundColor: "#000", color: "#fff", padding: "0 5px", border: "1px solid #fff" }
                        }, p.wins.toString())
                    ])
                )
            )
        ]),

        h("div", {
            style: {
                position: "relative",
                width: `${GRID_COLS * CELL_SIZE}px`,
                height: `${GRID_ROWS * CELL_SIZE}px`,
                backgroundColor: "#388700",
                border: "none",
            }
        }, [
            renderGrid(model),
            renderBombs(model),
            renderExplosions(model),
            renderPlayers(model),
            renderBotDebug(model),
            renderOverlays(model),
            model.gamePhase === "gameOver" ? renderGameOver(model) : null
        ].flat().filter(Boolean))
    ])
}

const renderOverlays = (model: Model) => {
    if (model.state === "warmup") {
        const seconds = Math.ceil(model.roundTimer / FPS)
        let text = seconds.toString()
        if (seconds > 2) text = "Ready..."
        else if (seconds > 1) text = "Set..."
        else text = "GO!"

        return h("div", {
            style: {
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", justifyContent: "center", alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.3)", color: "#FFF", fontSize: "80px", fontWeight: "bold",
                textShadow: "4px 4px #000", zIndex: 100
            }
        }, text)
    }

    if (model.state === "roundOver" || model.state === "matchOver") {
        const title = model.state === "matchOver" ? "MATCH OVER" : "ROUND OVER"
        const sub = model.roundWinner === "Draw" ? "Draw!" : `${model.roundWinner} Wins!`
        const help = model.state === "matchOver" ? "Champion!" : "Press ESC"

        // Scoreboard
        // Fix: Use EffectArray.map instead of native map
        const scoreList = h("div", { style: { display: "flex", gap: "20px", marginTop: "20px" } },
            EffectArray.map(model.players, p => h("div", {
                style: { display: "flex", alignItems: "center", fontSize: "24px", color: p.isAlive ? "#fff" : "#aaa" }
            }, [
                h("div", {
                    style: { width: "20px", height: "20px", backgroundColor: p.color, marginRight: "10px", border: "1px solid #fff" }
                }),
                `${p.label}: ${p.wins}`
            ]))
        )

        return h("div", {
            style: {
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                backgroundColor: "rgba(0,0,0,0.85)", color: "#FFF", zIndex: 100
            }
        }, [
            h("h1", { style: { fontSize: "60px", color: "#FFD700", marginBottom: "20px" } }, title),
            h("h2", { style: { fontSize: "40px", marginBottom: "10px" } }, sub),
            scoreList,
            h("p", { style: { fontSize: "20px", marginTop: "40px" } }, help)
        ])
    }
    return null
}

const renderGrid = (model: Model) => {
    const elements = []
    const highlight = "#E0E0E0"
    const shadow = "#707070"

    for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
            const cell = model.grid[r][c]
            let style: any = {
                position: "absolute", left: `${c * CELL_SIZE}px`, top: `${r * CELL_SIZE}px`,
                width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px`,
            }

            if (cell.type === "hard") {
                style.backgroundColor = "#B0B0B0"
                style.borderTop = `4px solid ${highlight}`; style.borderLeft = `4px solid ${highlight}`
                style.borderRight = `4px solid ${shadow}`; style.borderBottom = `4px solid ${shadow}`
                style.boxSizing = "border-box"
                elements.push(h("div", { style }, [
                    h("div", { style: { width: "100%", height: "100%", border: "2px solid #999", boxSizing: "border-box" } })
                ]))
            } else if (cell.type === "soft") {
                if (cell.isDestroying) {
                    // --- IMPROVED CRUMBLING ANIMATION ---
                    // Calculate breakdown stage based on timer
                    const maxTime = FPS * 1.1; // 1.1s
                    const progress = 1 - (cell.destroyTimer / maxTime); // 0.0 (start) -> 1.0 (gone)

                    // We step the visual damage into 4 phases
                    const damagePhase = Math.floor(progress * 4);

                    style.backgroundColor = "#FF4500";
                    style.border = "2px solid #FFFF00";
                    style.overflow = "hidden"; // Clip inner debris

                    // Create "debris" that shrinks
                    const sizePercent = 100 - (damagePhase * 25); // 100%, 75%, 50%, 25%

                    elements.push(h("div", { style }, [
                         h("div", {
                             style: {
                                 width: `${sizePercent}%`,
                                 height: `${sizePercent}%`,
                                 backgroundColor: "rgba(80, 40, 0, 0.8)", // Brownish debris
                                 margin: `${(100 - sizePercent) / 2}%`, // Center it
                                 transition: "all 0.1s"
                             }
                         })
                    ]))
                } else {
                    style.backgroundColor = "#202020"; style.display = "flex"; style.flexDirection = "column"; style.boxSizing = "border-box"
                    const brick = (w: string, mr: boolean = false) => h("div", {
                        style: {
                            width: w, height: "100%", backgroundColor: "#9AA2AB",
                            borderTop: `2px solid ${highlight}`, borderLeft: `2px solid ${highlight}`,
                            borderBottom: `2px solid ${shadow}`, borderRight: mr ? "2px solid #202020" : `2px solid ${shadow}`, boxSizing: "border-box"
                        }
                    })
                    elements.push(h("div", { style }, [
                        h("div", { style: { width: "100%", height: "13px", display: "flex" } }, [ brick("100%") ]),
                        h("div", { style: { width: "100%", height: "13px", display: "flex" } }, [ brick("33.33%", true), brick("66.67%") ]),
                        h("div", { style: { width: "100%", height: "14px", display: "flex" } }, [ brick("50%", true), brick("50%") ])
                    ]))
                }
            } else if (cell.powerup) {
                let color = "#fff", text = "?"
                if (cell.powerup === "FireUp") { color = "#FF4500"; text = "🔥"; }
                if (cell.powerup === "BombUp") { color = "#000"; text = "💣"; }
                if (cell.powerup === "SpeedUp") { color = "#1E90FF"; text = "👟"; }
                if (cell.powerup === "Rainbow") { color = "#FF00FF"; text = "🌈"; }
                if (cell.powerup === "Vest") { color = "#FFFF00"; text = "🛡️"; }

                // --- IMPROVED POWERUP ANIMATION ---
                // Bobbing effect using Sine wave on currentTime
                const bob = Math.sin(model.currentTime / 5) * 4; // +/- 4px movement

                elements.push(h("div", {
                    style: {
                        position: "absolute",
                        left: `${c * CELL_SIZE + 5}px`,
                        top: `${r * CELL_SIZE + 5 + bob}px`, // Animated Top
                        width: `${CELL_SIZE - 10}px`, height: `${CELL_SIZE - 10}px`, backgroundColor: "#fff",
                        border: `2px solid ${color}`, borderRadius: "5px", display: "flex", justifyContent: "center",
                        alignItems: "center", fontSize: "20px", zIndex: "2",
                        boxShadow: "0 4px 5px rgba(0,0,0,0.5)" // stronger shadow for floating effect
                    }
                }, text))
            }
        }
    }
    return elements
}

const renderBombs = (model: Model) => {
    return EffectArray.map(model.bombs, bomb => {
        // Pulse logic
        const frame = Math.floor(model.currentTime / 5) % 2
        const size = frame === 0 ? 30 : 34

        const isPowerful = bomb.range > 1
        const bombColor = isPowerful ? "#D00" : "#000"

        return h("div", {
            style: {
                position: "absolute", left: `${Math.floor(bomb.position.col) * CELL_SIZE}px`, top: `${Math.floor(bomb.position.row) * CELL_SIZE}px`,
                width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px`, zIndex: "10", display: "flex", justifyContent: "center", alignItems: "center"
            }
        }, [
            h("div", { style: { position: "relative", width: `${size}px`, height: `${size}px`, transition: "width 0.1s, height 0.1s" } }, [
                h("div", { style: { width: "100%", height: "100%", backgroundColor: bombColor, borderRadius: "50%", border: "2px solid #333", boxShadow: "2px 4px 6px rgba(0,0,0,0.5)", position: "absolute", zIndex: "1" } }, [
                     h("div", { style: { position: "absolute", top: "15%", left: "15%", width: "35%", height: "35%", backgroundColor: "#fff", borderRadius: "50%" } })
                ]),
                h("div", { style: { position: "absolute", top: "-4px", left: "50%", transform: "translateX(-50%)", width: "10px", height: "6px", backgroundColor: "#FFD700", border: "1px solid #000", borderRadius: "2px", zIndex: "0" } }),
                h("div", { style: { position: "absolute", top: "-10px", left: "50%", width: "4px", height: "6px", backgroundColor: (model.currentTime % 4 < 2) ? "#FF4500" : "#FFFF00", borderRadius: "50%", zIndex: "2", boxShadow: "0 0 5px #FF4500" } })
            ])
        ])
    })
}

const renderExplosions = (model: Model) => {
    const elements = []

    // Group explosions to calculate lifetime
    for (const exp of model.explosions) {
        // --- IMPROVED EXPLOSION ANIMATION ---
        // Calculate age
        const age = model.currentTime - exp.createdAt;
        const maxAge = FPS * 1; // 30 ticks
        const lifeLeft = 1 - (age / maxAge); // 1.0 -> 0.0

        // Expansion then Contraction
        // 0.0 -> 0.2: Rapid Expand
        // 0.2 -> 0.8: Hold/Pulse
        // 0.8 -> 1.0: Rapid Shrink
        let scale = 1.0;
        if (lifeLeft > 0.8) scale = (1.0 - lifeLeft) * 5; // Expand
        else if (lifeLeft < 0.2) scale = lifeLeft * 5; // Shrink

        const opacity = Math.min(1, lifeLeft * 2);

        for (const pos of exp.cells) {
            elements.push(h("div", {
                style: {
                    position: "absolute", left: `${Math.floor(pos.col) * CELL_SIZE}px`, top: `${Math.floor(pos.row) * CELL_SIZE}px`,
                    width: `${CELL_SIZE}px`, height: `${CELL_SIZE}px`,
                    zIndex: "15", display: "flex", justifyContent: "center", alignItems: "center",
                    pointerEvents: "none"
                }
            }, [
                h("div", {
                    style: {
                        width: "100%", height: "100%",
                        backgroundColor: "#FFFF00",
                        border: "4px solid #FF4500",
                        borderRadius: "15%", // Slightly rounded
                        boxShadow: "0 0 15px #FF4500",
                        boxSizing: "border-box",
                        transform: `scale(${scale})`, // Animated Scale
                        opacity: opacity.toString(),
                        transition: "transform 0.05s"
                    }
                }, [
                    h("div", {
                        style: {
                            width: "60%", height: "60%",
                            backgroundColor: "#FFF",
                            borderRadius: "50%",
                            margin: "20%"
                        }
                    })
                ])
            ]))
        }
    }
    return elements
}

const renderBotDebug = (model: Model) => {
    if (!model.isDebugMode) return []

    const debugElements: any[] = []
    for (const p of model.players) {
        if (p.isHuman || !p.isAlive) continue

        // Draw danger radius circle
        if (p.dangerCheckDistance > 0) {
            const radius = p.dangerCheckDistance * CELL_SIZE
            debugElements.push(h("div", {
                style: {
                    position: "absolute",
                    left: `${(p.position.col * CELL_SIZE) + (CELL_SIZE / 2) - radius}px`,
                    top: `${(p.position.row * CELL_SIZE) + (CELL_SIZE / 2) - radius}px`,
                    width: `${radius * 2}px`,
                    height: `${radius * 2}px`,
                    border: "2px dashed rgba(255, 0, 0, 0.5)",
                    borderRadius: "50%",
                    zIndex: "40", // High z-index to stay on top
                    pointerEvents: "none"
                }
            }))
        }

        // Draw bot state text
        const botTypeText = p.botType ? p.botType : "human"
        const botStateText = p.botState ? p.botState : "none"

        debugElements.push(h("div", {
            style: {
                position: "absolute",
                left: `${p.position.col * CELL_SIZE}px`,
                top: `${p.position.row * CELL_SIZE - 25}px`,
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                color: "#fff",
                fontSize: "12px",
                padding: "2px 4px",
                zIndex: "50",
                whiteSpace: "nowrap",
                borderRadius: "2px",
                pointerEvents: "none",
                transform: "translateX(-50%)",
                marginLeft: `${CELL_SIZE / 2}px`,
                border: "1px solid #fff"
            }
        }, `${botTypeText}: ${botStateText}`))

        // Draw path if exists
        if (p.botPath && p.botPath.length > 0) {
            for (let i = 0; i < p.botPath.length; i++) {
                const pos = p.botPath[i]
                let cornerStyle: any = {}

                // Set corner based on player ID (Phase 4b)
                if (p.id === 2) {
                    // P2: Top-right corner
                    cornerStyle = { top: "2px", right: "2px", left: "auto", bottom: "auto" }
                } else if (p.id === 3) {
                    // P3: Bottom-left corner
                    cornerStyle = { bottom: "2px", left: "2px", top: "auto", right: "auto" }
                } else if (p.id === 4) {
                    // P4: Bottom-right corner
                    cornerStyle = { bottom: "2px", right: "2px", top: "auto", left: "auto" }
                } else {
                    // P1 or other: Top-left corner (default)
                    cornerStyle = { top: "2px", left: "2px", right: "auto", bottom: "auto" }
                }

                debugElements.push(h("div", {
                    style: {
                        position: "absolute",
                        left: `${pos.col * CELL_SIZE}px`,
                        top: `${pos.row * CELL_SIZE}px`,
                        width: `${CELL_SIZE}px`,
                        height: `${CELL_SIZE}px`,
                        zIndex: "35",
                        pointerEvents: "none"
                    }
                }, [
                    h("div", {
                        style: {
                            position: "absolute",
                            width: "8px",
                            height: "8px",
                            backgroundColor: p.color,
                            border: "1px solid #000",
                            ...cornerStyle
                        }
                    })
                ]))
            }
        }

        // Draw goal indicator
        if (p.botGoal && p.botGoal.row !== -1) {
            debugElements.push(h("div", {
                style: {
                    position: "absolute",
                    left: `${p.botGoal.col * CELL_SIZE + CELL_SIZE/2 - 8}px`,
                    top: `${p.botGoal.row * CELL_SIZE + CELL_SIZE/2 - 8}px`,
                    width: "16px",
                    height: "16px",
                    backgroundColor: p.color,
                    border: "2px solid #000",
                    borderRadius: "50%",
                    zIndex: "35",
                    pointerEvents: "none",
                    opacity: 0.8
                }
            }))
        }
    }
    return debugElements
}

const renderPlayers = (model: Model) => {
    return EffectArray.map(model.players, p => {
        if (!p.isAlive) return null

        const accessoryColor = "#E6005C", faceColor = "#FFCC99", beltColor = "#F0F0F0"
        const isBack = p.direction === "up"
        const isSide = p.direction === "left" || p.direction === "right"
        const isRight = p.direction === "right"
        const animFrame = p.isMoving ? Math.floor(model.currentTime / 4) % 2 : 0

        let leftHandTop = "24px", rightHandTop = "24px"
        if (p.isMoving) {
            if (isSide) { leftHandTop = animFrame === 0 ? "26px" : "22px" }
            else { leftHandTop = animFrame === 0 ? "26px" : "22px"; rightHandTop = animFrame === 0 ? "22px" : "26px" }
        }
        const leftFootTop = animFrame === 0 ? "32px" : "30px"
        const rightFootTop = animFrame === 0 ? "30px" : "32px"

        // === Powerup Emojis ===
        let statusEmojis = ""
        if (p.rainbowTimers.FireUp > 0 || p.rainbowTimers.BombUp > 0 || p.rainbowTimers.SpeedUp > 0) statusEmojis += "🌈"
        if (p.hasVest) statusEmojis += "🛡️"
        if (p.bombRange > 1) statusEmojis += "🔥"
        if (p.maxBombs > 1) statusEmojis += "💣"
        if (p.speed > BASE_SPEED + 0.01) statusEmojis += "👟" // Check > base speed

        return h("div", {
            style: {
                position: "absolute",
                left: `${p.position.col * CELL_SIZE}px`,
                top: `${p.position.row * CELL_SIZE}px`,
                width: `${CELL_SIZE}px`,
                height: `${CELL_SIZE}px`,
                zIndex: "20",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                // Phase 5: Aura for Vest (visual indicator)
                ...(p.hasVest ? { filter: "drop-shadow(0 0 8px gold)" } : { filter: "drop-shadow(0px 2px 2px rgba(0,0,0,0.4))" })
            }
        }, [
            // Phase 6: Player Label + Powerup Emojis
            h("div", {
                style: {
                    position: "absolute", top: "-20px", fontSize: "14px", fontWeight: "bold", color: "#fff",
                    textShadow: "1px 1px 2px #000", zIndex: "30", whiteSpace: "nowrap"
                }
            }, `${p.label} ${statusEmojis}`),

            h("div", { style: { width: "6px", height: "6px", backgroundColor: accessoryColor, borderRadius: "50%", border: "1px solid #000", position: "absolute", top: "1px", zIndex: "25", left: isSide ? (isRight ? "10px" : "24px") : "17px" } }),
            h("div", {
                style: { width: "22px", height: "20px", backgroundColor: p.color, borderRadius: "6px 6px 8px 8px", border: "2px solid #000", position: "absolute", top: "5px", zIndex: "24", display: "flex", justifyContent: "center", alignItems: "center", transform: isRight && isSide ? "scaleX(-1)" : "none" }
            }, [
                !isBack ? h("div", { style: { width: isSide ? "10px" : "14px", height: "10px", backgroundColor: faceColor, borderRadius: "3px", border: "1px solid #000", position: "absolute", top: "5px", left: isSide ? "2px" : "auto" } }, [
                    h("div", { style: { width: "2px", height: "5px", backgroundColor: "#000", position: "absolute", top: "1px", left: "2px" } }),
                    !isSide ? h("div", { style: { width: "2px", height: "5px", backgroundColor: "#000", position: "absolute", top: "1px", right: "2px" } }) : null
                ]) : null
            ]),
            h("div", { style: { width: isSide ? "12px" : "16px", height: "11px", backgroundColor: p.subColor, border: "2px solid #000", borderRadius: "3px", position: "absolute", top: "23px", zIndex: "23", display: "flex", justifyContent: "center", alignItems: "center" } }, [
                h("div", { style: { width: "100%", height: "3px", backgroundColor: beltColor, marginTop: "4px" } })
            ]),
            h("div", { style: { width: "7px", height: "7px", backgroundColor: accessoryColor, borderRadius: "50%", border: "1px solid #000", position: "absolute", top: leftHandTop, left: isSide ? "14px" : "4px", zIndex: "26", display: (isSide && isRight) ? "none" : "block" } }),
            h("div", { style: { width: "7px", height: "7px", backgroundColor: accessoryColor, borderRadius: "50%", border: "1px solid #000", position: "absolute", top: rightHandTop, right: isSide ? "14px" : "4px", zIndex: "26", display: (isSide && !isRight) ? "none" : "block" } }),
            h("div", { style: { width: "8px", height: "6px", backgroundColor: accessoryColor, borderRadius: "3px", border: "1px solid #000", position: "absolute", top: leftFootTop, left: "8px", zIndex: "23", transition: "top 0.1s" } }),
            h("div", { style: { width: "8px", height: "6px", backgroundColor: accessoryColor, borderRadius: "3px", border: "1px solid #000", position: "absolute", top: rightFootTop, right: "8px", zIndex: "23", transition: "top 0.1s" } })
        ])
    })
}

const renderGameOver = (model: Model) => {
    return h("div", {
        style: {
            position: "absolute", top: "0", left: "0", width: "100%", height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.7)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
            zIndex: "100", color: "#fff", textShadow: "2px 2px #000"
        }
    }, [
        h("h2", { style: { fontSize: "40px", marginBottom: "20px" } }, "GAME OVER"),
        h("h3", { style: { fontSize: "24px", color: "#FFD700" } }, model.gameOverMessage)
    ])
}