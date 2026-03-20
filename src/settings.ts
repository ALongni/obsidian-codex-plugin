import { App, PluginSettingTab, Setting } from "obsidian";
import CodexTerminalPlugin from "./main";

export interface CodexTerminalSettings {
	shellPath: string;
	startupDirectory: string;
}

export const DEFAULT_SETTINGS: CodexTerminalSettings = {
	shellPath: "/bin/bash",
	startupDirectory: "",
};

export class CodexTerminalSettingTab extends PluginSettingTab {
	plugin: CodexTerminalPlugin;

	constructor(app: App, plugin: CodexTerminalPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Embedded terminal" });

		new Setting(containerEl)
			.setName("Shell path")
			.setDesc("Executable used for the embedded command line session.")
			.addText((text) =>
				text
					.setPlaceholder("/bin/bash")
					.setValue(this.plugin.settings.shellPath)
					.onChange(async (value) => {
						this.plugin.settings.shellPath = value.trim() || DEFAULT_SETTINGS.shellPath;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Startup directory")
			.setDesc("Leave empty to use the current note folder, or the vault root when no note is active.")
			.addText((text) =>
				text
					.setPlaceholder("Current note folder")
					.setValue(this.plugin.settings.startupDirectory)
					.onChange(async (value) => {
						this.plugin.settings.startupDirectory = value.trim();
						await this.plugin.saveSettings();
					}),
			);
	}
}
