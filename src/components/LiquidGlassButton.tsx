"use client";

import { useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, Text, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { easing } from 'maath';

interface ButtonProps {
  label?: string;
  onClick?: () => void;
  fontSize?: number;
}

const ButtonMesh = ({ label = "Click Me", onClick, fontSize = 0.35 }: ButtonProps) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const { viewport } = useThree();

  const config = {
    ior: 1.2,
    thickness: 3,
    anisotropy: 0.2,
    chromaticAberration: 0.05,
    roughness: 0,
    transmission: 1,
    color: '#ffffff',
  };

  useFrame((state, delta) => {
    // Bulge effect
    const targetScale = hovered ? 1.05 : 1;
    easing.damp3(meshRef.current.scale, [targetScale, targetScale, targetScale], 0.2, delta);

    // Tilt/Follow effect
    if (hovered) {
      const x = (state.pointer.x * viewport.width) / 2;
      const y = (state.pointer.y * viewport.height) / 2;
      easing.damp3(meshRef.current.position, [x * 0.1, y * 0.1, 0], 0.1, delta);
      easing.dampE(meshRef.current.rotation, [-state.pointer.y * 0.2, state.pointer.x * 0.2, Math.PI / 2], 0.2, delta);
    } else {
      easing.damp3(meshRef.current.position, [0, 0, 0], 0.2, delta);
      // Reset rotation but keep the 90deg offset (Math.PI / 2) for horizontal capsule
      easing.dampE(meshRef.current.rotation, [0, 0, Math.PI / 2], 0.2, delta);
    }
  });

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = 'auto';
        }}
        rotation={[0, 0, Math.PI / 2]} // Initial rotation
      >
        {/* Adjusted args: [radius, length, capSegments, radialSegments] */}
        {/* Length increased to 5.5 to fit "Switch to Traveling" */}
        <capsuleGeometry args={[0.7, 5.5, 4, 32]} />
        
        <MeshTransmissionMaterial 
          {...config} 
          background={new THREE.Color('#eef')}
          resolution={512} 
          distortion={0.25} 
          distortionScale={0.3}
          temporalDistortion={0.1}
        />
      </mesh>

      <Text
        position={[0, 0, -0.6]}
        fontSize={fontSize}
        color="black"
        anchorX="center"
        anchorY="middle"
        // Using a standard font to ensure it loads, or use your local font url
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
      >
        {label}
      </Text>
    </group>
  );
};

export default function LiquidGlassButton(props: ButtonProps) {
  return (
    // The container size determines the click area and render size
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }} gl={{ alpha: true }} dpr={[1, 2]}>
        <Environment preset="city" />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <ButtonMesh {...props} />
      </Canvas>
    </div>
  );
}