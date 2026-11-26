# Garnet Runtime Review plugins

Each package includes the same three [skills](../skills/) and connects to the [Garnet MCP](https://api.garnet.ai/api/v2/mcp).

- **Claude Code:** From the `launch-kit` directory, run `claude --plugin-dir ./plugins/claude-code/garnet-runtime-review`.
- **Devin:** Use the [Devin plugin package](devin/garnet-runtime-review/) in your marketplace. The skills are also available as [standalone Markdown](../skills/).
- **Cursor:** Use the [Cursor plugin package](cursor/garnet-runtime-review/) with its bundled MCP configuration, or copy its [MCP configuration](cursor/garnet-runtime-review/mcp.json) to `.cursor/mcp.json` and copy the [skills](../skills/) into your workspace's `.cursor/skills/`.

See [Read runtime evidence](https://docs.garnet.ai/consume) for client setup and evidence checks.
