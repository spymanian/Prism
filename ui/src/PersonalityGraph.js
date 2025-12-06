import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

function PersonalityShape({ traits }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.006;
    }
  });

  // Create points for the personality shape based on traits
  // Pentagon with 5 evenly distributed points (72 degrees apart)
  const angle = (2 * Math.PI) / 5; // 72 degrees in radians
  const startAngle = -Math.PI / 2; // Start at top
  
  // Color scheme for each trait
  const traitColors = [
    '#ff6b6b', // Openness - Red
    '#4ecdc4', // Conscientiousness - Teal
    '#45b7d1', // Extraversion - Blue
    '#96ceb4', // Agreeableness - Green
    '#ffeaa7', // Emotional Stability - Yellow
  ];
  
  const points = [
    // Openness (top)
    new THREE.Vector3(
      Math.cos(startAngle + 0 * angle) * (traits.openness / 50),
      Math.sin(startAngle + 0 * angle) * (traits.openness / 50),
      0
    ),
    // Conscientiousness (top right)
    new THREE.Vector3(
      Math.cos(startAngle + 1 * angle) * (traits.conscientiousness / 50),
      Math.sin(startAngle + 1 * angle) * (traits.conscientiousness / 50),
      0
    ),
    // Extraversion (bottom right)
    new THREE.Vector3(
      Math.cos(startAngle + 2 * angle) * (traits.extraversion / 50),
      Math.sin(startAngle + 2 * angle) * (traits.extraversion / 50),
      0
    ),
    // Agreeableness (bottom left)
    new THREE.Vector3(
      Math.cos(startAngle + 3 * angle) * (traits.agreeableness / 50),
      Math.sin(startAngle + 3 * angle) * (traits.agreeableness / 50),
      0
    ),
    // Emotional Stability (top left)
    new THREE.Vector3(
      Math.cos(startAngle + 4 * angle) * ((100 - traits.neuroticism) / 50),
      Math.sin(startAngle + 4 * angle) * ((100 - traits.neuroticism) / 50),
      0
    ),
  ];

  return (
    <group ref={meshRef}>
      {/* Pentagon shape - colored by segments */}
      {points.map((point, i) => {
        const nextPoint = points[(i + 1) % points.length];
        return (
          <Line
            key={`edge-${i}`}
            points={[point, nextPoint]}
            color={traitColors[i]}
            lineWidth={4}
          />
        );
      })}
      
      {/* 3D Extruded Pentagon with gradient */}
      <mesh>
        <extrudeGeometry args={[createShape(points), { depth: 0.2, bevelEnabled: false }]} />
        <meshStandardMaterial
          color="#667eea"
          transparent
          opacity={0.4}
          roughness={0.3}
          metalness={0.6}
        />
      </mesh>

      {/* Reference pentagon outline */}
      <Line
        points={[
          new THREE.Vector3(Math.cos(startAngle + 0 * angle), Math.sin(startAngle + 0 * angle), 0),
          new THREE.Vector3(Math.cos(startAngle + 1 * angle), Math.sin(startAngle + 1 * angle), 0),
          new THREE.Vector3(Math.cos(startAngle + 2 * angle), Math.sin(startAngle + 2 * angle), 0),
          new THREE.Vector3(Math.cos(startAngle + 3 * angle), Math.sin(startAngle + 3 * angle), 0),
          new THREE.Vector3(Math.cos(startAngle + 4 * angle), Math.sin(startAngle + 4 * angle), 0),
          new THREE.Vector3(Math.cos(startAngle + 0 * angle), Math.sin(startAngle + 0 * angle), 0),
        ]}
        color="#999999"
        lineWidth={1}
        transparent
        opacity={0.3}
      />

      {/* Colored vertices for each trait */}
      {points.map((point, i) => (
        <mesh key={i} position={point}>
          <sphereGeometry args={[0.1, 32, 32]} />
          <meshStandardMaterial 
            color={traitColors[i]}
            emissive={traitColors[i]}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

function createShape(points) {
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].y);
  }
  shape.lineTo(points[0].x, points[0].y);
  return shape;
}

function PersonalityGraph({ traits }) {
  return (
    <Canvas camera={{ position: [0, 0, 4], fov: 50 }}>
      {/* Clean lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-5, -5, 5]} intensity={0.4} color="#a78bfa" />
      
      {/* Main personality shape */}
      <PersonalityShape traits={traits} />
      
      {/* Camera controls */}
      <OrbitControls 
        enableZoom={true} 
        enablePan={false}
        minDistance={2}
        maxDistance={7}
      />
    </Canvas>
  );
}

export default PersonalityGraph;
