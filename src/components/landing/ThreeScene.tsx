"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Box, RoundedBox, Float, Environment, PerspectiveCamera, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { useTheme } from "next-themes";

function IsometricCube({ position, color, ...props }: any) {
    const ref = useRef<THREE.Mesh>(null!);

    useFrame((state) => {
        if (ref.current) {
            ref.current.position.y += Math.sin(state.clock.elapsedTime + position[0]) * 0.002;
        }
    });

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
            <RoundedBox ref={ref} args={[1, 1, 1]} radius={0.1} smoothness={4} position={position} {...props}>
                <meshStandardMaterial
                    color={color}
                    roughness={0.3}
                    metalness={0.8}
                    transparent
                    opacity={0.9}
                />
            </RoundedBox>
        </Float>
    );
}

function CircuitLines() {
    // A simple representation of the "flowing lines" in the sketch
    return (
        <group>
            {/* Animated lines could be complex, using static decorative tubes for now */}
            <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[20, 20, 32, 32]} />
                <meshStandardMaterial color="#1a2b4b" wireframe transparent opacity={0.1} />
            </mesh>
        </group>
    )
}

const ThreeScene = () => {
    const { theme } = useTheme();

    // Colors based on the sketch (Blue/Cyan/Neon)
    const colors = ["#00A4EF", "#2B5C95", "#00F0FF", "#0078D4"];

    return (
        <div className="absolute inset-0 z-0 w-full h-full">
            <Canvas shadows dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[5, 3, 10]} fov={35} />
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={1} color="#00F0FF" />

                <group position={[0, -1, 0]} rotation={[0, -Math.PI / 6, 0]}>
                    {/* Main Feature Cubes */}
                    <IsometricCube position={[-2, 0, 0]} color={colors[0]} scale={0.8} />
                    <IsometricCube position={[0, 0.5, 1]} color={colors[2]} scale={1} />
                    <IsometricCube position={[2, -0.5, -1]} color={colors[1]} scale={0.6} />

                    {/* Background elements */}
                    <IsometricCube position={[-4, -1, -2]} color={colors[3]} scale={0.5} />
                    <IsometricCube position={[3, 1, -3]} color={colors[0]} scale={0.4} />
                    <IsometricCube position={[1, 2, -2]} color={colors[2]} scale={0.3} />

                    <CircuitLines />
                </group>

                <ContactShadows position={[0, -3, 0]} opacity={0.4} scale={20} blur={2.5} far={4} />
                <Environment preset="city" />
            </Canvas>
        </div>
    );
};

export default ThreeScene;
