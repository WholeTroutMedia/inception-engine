import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import './App.css';

// A dynamic particle swarm component
const ParticleSwarm = ({ count = 5000 }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Generate random starting positions and velocities
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;
      temp.push({ t, factor, speed, xFactor, yFactor, zFactor, mx: 0, my: 0 });
    }
    return temp;
  }, [count]);

  useFrame(() => {
    if (!mesh.current) return;
    
    // Simulate audio reactivity or ambient flow
    
    particles.forEach((particle, i) => {
      let { t, factor, speed, xFactor, yFactor, zFactor } = particle;
      t = particle.t += speed / 2;
      
      const a = Math.cos(t) + Math.sin(t * 1) / 10;
      const b = Math.sin(t) + Math.cos(t * 2) / 10;
      const s = Math.cos(t);
      
      // Update dummy object position
      dummy.position.set(
        (particle.mx / 10) * a + xFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 1) * factor) / 10,
        (particle.my / 10) * b + yFactor + Math.sin((t / 10) * factor) + (Math.cos(t * 2) * factor) / 10,
        (particle.my / 10) * b + zFactor + Math.cos((t / 10) * factor) + (Math.sin(t * 3) * factor) / 10
      );
      
      dummy.scale.set(s, s, s);
      dummy.rotation.set(s * 5, s * 5, s * 5);
      dummy.updateMatrix();
      
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <dodecahedronGeometry args={[0.2, 0]} />
      <meshStandardMaterial color="#8844ff" roughness={0.1} metalness={0.8} />
    </instancedMesh>
  );
};

function App() {
  return (
    <div className="canvas-container">
      <Canvas camera={{ position: [0, 0, 80], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[100, 100, 100]} intensity={2} color="#4488ff" />
        <pointLight position={[-100, -100, -100]} intensity={2} color="#ff4488" />
        <ParticleSwarm count={3000} />
        <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
        <Environment preset="city" />
      </Canvas>
      <div className="overlay">
        <h1>Living Canvas</h1>
      </div>
    </div>
  );
}

export default App;
