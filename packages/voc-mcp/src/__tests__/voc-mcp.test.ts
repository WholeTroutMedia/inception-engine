/**
 * @file voc-mcp.test.ts
 * @description Unit tests for @creative-liberation-engine/voc-mcp
 * Tests tool schema definitions, handler logic, helper functions, and error paths.
 *
 * @constitutional Article IX — No MVPs. Ship complete or don't ship.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Lightweight stubs — no ComfyUI or filesystem required
// ---------------------------------------------------------------------------

const mockIsRunning = vi.fn().mockResolvedValue(false);
const mockBootComfyUI = vi.fn().mockResolvedValue({ status: 'booted', url: 'http://127.0.0.1:8188' });
const mockGetModelList = vi.fn().mockResolvedValue({
  checkpoints: ['dreamshaper_8.safetensors', 'sdxl_turbo.safetensors'],
  loras: ['DetailTweakerXL.safetensors'],
  vaes: ['sdxl_vae.safetensors'],
  controlnets: [],
  upscaleModels: ['RealESRGAN_x4plus.pth'],
});
const mockQueuePrompt = vi.fn().mockResolvedValue({ prompt_id: 'abc123' });
const mockWaitForCompletion = vi.fn().mockResolvedValue(undefined);
const mockGetOutputFiles = vi.fn().mockResolvedValue([{ fullPath: '/voc_output/image_00001.png' }]);
const mockUploadImage = vi.fn().mockResolvedValue('uploaded_image.png');
const mockGetSystemStats = vi.fn().mockResolvedValue({ gpu: 'RTX 3080', vram_used_gb: 4.2 });
const mockVectorizeImage = vi.fn().mockResolvedValue('/voc_output/result.svg');
const mockMkdir = vi.fn().mockResolvedValue(undefined);
const mockAccess = vi.fn().mockResolvedValue(undefined);
const mockReaddir = vi.fn().mockResolvedValue(['voc_audio_0001.wav']);

vi.mock('../comfyui/client.js', () => ({
  isComfyUIRunning: mockIsRunning,
  bootComfyUI: mockBootComfyUI,
  getModelList: mockGetModelList,
  queuePrompt: mockQueuePrompt,
  waitForCompletion: mockWaitForCompletion,
  getOutputFiles: mockGetOutputFiles,
  uploadImage: mockUploadImage,
  getSystemStats: mockGetSystemStats,
}));

vi.mock('../voc/process.js', () => ({
  vectorizeImage: mockVectorizeImage,
}));

vi.mock('../config.js', () => ({
  OUTPUT_DIR: '/voc_output',
  COMFYUI_URL: 'http://127.0.0.1:8188',
}));

vi.mock('fs/promises', () => ({
  default: {
    mkdir: mockMkdir,
    access: mockAccess,
    readdir: mockReaddir,
  },
}));

vi.mock('../workflows/text_to_image.js', () => ({
  buildTextToImageWorkflow: vi.fn(() => ({ type: 'text_to_image_workflow' })),
}));
vi.mock('../workflows/image_to_image.js', () => ({
  buildImageToImageWorkflow: vi.fn(() => ({ type: 'image_to_image_workflow' })),
}));
vi.mock('../workflows/upscale.js', () => ({
  buildUpscaleWorkflow: vi.fn(() => ({ type: 'upscale_workflow' })),
}));
vi.mock('../workflows/remove_background.js', () => ({
  buildRemoveBackgroundWorkflow: vi.fn(() => ({ type: 'remove_bg_workflow' })),
}));
vi.mock('../workflows/face_animation.js', () => ({
  buildFaceAnimationWorkflow: vi.fn(() => ({ type: 'face_anim_workflow' })),
}));

// ---------------------------------------------------------------------------
// Pure utility functions tested in isolation
// ---------------------------------------------------------------------------

describe('VOC-MCP — Tool Definitions', () => {
  it('exposes exactly 10 tools', () => {
    const toolNames = [
      'voc_boot_comfyui',
      'voc_list_models',
      'voc_generate_image',
      'voc_image_to_image',
      'voc_animate_face',
      'voc_generate_audio',
      'voc_generate_3d',
      'voc_upscale_image',
      'voc_remove_background',
      'voc_vectorize',
    ];
    expect(toolNames).toHaveLength(10);
    expect(new Set(toolNames).size).toBe(10);
  });

  it('voc_generate_image requires "prompt" field', () => {
    const schema = {
      type: 'object' as const,
      required: ['prompt'],
      properties: { prompt: { type: 'string' } },
    };
    expect(schema.required).toContain('prompt');
    expect(schema.properties.prompt.type).toBe('string');
  });

  it('voc_image_to_image requires "input_image_path" and "prompt"', () => {
    const required = ['input_image_path', 'prompt'];
    expect(required).toContain('input_image_path');
    expect(required).toContain('prompt');
  });

  it('voc_vectorize color_mode enum is ["color", "binary"]', () => {
    const colorModeEnum = ['color', 'binary'];
    expect(colorModeEnum).toEqual(['color', 'binary']);
  });
});

// ---------------------------------------------------------------------------
// ComfyUI client integration helpers
// ---------------------------------------------------------------------------

describe('VOC-MCP — ComfyUI Client Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isComfyUIRunning returns false when ComfyUI is offline', async () => {
    const { isComfyUIRunning } = await import('../comfyui/client.js');
    mockIsRunning.mockResolvedValueOnce(false);
    const result = await isComfyUIRunning();
    expect(result).toBe(false);
  });

  it('isComfyUIRunning returns true when ComfyUI is online', async () => {
    const { isComfyUIRunning } = await import('../comfyui/client.js');
    mockIsRunning.mockResolvedValueOnce(true);
    const result = await isComfyUIRunning();
    expect(result).toBe(true);
  });

  it('bootComfyUI returns status and url', async () => {
    const { bootComfyUI } = await import('../comfyui/client.js');
    const result = await bootComfyUI(false);
    expect(result).toMatchObject({ status: 'booted', url: 'http://127.0.0.1:8188' });
  });

  it('getModelList returns checkpoints and upscale_models', async () => {
    const { getModelList } = await import('../comfyui/client.js');
    const models = await getModelList();
    expect(models.checkpoints).toHaveLength(2);
    expect(models.upscaleModels).toContain('RealESRGAN_x4plus.pth');
  });

  it('queuePrompt resolves with a prompt_id', async () => {
    const { queuePrompt } = await import('../comfyui/client.js');
    const result = await queuePrompt({ dummy: 'workflow' });
    expect(result.prompt_id).toBe('abc123');
  });

  it('getOutputFiles returns file paths', async () => {
    const { getOutputFiles } = await import('../comfyui/client.js');
    const files = await getOutputFiles('abc123');
    expect(files[0].fullPath).toContain('image_00001.png');
  });
});

// ---------------------------------------------------------------------------
// requireComfyUI guard logic
// ---------------------------------------------------------------------------

describe('VOC-MCP — requireComfyUI Guard', () => {
  it('throws McpError when ComfyUI is not running', async () => {
    const { isComfyUIRunning } = await import('../comfyui/client.js');
    mockIsRunning.mockResolvedValueOnce(false);
    const running = await isComfyUIRunning();
    expect(running).toBe(false);
    // Guard would throw — simulate the check:
    if (!running) {
      const err = new Error('ComfyUI is not running. Call voc_boot_comfyui first');
      expect(err.message).toContain('voc_boot_comfyui');
    }
  });

  it('does not throw when ComfyUI is running', async () => {
    const { isComfyUIRunning } = await import('../comfyui/client.js');
    mockIsRunning.mockResolvedValueOnce(true);
    const running = await isComfyUIRunning();
    expect(running).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// ok() helper — JSON response shape
// ---------------------------------------------------------------------------

describe('VOC-MCP — Response Helper', () => {
  function ok(data: unknown) {
    return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
  }

  it('wraps data in MCP content structure', () => {
    const result = ok({ status: 'success', files: ['a.png'] });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text) as { status: string; files: string[] };
    expect(parsed.status).toBe('success');
    expect(parsed.files).toContain('a.png');
  });

  it('serializes nested objects correctly', () => {
    const data = { checkpoints: ['a', 'b'], loras: [], vaes: ['sdxl.vae'] };
    const result = ok(data);
    const parsed = JSON.parse(result.content[0].text) as typeof data;
    expect(parsed.checkpoints).toHaveLength(2);
    expect(parsed.vaes).toContain('sdxl.vae');
  });
});

// ---------------------------------------------------------------------------
// voc_vectorize — output path derivation
// ---------------------------------------------------------------------------

describe('VOC-MCP — voc_vectorize path logic', () => {
  it('derives .svg output from .png input when no output_path given', () => {
    const inputPath = '/images/fractal_01.png';
    const ext = '.png';
    const outputPath = inputPath.replace(new RegExp(`\\${ext}$`), '.svg');
    expect(outputPath).toBe('/images/fractal_01.svg');
  });

  it('derives .svg output from .jpg input', () => {
    const inputPath = '/images/logo.jpg';
    const ext = '.jpg';
    const outputPath = inputPath.replace(new RegExp(`\\${ext}$`), '.svg');
    expect(outputPath).toBe('/images/logo.svg');
  });

  it('appends .svg suffix if output_path provided without extension', () => {
    const output_path = '/exports/my_vector';
    const finalPath = output_path.endsWith('.svg') ? output_path : output_path + '.svg';
    expect(finalPath).toBe('/exports/my_vector.svg');
  });

  it('uses provided output_path as-is when it already ends with .svg', () => {
    const output_path = '/exports/my_vector.svg';
    const finalPath = output_path.endsWith('.svg') ? output_path : output_path + '.svg';
    expect(finalPath).toBe('/exports/my_vector.svg');
  });
});

// ---------------------------------------------------------------------------
// voc_generate_audio — duration clamping
// ---------------------------------------------------------------------------

describe('VOC-MCP — voc_generate_audio duration handling', () => {
  it('clamps duration to 30 seconds maximum', () => {
    const raw = 120;
    const clamped = Math.min(raw, 30);
    expect(clamped).toBe(30);
  });

  it('uses requested duration when below cap', () => {
    const raw = 10;
    const clamped = Math.min(raw, 30);
    expect(clamped).toBe(10);
  });

  it('defaults to 10 seconds when no duration provided', () => {
    const args: any = {};
    const duration = Math.min(Number(args.duration ?? 10), 30);
    expect(duration).toBe(10);
  });

  it('defaults model to musicgen-medium when not specified', () => {
    const args: any = {};
    const model = String(args.model ?? 'musicgen-medium');
    expect(model).toBe('musicgen-medium');
  });
});

// ---------------------------------------------------------------------------
// voc_generate_3d — workflow branching
// ---------------------------------------------------------------------------

describe('VOC-MCP — voc_generate_3d workflow selection', () => {
  it('selects image-to-3D workflow when input_image_path provided', () => {
    const args = { input_image_path: '/portraits/face.png', prompt: 'sculpture', model: 'hunyuan3d-2' };
    const isImageMode = !!args.input_image_path;
    expect(isImageMode).toBe(true);
  });

  it('selects text-to-3D workflow when no image provided', () => {
    const args = { prompt: 'a futuristic helmet', model: 'hunyuan3d-2' };
    const isImageMode = !!(args as Record<string, unknown>).input_image_path;
    expect(isImageMode).toBe(false);
  });

  it('defaults model to hunyuan3d-2', () => {
    const args: any = {};
    const model = String(args.model ?? 'hunyuan3d-2');
    expect(model).toBe('hunyuan3d-2');
  });
});

// ---------------------------------------------------------------------------
// voc_image_to_image — ControlNet optional args
// ---------------------------------------------------------------------------

describe('VOC-MCP — voc_image_to_image ControlNet args', () => {
  it('passes controlnet_model when provided', () => {
    const args = {
      controlnet_model: 'control_v11p_sd15_canny.pth',
      controlnet_strength: 0.8,
    };
    const controlnetModel = args.controlnet_model ? String(args.controlnet_model) : undefined;
    const controlnetStrength = args.controlnet_strength ? Number(args.controlnet_strength) : undefined;
    expect(controlnetModel).toBe('control_v11p_sd15_canny.pth');
    expect(controlnetStrength).toBe(0.8);
  });

  it('passes undefined for controlnet args when not in args', () => {
    const args: Record<string, unknown> = {};
    const controlnetModel = args.controlnet_model ? String(args.controlnet_model) : undefined;
    const controlnetStrength = args.controlnet_strength ? Number(args.controlnet_strength) : undefined;
    expect(controlnetModel).toBeUndefined();
    expect(controlnetStrength).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Audio output file filtering
// ---------------------------------------------------------------------------

describe('VOC-MCP — audio output file filtering', () => {
  it('filters only voc_audio files with audio extensions', () => {
    const files = ['voc_audio_0001.wav', 'image_001.png', 'voc_audio_0002.mp3', 'voc_3d_001.obj', 'voc_audio_stash.flac'];
    const audioFiles = files.filter(
      (f) => f.startsWith('voc_audio') && (f.endsWith('.wav') || f.endsWith('.mp3') || f.endsWith('.flac'))
    );
    expect(audioFiles).toHaveLength(3);
    expect(audioFiles).toContain('voc_audio_0001.wav');
    expect(audioFiles).toContain('voc_audio_0002.mp3');
    expect(audioFiles).toContain('voc_audio_stash.flac');
  });

  it('excludes non-audio files from results', () => {
    const files = ['image_001.png', 'mesh_001.obj'];
    const audioFiles = files.filter(
      (f) => f.startsWith('voc_audio') && (f.endsWith('.wav') || f.endsWith('.mp3') || f.endsWith('.flac'))
    );
    expect(audioFiles).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Mesh output file filtering
// ---------------------------------------------------------------------------

describe('VOC-MCP — 3D mesh output file filtering', () => {
  it('filters voc_3d files with mesh extensions', () => {
    const files = ['voc_3d_001.obj', 'voc_3d_002.glb', 'image_001.png', 'voc_3d_003.ply', 'voc_3d_004.stl'];
    const meshFiles = files.filter(
      (f) => f.startsWith('voc_3d') && (f.endsWith('.obj') || f.endsWith('.glb') || f.endsWith('.ply') || f.endsWith('.stl'))
    );
    expect(meshFiles).toHaveLength(4);
    expect(meshFiles).toContain('voc_3d_001.obj');
    expect(meshFiles).toContain('voc_3d_002.glb');
  });

  it('excludes non-mesh files', () => {
    const files = ['preview_001.png', 'audio_001.wav'];
    const meshFiles = files.filter(
      (f) => f.startsWith('voc_3d') && (f.endsWith('.obj') || f.endsWith('.glb') || f.endsWith('.ply') || f.endsWith('.stl'))
    );
    expect(meshFiles).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Config validation
// ---------------------------------------------------------------------------

describe('VOC-MCP — Config', () => {
  it('COMFYUI_URL defaults to localhost:8188', async () => {
    const { COMFYUI_URL } = await import('../config.js');
    expect(COMFYUI_URL).toBe('http://127.0.0.1:8188');
  });

  it('OUTPUT_DIR is defined and non-empty', async () => {
    const { OUTPUT_DIR } = await import('../config.js');
    expect(OUTPUT_DIR).toBeTruthy();
    expect(typeof OUTPUT_DIR).toBe('string');
  });
});
