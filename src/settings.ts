import {App, PluginSettingTab, Setting, SettingDefinitionItem} from "obsidian";
import LineNumbersPlugin from "./main";

/* defines the shape of the plugin's settings object */
export interface LineNumbersSettings {
	mode: "absolute" | "relative" | "hybrid" | "off";
	showCursorPositionInStatusBar: boolean;
	showActiveLineHighlight: boolean;
}

/* default settings  */
export const DEFAULT_SETTINGS: LineNumbersSettings = {
	mode: "hybrid",
	showCursorPositionInStatusBar: true,
	showActiveLineHighlight: true,
}

/* setting tab displayed in Obsidian's plugin settings panel */
export class LineNumbersSettingTab extends PluginSettingTab {
	/* reference to the main plugin instance */
	plugin: LineNumbersPlugin;

	/* initializes the setting tab with the app and plugin instances */
	constructor(app: App, plugin: LineNumbersPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/* declarative settings definitions, used by Obsidian 1.13.0+ for rendering and settings search */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Line numbering mode",
				desc: "Choose how line numbers are shown in the editor: absolute, relative to the cursor, hybrid, or off (hidden in the editor, still available in the status bar).",
				control: {
					type: "dropdown",
					key: "mode",
					defaultValue: DEFAULT_SETTINGS.mode,
					options: {
						absolute: "Absolute",
						relative: "Relative",
						hybrid: "Hybrid",
						off: "Off",
					},
				},
			},
			{
				name: "Show cursor position in status bar",
				desc: "Display the current cursor line and column position in the status bar.",
				control: {
					type: "toggle",
					key: "showCursorPositionInStatusBar",
					defaultValue: DEFAULT_SETTINGS.showCursorPositionInStatusBar,
				},
			},
			{
				name: "Highlight active line",
				desc: "Highlight the line the cursor is on in the editor. Turn this off if your theme already provides its own active line highlight.",
				control: {
					type: "toggle",
					key: "showActiveLineHighlight",
					defaultValue: DEFAULT_SETTINGS.showActiveLineHighlight,
				},
			},
		];
	}

	/* reads the current value for a control key from the plugin's settings */
	getControlValue(key: string): unknown {
		return (this.plugin.settings as unknown as Record<string, unknown>)[key];
	}

	/* persists a control's new value and triggers the side effects the imperative onChange handlers used to run */
	async setControlValue(key: string, value: unknown): Promise<void> {
		(this.plugin.settings as unknown as Record<string, unknown>)[key] = value;
		await this.plugin.saveSettings();

		if (key === "mode" || key === "showActiveLineHighlight") {
			this.plugin.refreshExtensions();
		} else if (key === "showCursorPositionInStatusBar") {
			this.plugin.updateStatusBarVisibility();
		}
	}

	/* renders the settings UI into the settings panel container; fallback for Obsidian versions older than 1.13.0 */
	display(): void {
		const {containerEl} = this;

		containerEl.empty();
		/* dropdown setting for selecting the line numbering mode */
		new Setting(containerEl)
			.setName("Line numbering mode")
			.setDesc("Choose how line numbers are shown in the editor: absolute, relative to the cursor, hybrid, or off (hidden in the editor, still available in the status bar).")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("absolute", "Absolute")
					.addOption("relative", "Relative")
					.addOption("hybrid", "Hybrid")
					.addOption("off", "Off")
					.setValue(this.plugin.settings.mode)
					/* persists the selected mode to settings on change */
					.onChange((value) => {
						this.plugin.settings.mode = value as "absolute" | "relative" | "hybrid" | "off";
						void this.plugin.saveSettings();

						/*
						* notify the editor that extensions need rebuilding
						* so the gutter immediately reflects the new line number mode
						* */
						this.plugin.refreshExtensions();
					})
			);

		/* toggle setting for showing cursor position in the status bar */
		new Setting(containerEl)
			.setName("Show cursor position in status bar")
			.setDesc("Display the current cursor line and column position in the status bar.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showCursorPositionInStatusBar)
					/* persists the toggle state to settings on change */
					.onChange((value) => {
						this.plugin.settings.showCursorPositionInStatusBar = value;
						void this.plugin.saveSettings();
						this.plugin.updateStatusBarVisibility();
					})
			);

		/* toggle setting for highlighting the cursor's active line in the editor */
		new Setting(containerEl)
			.setName("Highlight active line")
			.setDesc("Highlight the line the cursor is on in the editor. Turn this off if your theme already provides its own active line highlight.")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.showActiveLineHighlight)
					/* persists the toggle state to settings on change */
					.onChange((value) => {
						this.plugin.settings.showActiveLineHighlight = value;
						void this.plugin.saveSettings();
						this.plugin.refreshExtensions();
					})
			);
	}
}
