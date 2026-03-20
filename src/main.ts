import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, CodexTerminalSettingTab, type CodexTerminalSettings } from "./settings";
import { TERMINAL_VIEW_TYPE } from "./terminal/constants";
import { CodexTerminalView } from "./terminal/terminal-view";

export default class CodexTerminalPlugin extends Plugin {
	settings: CodexTerminalSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.registerView(
			TERMINAL_VIEW_TYPE,
			(leaf) => new CodexTerminalView(leaf, this),
		);

		this.addRibbonIcon("terminal", "Open terminal pane", async () => {
			await this.activateTerminalView();
		});

		this.addCommand({
			id: "open-terminal-pane",
			name: "Open terminal pane",
			callback: async () => {
				await this.activateTerminalView();
			},
		});

		this.addSettingTab(new CodexTerminalSettingTab(this.app, this));
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(TERMINAL_VIEW_TYPE);
	}

	async activateTerminalView(): Promise<void> {
		const leaf = this.app.workspace.getLeaf("split");
		await leaf.setViewState({
			type: TERMINAL_VIEW_TYPE,
			active: true,
		});
		this.app.workspace.revealLeaf(leaf);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData() as Partial<CodexTerminalSettings>,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
