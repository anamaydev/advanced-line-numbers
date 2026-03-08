import {MarkdownView, Plugin} from "obsidian";
import {ViewUpdate, ViewPlugin, EditorView, gutter, GutterMarker, BlockInfo} from "@codemirror/view";

/* GutterMarker rendering a single line number in the gutter */
class LineNumberMarker extends GutterMarker {
  number:number;

  constructor(number:number) {
    super();
    this.number = number;
  }

  /* create the DOM element that displays the line number */
  toDOM(): HTMLElement {
    const div = document.createElement("div");
    div.textContent = this.number.toString();
    div.className = "cm-gutterElement";
    return div;
  }

  /* return true if the other marker has the same line number to skip re-rendering markers with the same line number */
  eq(other: GutterMarker): boolean {
    return other instanceof LineNumberMarker &&
      other.number === this.number;
  }
}

/* create a gutter extension that displays absolute line numbers alongside the editor */
const createLineNumberGutter = () => gutter({
  class: "cm-lineNumbers",
  lineMarker(view: EditorView, line: BlockInfo) {
    /* get the 1-indexed absolute line number for the current line */
    const lineNumber = view.state.doc.lineAt(line.from).number;
    return new LineNumberMarker(lineNumber);
  }
});

/* create a ViewPlugin that recalculates and displays the cursor's line and column on every editor update */
const createCursorPositionPlugin = (statusBarItemElement: HTMLElement) => {
  return ViewPlugin.define(() => ({
    update(update: ViewUpdate) {
      /* get the cursor's absolute character offset in the document */
      const cursorPosition = update.state.selection.main.head;

      /* get the line number and line start offset */
      const cursorOffset = update.state.doc.lineAt(cursorPosition);

      const lineNumber = cursorOffset.number;                         /* 1-indexed in CodeMirror 6 */
      const columnNumber = cursorPosition - cursorOffset.from +1;     /* convert 0-indexed offset to 1-indexed column */

      statusBarItemElement.setText(`Ln ${lineNumber}, Col ${columnNumber}`);
    },
    destroy() {
      console.log("destroy");
    }
  }));
};

export default class LineNumbersPlugin extends Plugin {
  statusBarItemElement: HTMLElement;

  async onload() {
    /* create status bar item */
    this.statusBarItemElement = this.addStatusBarItem();

    /* register a CodeMirror ViewPlugin to track and display cursor position */
    const cursorPlugin = createCursorPositionPlugin(this.statusBarItemElement);
    this.registerEditorExtension(cursorPlugin);

    /* register a CodeMirror GutterMarker to add line number */
    this.registerEditorExtension(createLineNumberGutter());

    /* hide/show the status bar item depending on whether the active leaf is a Markdown file */
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        if(!leaf || leaf.view.getViewType() !== "markdown")
          this.statusBarItemElement.style.display = "none";
        else
          this.statusBarItemElement.style.display = "block";
      })
    )

    /* set the initial cursor position when the plugin loads, if a Markdown file is already open */
    const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
    if(markdownView){
      const cursor = markdownView.editor.getCursor();
      this.statusBarItemElement.setText(`Ln ${cursor.line + 1}, Col ${cursor.ch + 1}`);
      console.log("Line", cursor.line + 1);
      console.log("Col", cursor.ch + 1);
    }
  }
};