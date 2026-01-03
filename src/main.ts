import { startSimple } from "cs12251-mvu/src"
import { initModel } from "./game/model"
import { view } from "./game/view"
import { update } from "./game/update"
import { Array as EffectArray } from "effect"

const root = document.getElementById("app")!

let currentDispatch: ((msg: any) => void) | null = null

const wrappedView = (model: any, dispatch: (msg: any) => void) => {
    if (!currentDispatch) {
        currentDispatch = dispatch
        setupEventListeners()
    }
    return view(model, dispatch)
}

const setupEventListeners = () => {
    if (!currentDispatch) return

    const controlKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "a", "s", "d", "x", "Escape", "r", "R"]
    const releaseKeys = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "w", "a", "s", "d", "x"]

    document.addEventListener("keydown", (e) => {
        // Fix: Use EffectArray.contains to avoid native .includes()
        if (EffectArray.contains(controlKeys, e.key)) {
            e.preventDefault()
            currentDispatch?.({ _tag: "KeyDown", key: e.key })
        }
    })

    document.addEventListener("keyup", (e) => {
        // Fix: Use EffectArray.contains to avoid native .includes()
        if (EffectArray.contains(releaseKeys, e.key)) {
            e.preventDefault()
            currentDispatch?.({ _tag: "KeyUp", key: e.key })
        }
    })

    setInterval(() => {
        currentDispatch?.({ _tag: "Tick" })
    }, 1000 / 30)
}

startSimple(root, initModel, update, wrappedView)