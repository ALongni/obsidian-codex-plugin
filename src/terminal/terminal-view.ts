import path from "path";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { FileSystemAdapter, ItemView, Notice, WorkspaceLeaf } from "obsidian";
import type CodexTerminalPlugin from "../main";
import { TERMINAL_VIEW_NAME, TERMINAL_VIEW_TYPE } from "./constants";
import { TerminalSession } from "./terminal-session";

export class CodexTerminalView extends ItemView {
	private readonly plugin: CodexTerminalPlugin;
	private session: TerminalSession | null = null;
	private terminal: Terminal | null = null;
	private fitAddon: FitAddon | null = null;
	private terminalHostEl: HTMLDivElement | null = null;
	private resizeObserver: ResizeObserver | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: CodexTerminalPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return TERMINAL_VIEW_TYPE;
	}

	getDisplayText(): string {
		return TERMINAL_VIEW_NAME;
	}

	getIcon(): string {
		return "terminal";
	}

	async onOpen(): Promise<void> {
		this.contentEl.empty();
		this.contentEl.addClass("codex-terminal-view");

		const toolbarEl = this.contentEl.createDiv({ cls: "codex-terminal-toolbar" });
		const codexButton = toolbarEl.createEl("button", { text: "Run codex" });
		codexButton.addClass("mod-cta");
		codexButton.addEventListener("click", () => {
			this.session?.write("codex\r");
			this.terminal?.focus();
		});

		const restartButton = toolbarEl.createEl("button", { text: "Restart shell" });
		restartButton.addEventListener("click", () => {
			this.restartSession();
		});

		const clearButton = toolbarEl.createEl("button", { text: "Clear terminal" });
		clearButton.addEventListener("click", () => {
			this.terminal?.clear();
			this.terminal?.focus();
		});

		this.terminalHostEl = this.contentEl.createDiv({ cls: "codex-terminal-host" });
		this.initializeTerminal();
		this.startSession();
		this.terminal?.focus();
	}

	async onClose(): Promise<void> {
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.session?.stop();
		this.session = null;
		this.terminal?.dispose();
		this.terminal = null;
		this.fitAddon = null;
		this.terminalHostEl = null;
	}

	private initializeTerminal(): void {
		if (this.terminalHostEl === null) {
			return;
		}

		this.fitAddon = new FitAddon();
		this.terminal = new Terminal({
			cursorBlink: true,
			scrollback: 5000,
			fontFamily: "var(--font-monospace)",
			fontSize: 13,
			lineHeight: 1.3,
			theme: {
				background: "#000000",
				foreground: "#e6edf3",
				cursor: "#e6edf3",
				selectionBackground: "#264f78",
			},
		});
		this.terminal.loadAddon(this.fitAddon);
		this.terminal.open(this.terminalHostEl);
		this.fitAddon.fit();

		this.terminal.onData((data) => {
			this.session?.write(data);
		});

		this.resizeObserver = new ResizeObserver(() => {
			this.fitTerminal();
		});
		this.resizeObserver.observe(this.terminalHostEl);
	}

	private startSession(): void {
		const cwd = this.resolveStartupDirectory();
		const dims = this.getTerminalDimensions();
		this.session = new TerminalSession({
			bridgeScriptPath: this.resolveBridgeScriptPath(),
			shellPath: this.plugin.settings.shellPath,
			cwd,
			cols: dims.cols,
			rows: dims.rows,
			onOutput: (text) => this.terminal?.write(text),
			onExit: (code) => {
				this.terminal?.write(`\r\n[terminal] Shell exited${code === null ? "" : ` with code ${code}`}.\r\n`);
			},
		});

		try {
			this.session.start();
			this.terminal?.writeln(`[terminal] Shell started in ${cwd}`);
			this.fitTerminal();
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.terminal?.writeln(`[terminal] Failed to start shell: ${message}`);
			new Notice(`Terminal failed to start: ${message}`);
		}
	}

	private restartSession(): void {
		this.session?.stop();
		this.session = null;
		this.terminal?.reset();
		this.startSession();
		this.terminal?.focus();
	}

	private fitTerminal(): void {
		if (this.fitAddon === null || this.session === null) {
			return;
		}

		this.fitAddon.fit();
		const { cols, rows } = this.getTerminalDimensions();
		this.session.resize(cols, rows);
	}

	private getTerminalDimensions(): { cols: number; rows: number } {
		return {
			cols: Math.max(this.terminal?.cols ?? 120, 20),
			rows: Math.max(this.terminal?.rows ?? 30, 8),
		};
	}

	private resolveStartupDirectory(): string {
		if (this.plugin.settings.startupDirectory.length > 0) {
			return this.plugin.settings.startupDirectory;
		}

		const adapter = this.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			const activeFile = this.app.workspace.getActiveFile();
			const relativeDir = activeFile?.parent?.path ?? "";
			return path.join(adapter.getBasePath(), relativeDir);
		}

		return ".";
	}

	private resolveBridgeScriptPath(): string {
		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			throw new Error("File system adapter is required for the terminal view.");
		}

		return path.join(
			adapter.getBasePath(),
			this.app.vault.configDir,
			"plugins",
			this.plugin.manifest.id,
			"pty_bridge.py",
		);
	}
}
