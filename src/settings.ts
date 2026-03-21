import { App, PluginSettingTab, Setting } from "obsidian";
import CodexTerminalPlugin from "./main";

export interface CodexTerminalSettings {
	shellPath: string;
	startupDirectory: string;
	httpProxy: string;
	httpsProxy: string;
	allProxy: string;
	noProxy: string;
}

export const DEFAULT_SETTINGS: CodexTerminalSettings = {
	shellPath: "/bin/bash",
	startupDirectory: "",
	httpProxy: "",
	httpsProxy: "",
	allProxy: "",
	noProxy: "",
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

		containerEl.createEl("h3", { text: "Proxy" });
		containerEl.createEl("p", {
			text: "These values are injected into the terminal session environment for tools like codex.",
		});

		this.addProxySetting(containerEl, "HTTP_PROXY", "httpProxy", "http://127.0.0.1:7890");
		this.addProxySetting(containerEl, "HTTPS_PROXY", "httpsProxy", "http://127.0.0.1:7890");
		this.addProxySetting(containerEl, "ALL_PROXY", "allProxy", "socks5://127.0.0.1:7890");
		this.addProxySetting(containerEl, "NO_PROXY", "noProxy", "localhost,127.0.0.1");
	}

	private addProxySetting(
		containerEl: HTMLElement,
		label: string,
		key: keyof Pick<CodexTerminalSettings, "httpProxy" | "httpsProxy" | "allProxy" | "noProxy">,
		placeholder: string,
	): void {
		new Setting(containerEl)
			.setName(label)
			.setDesc(`Optional environment variable passed to the terminal session as ${label} and ${label.toLowerCase()}.`)
			.addText((text) =>
				text
					.setPlaceholder(placeholder)
					.setValue(this.plugin.settings[key])
					.onChange(async (value) => {
						this.plugin.settings[key] = value.trim();
						await this.plugin.saveSettings();
					}),
			);
	}
}
