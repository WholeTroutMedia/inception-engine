import { HiddenDeviceManager } from './hidManager.js';

console.log('====================================');
console.log('  Peripheral Sovereign Identity    ');
console.log('  Daemon Init v1.0.0               ');
console.log('====================================');

const manager = new HiddenDeviceManager();
manager.start();

// Keep process alive
process.stdin.resume();

process.on('SIGINT', () => {
    console.log('\n[PSI] Shutting down daemon.');
    process.exit(0);
});
