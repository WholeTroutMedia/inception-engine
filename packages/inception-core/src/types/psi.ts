// Peripheral Sovereign Identity (PSI) Types

export interface DeviceCapability {
    /** Abstract capability name, e.g., "primary_click", "scroll_up", "macro_1" */
    name: string;
    /** Raw HID input mapping, if known. e.g., [0x01, 0x00] */
    raw_input?: number[];
}

export interface StateMapping {
    /** The capability name this mapping applies to */
    capability: string;
    /** The action to execute, e.g., a keyboard macro, OS function, or custom script */
    action: {
        type: 'keyboard' | 'mouse' | 'os' | 'script';
        value: string;
    };
}

export interface AuraProfile {
    /** Unique ID for the Aura */
    id: string;
    /** Display name */
    name: string;
    /** Which device class this Aura applies to */
    device_class: 'mouse' | 'keyboard' | 'gamepad' | 'generic';
    /** Array of semantic capability mappings */
    mappings: StateMapping[];
    /** The user or role this Aura belongs to */
    owner: string;
    /** Last updated ISO string */
    updated_at: string;
}
