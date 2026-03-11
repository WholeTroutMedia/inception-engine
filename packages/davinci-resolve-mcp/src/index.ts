import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * @inception/davinci-resolve-mcp
 * 
 * This module exports the CLI configuration to run the Python-based
 * DaVinci Resolve MCP server. Since the Resolve API is primarily accessed
 * via Python (fusionscript/dvr_maclight), this TS facade simply acts as
 * the entry point for the MCP router to spawn the python process.
 */

export const mcpServer = {
  command: 'python',
  args: [join(__dirname, '..', 'server.py')],
  env: {
    ...process.env,
    PYTHONUNBUFFERED: '1'
  }
};

export default mcpServer;
