import * as fs from 'fs';
import * as path from 'path';

function countAgents() {
    console.log(`\n======================================================`);
    console.log(`📡 [AGENT AUDIT] Scanning dynamic hives for AgentRegistry.register`);
    console.log(`======================================================\n`);

    const hivesDir = path.join(process.cwd(), 'hives');
    const hives = fs.readdirSync(hivesDir);
    let totalAgents = 0;

    for (const hive of hives) {
        const hivePath = path.join(hivesDir, hive);
        if (!fs.statSync(hivePath).isDirectory()) continue;

        const indexPath = path.join(hivePath, 'index.ts');
        if (!fs.existsSync(indexPath)) continue;

        const content = fs.readFileSync(indexPath, 'utf-8');
        const matches = content.match(/AgentRegistry\.register\((.*?)\)/g);
        
        if (matches) {
            console.log(`--- Hive: ${hive.toUpperCase()} [${matches.length}] ---`);
            for (const match of matches) {
                const agentName = match.match(/AgentRegistry\.register\((.*?)\)/)?.[1];
                console.log(`  🟢 ${agentName?.padEnd(20)}`);
            }
            totalAgents += matches.length;
        } else {
             console.log(`--- Hive: ${hive.toUpperCase()} [0] ---`);
        }
    }

    console.log(`\n🎯 TOTAL COUNT: ${totalAgents} / 40+\n`);
    if (totalAgents >= 40) {
        console.log(`✅ Success! We have reached exactly 40 or more agents.\n`);
    } else {
        console.log(`⚠️ Warning! Short of 40 agents.\n`);
    }
}

countAgents();
