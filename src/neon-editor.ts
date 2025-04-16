import { Rope } from "./rope"

type NeonEditorOptions = {
  initialText?: string
}

type Selection = { start: number; end: number }

export class NeonEditor {
  private rope: Rope
  private container: HTMLElement
  private cursorPos: number
  private selection: Selection
  private isFocused: boolean
  private blinkInterval?: number
  private lastRenderText: string = ""

  constructor(container: HTMLElement, options: NeonEditorOptions = {}) {
    if (!container) throw new Error("Container element required")
    this.container = container
    this.rope = new Rope(options.initialText || "")
    this.cursorPos = 0
    this.selection = { start: 0, end: 0 }
    this.isFocused = false

    this.setupDOM()
    this.render()
    this.attachEvents()
  }

  private setupDOM() {
    this.container.tabIndex = 0 // Make editable by keyboard
    this.container.classList.add("neon-editor")
    this.container.style.whiteSpace = "pre-wrap"
    this.container.style.outline = "none"
    this.container.style.cursor = "text"
    this.container.style.userSelect = "none"
    this.container.style.fontFamily = "monospace"
    this.container.style.minHeight = "1em"
    this.container.setAttribute("spellcheck", "false")
  }

  private attachEvents() {
    this.container.addEventListener("keydown", this.handleKeyDown)
    this.container.addEventListener("mousedown", this.handleMouseDown)
    this.container.addEventListener("mousemove", this.handleMouseMove)
    this.container.addEventListener("mouseup", this.handleMouseUp)
    this.container.addEventListener("blur", this.handleBlur)
    this.container.addEventListener("focus", this.handleFocus)
  }

  private detachEvents() {
    this.container.removeEventListener("keydown", this.handleKeyDown)
    this.container.removeEventListener("mousedown", this.handleMouseDown)
    this.container.removeEventListener("mousemove", this.handleMouseMove)
    this.container.removeEventListener("mouseup", this.handleMouseUp)
    this.container.removeEventListener("blur", this.handleBlur)
    this.container.removeEventListener("focus", this.handleFocus)
  }

  destroy() {
    this.detachEvents()
    if (this.blinkInterval) clearInterval(this.blinkInterval)
    this.container.innerHTML = ""
  }

