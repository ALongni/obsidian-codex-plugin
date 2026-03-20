# Codex Terminal

Codex Terminal is an Obsidian desktop plugin that opens a split terminal pane inside your vault.
It is designed to run interactive CLI tools, including `codex`, without leaving Obsidian.

## Features

- Open a terminal pane from the ribbon or command palette.
- Launch the terminal in the current note folder by default.
- Start `codex` directly from the terminal toolbar.
- Resize the pane and keep the terminal session interactive.
- Override the shell path or startup directory in plugin settings.

## Requirements

- Obsidian desktop.
- `python3` available in your system `PATH`.
- A shell such as `/bin/bash`.
- `codex` installed and available in `PATH` if you want to run it from the terminal.

## Install

### Manual install

1. Build the plugin:

```bash
npm install
npm run build
```

2. Copy these files into your vault plugin folder:

```text
<Vault>/.obsidian/plugins/obsidian-codex-plugin/
```

Files to copy:

- `main.js`
- `manifest.json`
- `styles.css`
- `pty_bridge.py`

3. Open Obsidian.
4. Go to **Settings → Community plugins**.
5. Enable **Codex Terminal**.

### Local development install

1. Put this repository at:

```text
<Vault>/.obsidian/plugins/obsidian-codex-plugin/
```

2. Install dependencies:

```bash
npm install
```

3. Start watch mode:

```bash
npm run dev
```

4. Reload Obsidian after code changes.

## Usage

### Open the terminal

Use either of these entry points:

- Click the terminal icon in the left ribbon.
- Run **Open terminal pane** from the command palette.

The plugin opens a split pane and starts the terminal in this order:

1. The custom startup directory from plugin settings, if set.
2. The folder of the current active note.
3. The vault root if there is no active note.

### Run codex

Inside the terminal pane you can:

- Click **Run codex** to execute `codex` immediately.
- Type commands directly into the terminal.
- Click **Restart shell** to start a fresh session.
- Click **Clear terminal** to clear visible output.

### Configure the plugin

Open **Settings → Community plugins → Codex Terminal**.

Available settings:

- `Shell path`: the shell executable used to create the terminal session.
- `Startup directory`: optional fixed working directory. Leave empty to follow the current note folder.

## Notes

- This plugin is desktop-only.
- Interactive terminal programs depend on tools installed on your machine.
- If `codex` is not found, install it first and make sure Obsidian can see it in `PATH`.

## Development

```bash
npm install
npm run build
```

For continuous rebuilds:

```bash
npm run dev
```
