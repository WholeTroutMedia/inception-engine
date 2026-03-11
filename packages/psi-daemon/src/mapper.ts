import type { AuraProfile } from '@inception/core';

export function applyMappings(rawInput: number[], aura: AuraProfile) {
    // This is the semantic mapping engine.
    // It takes the raw buffer array from the HID event and translates it
    // based on the device's semantic capabilities mapped to the Aura actions.
    
    // Example: For a standard 5-button mouse, byte 0 often represents button states
    const buttonState = rawInput[0];
    
    // Naive decoding for dev testing (assumes side buttons map to 0x08 and 0x10)
    let triggeredCapability = null;
    if (buttonState === 0x08) triggeredCapability = 'side_button_1';
    if (buttonState === 0x10) triggeredCapability = 'side_button_2';
    
    if (triggeredCapability) {
        const mapping = aura.mappings.find(m => m.capability === triggeredCapability);
        if (mapping) {
            executeAction(mapping.action);
        }
    }
}

function executeAction(action: { type: string, value: string }) {
    console.log(`[PSI] Executing semantic action: [${action.type}] ${action.value}`);
    // Here we would tie into `robotjs` or `nut.js` to actually fire the OS event
    // For the initial daemon shell, we just log it to verify latency and hookup
}
