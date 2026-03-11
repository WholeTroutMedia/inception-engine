#!/usr/bin/env node
import { Command } from 'commander';
import { input } from '@inquirer/prompts';
import chalk from 'chalk';
import fetch from 'node-fetch';

import { randomUUID } from 'crypto';

const GENKIT_URL = process.env.GENKIT_URL || 'http://127.0.0.1:4100';

const program = new Command();

program
  .name('ie')
  .description('IE Terminal: AI-Native CLI + REPL for Creative Liberation Engine')
  .version('1.0.0');

const sessionId = randomUUID();

async function askAveri(query: string) {
  try {
    const response = await fetch(`${GENKIT_URL}/conversational`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: query, sessionId })
    });

    if (!response.ok) {
        throw new Error(`Engine returned ${response.status}`);
    }

    const json = await response.json() as any;
    const reply = json.result || json.text || json.reply || JSON.stringify(json);
    console.log(`\n${chalk.cyan('AVERI')} > ${reply}\n`);
  } catch (err: any) {
    console.log(`\n${chalk.red('ERROR')} > Failed to reach Creative Liberation Engine at ${GENKIT_URL}`);
    console.log(chalk.gray(err.message), '\n');
  }
}

async function startRepl() {
  console.log(chalk.bold.cyan('âš¡ Creative Liberation Engine Terminal (AVERI)\n'));
  console.log(chalk.gray(`Connected to: ${GENKIT_URL} | Session: ${sessionId.split('-')[0]}`));
  console.log(chalk.gray('Type "exit" or "quit" to leave.\n'));

  while (true) {
    const query = await input({ message: chalk.yellow('â¯') });
    
    if (query.toLowerCase() === 'exit' || query.toLowerCase() === 'quit') {
      console.log(chalk.gray('Disconnecting...'));
      break;
    }
    
    if (!query.trim()) continue;

    await askAveri(query);
  }
}

program
  .command('repl')
  .description('Start the interactive AVERI REPL')
  .action(() => {
    startRepl();
  });

program
  .command('ask <query...>')
  .description('Ask AVERI a single question and exit')
  .action(async (queryArgs) => {
    const query = queryArgs.join(' ');
    await askAveri(query);
  });

program
  .command('zero-day [action]')
  .description('Interact with Zero-Day GTM operations')
  .action(async (action) => {
    const ZD_URL = process.env.ZERO_DAY_URL || 'http://127.0.0.1:4000';
    if (action === 'dashboard') {
        try {
            const res = await fetch(`${ZD_URL}/analytics/studio`);
            if (!res.ok) throw new Error('Failed to fetch dashboard');
            const data = await res.json() as any;
            console.log(chalk.bold.green('\nðŸ’° ZERO-DAY GTM STUDIO DASHBOARD'));
            console.log(chalk.white(`Total Pipeline Revenue: $${data.studio_revenue_pipeline.toLocaleString()}`));
            console.log(chalk.white(`Total Cost: $${data.studio_total_cost.toLocaleString()}`));
            console.log(chalk.cyan(`Gross Profit: $${data.studio_gross_profit.toLocaleString()} (${data.studio_avg_margin_pct}%)`));
            console.log(chalk.gray(`Tracking ${data.total_projects_tracked} projects (${data.underwater_count} underwater)\n`));
        } catch(err: any) {
            console.log(chalk.red(`Failed to reach Zero-Day engine: ${err.message}`));
        }
    } else {
        console.log(chalk.yellow('Supported actions: dashboard'));
    }
  });

program.parse(process.argv);

// Default to REPL if no args
if (!process.argv.slice(2).length) {
  startRepl();
}
