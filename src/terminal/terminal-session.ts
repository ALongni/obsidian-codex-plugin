import { spawn, type ChildProcessWithoutNullStreams } from "child_process";

export interface TerminalSessionOptions {
	bridgeScriptPath: string;
	shellPath: string;
	cwd: string;
	cols: number;
	rows: number;
	environment?: Record<string, string>;
	onOutput: (text: string) => void;
	onExit: (code: number | null) => void;
}

interface BridgeMessage {
	type: "output" | "exit";
	data?: string;
	code?: number | null;
}

export class TerminalSession {
	private process: ChildProcessWithoutNullStreams | null = null;
	private readonly options: TerminalSessionOptions;
	private stdoutBuffer = "";
	private shutdownTimer: number | null = null;

	constructor(options: TerminalSessionOptions) {
		this.options = options;
	}

	start(): void {
		if (this.process !== null) {
			return;
		}

		this.process = spawn(
			"python3",
			[
				this.options.bridgeScriptPath,
				this.options.shellPath,
				this.options.cwd,
				String(this.options.cols),
				String(this.options.rows),
			],
			{
				stdio: "pipe",
				env: {
					...process.env,
					...(this.options.environment ?? {}),
				},
			},
		);

		this.process.stdout.setEncoding("utf8");
		this.process.stderr.setEncoding("utf8");
		this.process.stdout.on("data", this.handleStdout);
		this.process.stderr.on("data", this.handleStderr);
		this.process.on("error", this.handleError);
		this.process.on("close", this.handleClose);
	}

	stop(): void {
		if (this.process === null) {
			return;
		}

		this.sendMessage({ type: "shutdown" });
		this.shutdownTimer = window.setTimeout(() => {
			this.process?.kill();
		}, 1000);
	}

	write(data: string): void {
		this.sendMessage({
			type: "input",
			data: Buffer.from(data, "utf8").toString("base64"),
		});
	}

	resize(cols: number, rows: number): void {
		this.sendMessage({ type: "resize", cols, rows });
	}

	private sendMessage(message: Record<string, unknown>): void {
		if (this.process === null) {
			return;
		}

		this.process.stdin.write(`${JSON.stringify(message)}\n`);
	}

	private readonly handleStdout = (chunk: string): void => {
		this.stdoutBuffer += chunk;
		let newlineIndex = this.stdoutBuffer.indexOf("\n");
		while (newlineIndex >= 0) {
			const line = this.stdoutBuffer.slice(0, newlineIndex);
			this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
			this.processBridgeLine(line);
			newlineIndex = this.stdoutBuffer.indexOf("\n");
		}
	};

	private readonly handleStderr = (chunk: string): void => {
		this.options.onOutput(chunk);
	};

	private readonly handleError = (error: Error): void => {
		this.options.onOutput(`\r\n[terminal] ${error.message}\r\n`);
	};

	private readonly handleClose = (code: number | null): void => {
		if (this.shutdownTimer !== null) {
			window.clearTimeout(this.shutdownTimer);
			this.shutdownTimer = null;
		}

		if (this.process !== null) {
			this.process.stdout.off("data", this.handleStdout);
			this.process.stderr.off("data", this.handleStderr);
			this.process.off("error", this.handleError);
			this.process.off("close", this.handleClose);
		}

		this.process = null;
		this.stdoutBuffer = "";
		this.options.onExit(code);
	};

	private processBridgeLine(line: string): void {
		if (line.trim().length === 0) {
			return;
		}

		let message: BridgeMessage;
		try {
			message = JSON.parse(line) as BridgeMessage;
		} catch {
			this.options.onOutput(line);
			return;
		}

		if (message.type === "output" && typeof message.data === "string") {
			this.options.onOutput(Buffer.from(message.data, "base64").toString("utf8"));
		}
	}
}
