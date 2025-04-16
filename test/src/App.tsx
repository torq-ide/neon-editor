import "./index.css"
import { NeonEditor } from "../../dist/index"
import { createEffect } from "solid-js"

function App() {
  createEffect(() => {
    const element = document.querySelector(".editor") as HTMLElement | null
    if (!element) return

    const editor = new NeonEditor(element, {})
    editor.focus()
  })
  return <div class="editor"></div>
}

export default App
