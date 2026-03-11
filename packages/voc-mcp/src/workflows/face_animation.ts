// ─────────────────────────────────────────────────────────────────────────────
// Workflow: Face Animation via LivePortrait
// Animates a portrait photo using an audio or driving video via the
// ComfyUI-LivePortrait custom node.
// ─────────────────────────────────────────────────────────────────────────────

export interface FaceAnimationParams {
  sourceImageName: string;    // uploaded source face image (ComfyUI server-side name)
  drivingVideoName?: string;  // uploaded driving video (optional — uses default motion if absent)
  retargetingEyebrow?: number;
  retargetingEye?: number;
  retargetingLip?: number;
}

export function buildFaceAnimationWorkflow(p: FaceAnimationParams): Record<string, unknown> {
  return {
    "1": {
      class_type: "LoadImage",
      inputs: { image: p.sourceImageName, upload: "image" },
    },
    ...(p.drivingVideoName
      ? {
          "2": {
            class_type: "LoadVideo",
            inputs: {
              video: p.drivingVideoName,
              image_load_cap: 0,
              skip_first_images: 0,
              select_every_nth: 1,
              force_size: "Disabled",
              custom_width: 0,
              custom_height: 0,
              filename_text_extension: true,
            },
          },
        }
      : {}),
    "3": {
      class_type: "LivePortraitProcess",
      inputs: {
        source_image: ["1", 0],
        driving_images: p.drivingVideoName ? ["2", 0] : ["1", 0],
        retargeting_eyebrow: p.retargetingEyebrow ?? 0,
        retargeting_eye: p.retargetingEye ?? 0,
        retargeting_lip: p.retargetingLip ?? 0,
        crop_factor: 2.0,
        dsize: 512,
        scale: 2.3,
        vx_ratio: 0,
        vy_ratio: -0.125,
        face_stitching: true,
        video_frame_load_cap: 0,
      },
    },
    "4": {
      class_type: "SaveImage",
      inputs: { images: ["3", 0], filename_prefix: "voc_face_anim" },
    },
  };
}