  // --- Event Handlers ---

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.isFocused) return
    if (e.key === "ArrowLeft") {
      this.moveCursor(-1, e.shiftKey)
      e.preventDefault()
    } else if (e.key === "ArrowRight") {
      this.moveCursor(1, e.shiftKey)
      e.preventDefault()
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      this.moveCursorVertically(e.key === "ArrowUp" ? -1 : 1, e.shiftKey)
      e.preventDefault()
    } else if (e.key === "Backspace") {
      this.handleBackspace()
      e.preventDefault()
    } else if (e.key === "Delete") {
      this.handleDelete()
      e.preventDefault()
    } else if (e.key === "Enter") {
      this.insertText("\n")
      e.preventDefault()
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this.insertText(e.key)
      e.preventDefault()
    } else if (e.key === "a" && (e.ctrlKey || e.metaKey)) {
      this.selectAll()
      e.preventDefault()
    } else if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
      this.copyToClipboard()
      e.preventDefault()
    } else if (e.key === "x" && (e.ctrlKey || e.metaKey)) {
      this.copyToClipboard()
      this.deleteSelection()
      e.preventDefault()
    } else if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
      // Paste
      navigator.clipboard.readText().then((text) => {
        this.insertText(text)
      })
      e.preventDefault()
    }
  }

  private handleMouseDown = (e: MouseEvent) => {
    const pos = this.getMouseCharIndex(e)
    this.cursorPos = pos
    this.selection = { start: pos, end: pos }
    this.isSelecting = true
    this.render()
    this.container.focus()
    // e.preventDefault()
  }
  private isSelecting = false

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isSelecting) return
    const pos = this.getMouseCharIndex(e)
    this.selection.end = pos
    this.cursorPos = pos
    this.render()
    e.preventDefault()
  }

  private handleMouseUp = (e: MouseEvent) => {
    if (this.isSelecting) {
      this.isSelecting = false
      this.render()
      e.preventDefault()
    }
  }

  private handleBlur = (_e: FocusEvent) => {
    this.isFocused = false
    if (this.blinkInterval) clearInterval(this.blinkInterval)
    this.render()
  }

  private handleFocus = (_e: FocusEvent) => {
    this.isFocused = true
    this.startCursorBlink()
    this.render()
  }

  // --- Core Logic ---

  private moveCursor(offset: number, shift: boolean) {
    const len = this.rope.length
    const origCursor = this.cursorPos
    let newCursor = origCursor + offset
    if (newCursor < 0) newCursor = 0
    if (newCursor > len) newCursor = len
    this.cursorPos = newCursor
    if (shift) {
      if (
        this.selection.start === origCursor &&
        this.selection.end === origCursor
      ) {
        this.selection.end = newCursor
      } else {
        if (this.selection.end === origCursor) {
          this.selection.end = newCursor
        } else {
          this.selection.start = newCursor
        }
      }
    } else {
      this.selection = { start: newCursor, end: newCursor }
    }
    this.render()
  }

  private moveCursorVertically(dir: -1 | 1, shift: boolean) {
    // For simplicity: Move to prev/next line at same column, or end of that line.
    const text = this.rope.toString()
    const lines = text.split("\n")
    let lineIdx = 0,
      colIdx = 0,
      pos = 0
    for (let i = 0, p = 0; i < lines.length; ++i) {
      if (this.cursorPos >= p && this.cursorPos <= p + lines[i].length) {
        lineIdx = i
        colIdx = this.cursorPos - p
        pos = p
        break
      }
      p += lines[i].length + 1
    }
    let newLine = lineIdx + dir
    if (newLine < 0) newLine = 0
    if (newLine >= lines.length) newLine = lines.length - 1
    const newCol = Math.min(colIdx, lines[newLine].length)
    let newPos = 0
    for (let i = 0; i < newLine; ++i) newPos += lines[i].length + 1
    newPos += newCol
    this.moveCursor(newPos - this.cursorPos, shift)
  }

  private handleBackspace() {
    if (this.hasSelection()) {
      this.deleteSelection()
    } else if (this.cursorPos > 0) {
      this.rope = this.rope.delete(this.cursorPos - 1, this.cursorPos)
      this.cursorPos--
      this.selection = { start: this.cursorPos, end: this.cursorPos }
      this.render()
    }
  }

  private handleDelete() {
    if (this.hasSelection()) {
      this.deleteSelection()
    } else if (this.cursorPos < this.rope.length) {
      this.rope = this.rope.delete(this.cursorPos, this.cursorPos + 1)
      this.selection = { start: this.cursorPos, end: this.cursorPos }
      this.render()
    }
  }

  private insertText(text: string) {
    this.deleteSelection()
    this.rope = this.rope.insert(this.cursorPos, text)
    this.cursorPos += text.length
    this.selection = { start: this.cursorPos, end: this.cursorPos }
    this.render()
  }

  private deleteSelection() {
    if (!this.hasSelection()) return
    const [start, end] = this.getSelectionRange()
    this.rope = this.rope.delete(start, end)
    this.cursorPos = start
    this.selection = { start, end: start }
    this.render()
  }

  private selectAll() {
    this.selection = { start: 0, end: this.rope.length }
    this.cursorPos = this.rope.length
    this.render()
  }

  private hasSelection() {
    return this.selection.start !== this.selection.end
  }

  private getSelectionRange(): [number, number] {
    return [
      Math.min(this.selection.start, this.selection.end),
      Math.max(this.selection.start, this.selection.end),
    ]
  }

  // --- Clipboard (basic, no formatting) ---

  private copyToClipboard() {
    if (!this.hasSelection()) return
    const [start, end] = this.getSelectionRange()
    const text = this.rope.substring(start, end)
    navigator.clipboard.writeText(text)
  }

  // --- Rendering ---

  private render() {
    const text = this.rope.toString()
    const [selStart, selEnd] = this.getSelectionRange()
    let html = ""
    for (let i = 0; i <= text.length; ++i) {
      let ch = text[i] || ""
      if (i === selStart && i !== selEnd) {
        html += `<span class="neon-selection">`
      }
      if (i === this.cursorPos && this.isFocused && !this.isCursorHidden) {
        html += `<span class="neon-cursor"></span>`
      }
      if (i >= selStart && i < selEnd) {
        html += ch
        if (i + 1 === selEnd) html += `</span>`
      } else {
        html += ch
      }
    }
    this.container.innerHTML = html
    this.lastRenderText = text
  }

  private isCursorHidden = false

  private startCursorBlink() {
    if (this.blinkInterval) clearInterval(this.blinkInterval)
    this.isCursorHidden = false
    this.blinkInterval = window.setInterval(() => {
      this.isCursorHidden = !this.isCursorHidden
      this.render()
    }, 500)
  }

  // --- Mouse to Char Index Mapping ---

  private getMouseCharIndex(e: MouseEvent): number {
    // Simple: map click X/Y to text index by measuring char width/line height.
    // For simplicity, measure using monospace font and only support plain text.
    const rect = this.container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const lineHeight = this.getLineHeight()
    const charWidth = this.getCharWidth()
    const text = this.rope.toString()
    const lines = text.split("\n")
    let row = Math.floor(y / lineHeight)
    if (row < 0) row = 0
    if (row >= lines.length) row = lines.length - 1
    let col = Math.round(x / charWidth)
    if (col < 0) col = 0
    if (col > lines[row].length) col = lines[row].length
    let idx = 0
    for (let i = 0; i < row; ++i) idx += lines[i].length + 1
    idx += col
    if (idx > text.length) idx = text.length
    return idx
  }

  private getLineHeight(): number {
    // Measure using a temporary span
    const span = document.createElement("span")
    span.style.visibility = "hidden"
    span.style.fontFamily = "monospace"
    span.textContent = "A"
    this.container.appendChild(span)
    const height = span.getBoundingClientRect().height
    this.container.removeChild(span)
    return height || 16
  }

  private getCharWidth(): number {
    const span = document.createElement("span")
    span.style.visibility = "hidden"
    span.style.fontFamily = "monospace"
    span.textContent = "A"
    this.container.appendChild(span)
    const width = span.getBoundingClientRect().width
    this.container.removeChild(span)
    return width || 8
  }

  // --- API methods ---

  public getText(): string {
    return this.rope.toString()
  }

  public setText(text: string) {
    this.rope = new Rope(text)
    this.cursorPos = 0
    this.selection = { start: 0, end: 0 }
    this.render()
  }

  public focus() {
    this.container.focus()
  }
}

// --- CSS for NeonEditor ---
// Add this to your CSS:
//
// .neon-editor { background: #181825; color: #cdd6f4; padding: 8px; border-radius: 4px; }
// .neon-editor .neon-cursor { display:inline-block; width:1px; background:#f5e0dc; height:1em; vertical-align:bottom; animation:neonblink 1s steps(1) infinite; }
// .neon-editor .neon-selection { background: #45475a; color: #f5c2e7; }
// @keyframes neonblink { 0%,100%{ opacity:1; } 50%{ opacity:0; } }
//
