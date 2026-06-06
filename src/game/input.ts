import type { RawInput } from "./types"

export type InputTracker = {
  onKeyDown: (e: KeyboardEvent) => void
  onKeyUp: (e: KeyboardEvent) => void
  getSnapshot: () => RawInput
}

type KeyState = {
  down: Set<string>
  pressed: Set<string>
}

function normalizeKey(key: string) {
  return key.length === 1 ? key.toLowerCase() : key
}

export function createInputTracker(): InputTracker {
  const s: KeyState = {
    down: new Set(),
    pressed: new Set(),
  }

  function onKeyDown(e: KeyboardEvent) {
    const k = normalizeKey(e.key)
    if (!s.down.has(k)) s.pressed.add(k)
    s.down.add(k)
    if (k === " " || k === "ArrowUp" || k === "ArrowDown") e.preventDefault()
  }

  function onKeyUp(e: KeyboardEvent) {
    const k = normalizeKey(e.key)
    s.down.delete(k)
  }

  function takePressed(k: string) {
    if (s.pressed.has(k)) {
      s.pressed.delete(k)
      return true
    }
    return false
  }

  function getSnapshot(): RawInput {
    const has = (k: string) => s.down.has(k)
    return {
      p1Left: has("a"),
      p1Right: has("d"),
      p1Down: has("s"),
      p1JumpPressed: takePressed("w"),
      p1Attack: has("j"),
      p1Block: has("k"),
      p1SkillPressed: takePressed("l"),
      p2Left: has("ArrowLeft"),
      p2Right: has("ArrowRight"),
      p2Down: has("ArrowDown"),
      p2JumpPressed: takePressed("ArrowUp"),
      p2Attack: has("1") || has("u"),
      p2Block: has("2") || has("i"),
      p2SkillPressed: takePressed("3") || takePressed("o"),
      pausePressed: takePressed("Escape"),
      restartPressed: takePressed("r"),
    }
  }

  return { onKeyDown, onKeyUp, getSnapshot }
}
