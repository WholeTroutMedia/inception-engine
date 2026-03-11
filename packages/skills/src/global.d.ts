declare module 'fs' {
  export function readFileSync(path: string, options?: any): string;
  export function writeFileSync(path: string, data: any, options?: any): void;
  export function readdirSync(path: string): string[];
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options?: any): void;
  export function watchFile(path: string, options: any, callback: () => void): void;
  export function unwatchFile(path: string): void;
}

declare module 'path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function basename(path: string, ext?: string): string;
}

declare const process: {
  argv: string[];
  cwd: () => string;
  exit: (code?: number) => never;
  env: Record<string, string | undefined>;
};
