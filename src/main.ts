import {MarkdownView, Plugin} from "obsidian";
import {ViewUpdate, ViewPlugin, EditorView, gutter, GutterMarker, BlockInfo} from "@codemirror/view";
import {StateField, EditorState, Transaction} from "@codemirror/state";

/* data representing the cursor's current position in the editor */
interface CursorData {
  lineNumber: number;
  columnNumber: number;
}

/* settings controlling which line number mode to display */
interface LineNumberSettings {
  mode: "absolute" | "relative" | "hybrid";
}

/* GutterMarker rendering a single line number in the gutter */
class LineNumberMarker extends GutterMarker {
  lineNumber: number;

  constructor(lineNumber: number) {
    super();
    this.lineNumber = lineNumber;
  }

  /* create the DOM element that displays the line number */
  toDOM(): HTMLElement {
    const div = document.createElement("div");
    div.textContent = this.lineNumber.toString();
    div.className = "cm-gutterElement";
    return div;
  }

  /* return true if the other marker has the same line number to skip re-rendering markers with the same line number */
  eq(other: GutterMarker): boolean {
    return other instanceof LineNumberMarker &&
      other.lineNumber === this.lineNumber;
  }
}

/* create a gutter extension that displays line numbers alongside the editor based on the given mode */
const createLineNumberGutter = (settings: LineNumberSettings) => gutter({
  class: "cm-lineNumbers",
  lineMarker(view: EditorView, line: BlockInfo) {
    /* get the 1-indexed absolute line number for the current line */
    const cursorPosition = view.state.field(cursorPositionField);
    const lineNumber = view.state.doc.lineAt(line.from).number;

    if (settings.mode === "relative") {
      return new LineNumberMarker(Math.abs(cursorPosition.lineNumber - lineNumber));
    }else if(settings.mode === "hybrid") {
      if(cursorPosition.lineNumber === lineNumber) return new LineNumberMarker(lineNumber);
      else return new LineNumberMarker(Math.abs(cursorPosition.lineNumber - lineNumber));
    }
    return new LineNumberMarker(lineNumber);
  },

  /* force the gutter to re-render whenever the cursor/selection changes */
  lineMarkerChange(update: ViewUpdate): boolean {
    return update.selectionSet;
  }
});

/* StateField that tracks the cursor's line and column across transactions */
const cursorPositionField = StateField.define<CursorData>({
  /* initialise from the editor's starting selection */
  create(state: EditorState): CursorData{
    const cursorPosition = state.selection.main.head;
    const cursorOffset = state.doc.lineAt(cursorPosition);

    const lineNumber = cursorOffset.number;                         /* 1-indexed in CodeMirror 6 */
    const columnNumber = cursorPosition - cursorOffset.from +1;     /* convert 0-indexed offset to 1-indexed column */

    return {lineNumber, columnNumber};
  },

  /* recalculate only when the selection has actually changed */
  update(value: CursorData, transaction: Transaction){
    if(!transaction.newSelection.eq(transaction.startState.selection)){
      const cursorPosition = transaction.newSelection.main.head;
      const cursorOffset = transaction.state.doc.lineAt(cursorPosition);

      const lineNumber = cursorOffset.number;
      const columnNumber = cursorPosition - cursorOffset.from +1;

      return {lineNumber, columnNumber};
    }

    return value;
  }
})

/* create a ViewPlugin that recalculates and displays the cursor's line and column on every editor update */
const createCursorPositionPlugin = (statusBarItemElement: HTMLElement) => {
  return ViewPlugin.define(() => ({
    update(update: ViewUpdate) {
      if(update.selectionSet) {
        const cursorPosition = update.state.field(cursorPositionField);
        statusBarItemElement.setText(`Ln ${cursorPosition.lineNumber}, Col ${cursorPosition.columnNumber}`);
      }
    },
    destroy() {}
  }))
}

/* register the cursor tracking field, status bar plugin, and custom gutter */
export default class LineNumbersPlugin extends Plugin {
  statusBarItemElement: HTMLElement;
  settings: LineNumberSettings;

  async onload(){
    /* create status bar item */
    this.statusBarItemElement = this.addStatusBarItem();
    this.settings = {mode : "hybrid"};

    /* register CodeMirror extensions for cursor tracking, status bar, and line gutter */
    this.registerEditorExtension([
      cursorPositionField,
      createCursorPositionPlugin(this.statusBarItemElement),
      createLineNumberGutter(this.settings)
    ]);

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
    }
  }
};