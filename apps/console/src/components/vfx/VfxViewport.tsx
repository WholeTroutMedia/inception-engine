import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import * as THREE from 'three';

interface VfxPoseLandmark {
    x: number
    y: number
    z: number
    visibility?: number
}

interface VfxMocapFrame {
    pose: VfxPoseLandmark[]
}

interface VfxMocapData {
    frames?: VfxMocapFrame[]
    fps?: number
}

interface VfxCameraPose {
    t: [[number], [number], [number]]
}

interface VfxSceneData {
    poses?: VfxCameraPose[]
    point_cloud_url?: string
    lighting?: {
        ambient_color?: number[]
        directional_light?: number[]
        intensity?: number
    }
}

interface VfxViewportProps {
    mode: 'mocap' | 'scene' | 'roto';
    mocapData?: VfxMocapData;
    sceneData?: VfxSceneData;
}

function MocapSkeleton({ data }: { data: VfxMocapData }) {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const [currentFrame, setCurrentFrame] = useState(0);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // Extract frames and metadata (memoized so the reference is stable for useEffect deps)
    const frames = useMemo(() => data?.frames ?? [], [data]);
    const fps = data?.fps || 30;
    const frameCount = frames.length;

    // Animation loop based on recording FPS
    useFrame((state) => {
        if (frameCount === 0) return;

        // Simple playback logic
        // A more robust way is tracking absolute time, but this demo approaches it with basic accumulator.
        const speedMultiplier = 1.0;

        // Let's use standard Three clock from state for smooth looping playback
        const time = state.clock.elapsedTime * speedMultiplier;
        const frameIndex = Math.floor(time * fps) % frameCount;

        if (frameIndex !== currentFrame) {
            setCurrentFrame(frameIndex);
        }
    });

    // Update instanced mesh positions when currentFrame changes
    useEffect(() => {
        if (!meshRef.current || frameCount === 0 || !frames[currentFrame]) return;

        const pose = frames[currentFrame].pose;
        if (!pose || pose.length === 0) return;

        for (let i = 0; i < pose.length; i++) {
            const lm = pose[i];

            // MediaPipe World Landmarks: origin at hips. 
            // Note: Z is depth, Y might need inversion depending on if it's camera space vs world space.
            // Usually Y is inverted in MediaPipe coords (Y down is positive).
            dummy.position.set(
                lm.x,
                -lm.y + 1.0, // Invert Y, elevate to be above the floor (1 meter)
                -lm.z // Invert Z for standard right-handed Three.js viewing
            );

            // Scale points based on visibility
            const scale = (lm.visibility ?? 0) > 0.5 ? 0.05 : 0.01;
            dummy.scale.set(scale, scale, scale);

            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
    }, [currentFrame, frames, dummy, frameCount]);

    if (frameCount === 0) return null;

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, 33]} castShadow>
            <sphereGeometry args={[1, 16, 16]} />
            <meshStandardMaterial color="#copper" opacity={0.8} transparent />
        </instancedMesh>
    );
}

function SceneCameras({ data }: { data: VfxSceneData }) {
    // Create a path from the translation vectors
    const points = useMemo(() => {
        const poses = data?.poses ?? [];
        return poses.map((pose: VfxCameraPose) => {
            const t = pose.t;
            return new THREE.Vector3(t[0][0] * 0.1, t[1][0] * 0.1, t[2][0] * 0.1);
        });
    }, [data]);

    const curve = useMemo(() => new THREE.CatmullRomCurve3(points.length > 1 ? points : [new THREE.Vector3()]), [points]);

    if (!data?.poses || data.poses.length === 0) return null;

    return (
        <group>
            {/* Draw a line tracing the camera path */}
            <mesh>
                <tubeGeometry args={[curve, 64, 0.02, 8, false]} />
                <meshBasicMaterial color="#ff4040" />
            </mesh>

            {/* Draw little spheres for each camera pose */}
            {points.map((p: THREE.Vector3, i: number) => (
                <mesh key={i} position={p}>
                    <sphereGeometry args={[0.05, 8, 8]} />
                    <meshBasicMaterial color={i === 0 ? "#00ff00" : "#dca54c"} />
                </mesh>
            ))}
        </group>
    );
}

export default function VfxViewport({ mode, mocapData, sceneData }: VfxViewportProps) {
    // Dynamic lighting based on sceneData
    const ambientColor = sceneData?.lighting?.ambient_color
        ? new THREE.Color(...sceneData.lighting.ambient_color)
        : new THREE.Color(1, 1, 1);

    const dirLightPos = sceneData?.lighting?.directional_light
        ? new THREE.Vector3(...sceneData.lighting.directional_light).multiplyScalar(10)
        : new THREE.Vector3(10, 10, 5);

    const lightIntensity = sceneData?.lighting?.intensity || 1.0;

    return (
        <div className="w-full h-full relative bg-obsidian border-2 border-subtle overflow-hidden">
            <Canvas camera={{ position: [0, 1.5, 3], fov: 50 }}>
                <color attach="background" args={['#0a0a0a']} />

                <Suspense fallback={null}>
                    <Environment preset="city" />
                </Suspense>

                <ambientLight intensity={0.5} color={ambientColor} />
                <directionalLight position={dirLightPos} intensity={lightIntensity} castShadow />

                <Grid
                    infiniteGrid
                    fadeDistance={50}
                    sectionColor="#dca54c"
                    cellColor="#333333"
                />

                <OrbitControls makeDefault target={[0, 1, 0]} />

                {mocapData && mode === 'mocap' ? (
                    <MocapSkeleton data={mocapData} />
                ) : mode === 'scene' && sceneData ? (
                    <SceneCameras data={sceneData} />
                ) : (
                    /* Temporary Placeholder Cube representing the Scene/Subject */
                    <mesh position={[0, 1, 0]} castShadow receiveShadow>
                        <boxGeometry args={[1, 2, 1]} />
                        <meshStandardMaterial color={mode === 'scene' ? "#ff4040" : "#dca54c"} wireframe={mode === 'roto'} opacity={0.3} transparent />
                    </mesh>
                )}
            </Canvas>

            {/* Viewport UI Overlay */}
            <div className="absolute top-4 left-4 pointer-events-none">
                <div className="bg-surface border-2 border-subtle px-3 py-1.5 inline-block !font-mono text-xs text-cream uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,0.8)]">
                    VIEWPORT // {mode.toUpperCase()}
                </div>

                {mocapData && mode === 'mocap' && (
                    <div className="mt-2 text-[10px] font-mono text-copper bg-obsidian px-2 py-1 border border-subtle inline-block">
                        MOCAP TRACKING ACTIVE // {mocapData.fps} FPS
                    </div>
                )}
            </div>

            <div className="absolute bottom-4 right-4 text-[10px] font-mono text-secondary pointer-events-none text-right">
                <p>Three.js + WebGL Backend</p>
                <p className="text-copper">Performance: Optimal</p>
            </div>
        </div>
    );
}
