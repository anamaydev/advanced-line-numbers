import {EditorView} from "@codemirror/view";
import {Extension} from "@codemirror/state";
import {LineNumbersSettings, LineNumberMode} from "./settings";

/*
* Canvas card editors render inside an <iframe> (own document), so closest() from the editor never
* reaches .canvas-node and styles from the main document do not apply to it. frameElement bridges
* that. The editor is created in the main document and moved into the iframe afterwards, so the very
* first render still reports false; editorAttributes re-runs on later updates and corrects it.
* Canvas has no public API and getActiveViewOfType only describes the focused leaf, so this relies on
* the undocumented .canvas-node class; if it is renamed, canvas cards fall back to the notes mode.
* */
export function isCanvasEditor(view: EditorView): boolean {
  const frame = view.dom.ownerDocument.defaultView?.frameElement;
  return (frame ?? view.dom).closest(".canvas-node") !== null;
}

export function resolveMode(settings: LineNumbersSettings, isCanvas: boolean): LineNumberMode {
  return isCanvas && settings.canvasMode === "off" ? "off" : settings.mode;
}

/*
* A gutter with no markers still reserves horizontal space, so editors whose resolved mode is "off"
* get a class that hides the gutter. The rule lives in an editor theme because it must be injected
* into the card's own document, which styles.css cannot reach.
* */
export const createGutterVisibility = (settings: LineNumbersSettings): Extension => [
  EditorView.editorAttributes.of((view): Record<string, string> =>
    resolveMode(settings, isCanvasEditor(view)) === "off" ? {class: "aln-gutter-hidden"} : {}
  ),
  EditorView.baseTheme({
    "&.aln-gutter-hidden .cm-lineNumbers": {display: "none"},
  }),
];
