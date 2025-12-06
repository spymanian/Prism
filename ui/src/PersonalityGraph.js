import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line } from '@react-three/drei';
import * as THREE from 'three';

function PersonalityShape({ traits }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  // Create points for the personality shape based on traits
  const points = [
    new THREE.Vector3(0, traits.openness / 50 - 1, 0),
    new THREE.Vector3(Math.sin(0.4 * Math.PI * 2) * (traits.conscientiousness / 50), Math.cos(0.4 * Math.PI * 2) * (traits.conscientiousness / 50) - 1, 0),
    new THREE.Vector3(Math.sin(0.6 * Math.PI * 2) * (traits.extraversion / 50), Math.cos(0.6 * Math.PI * 2) * (traits.extraversion / 50) - 1, 0),
    new THREE.Vector3(Math.sin(0.8 * Math.PI * 2) * (traits.agreeableness / 50), Math.cos(0.8 * Math.PI * 2) * (traits.agreeableness / 50) - 1, 0),
    new THREE.Vector3(Math.sin(1.0 * Math.PI * 2) * ((100 - traits.neuroticism) / 50), Math.cos(1.0 * Math.PI * 2) * ((100 - traits.neuroticism) / 50) - 1, 0),
  ];

  return (
    <group ref={meshRef}>
      {/* Pentagon shape */}
      <Line
        points={[...points, points[0]]}
        color="#667eea"
        lineWidth={3}
      />
      
      {/* Fill */}
      <mesh>
        <shapeGeometry args={[createShape(points)]} />
        <meshBasicMaterial color="#667eea" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Reference pentagon (max values) */}
      <Line
        points={[
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(Math.sin(0.4 * Math.PI * 2), Math.cos(0.4 * Math.PI * 2), 0),
          new THREE.Vector3(Math.sin(0.6 * Math.PI * 2), Math.cos(0.6 * Math.PI * 2), 0),
          new THREE.Vector3(Math.sin(0.8 * Math.PI * 2), Math.cos(0.8 * Math.PI * 2), 0),
          new THREE.Vector3(Math.sin(1.0 * Math.PI * 2), Math.cos(1.0 * Math.PI * 2), 0),
          new THREE.Vector3(0, 1, 0),
        ]}
        color="#e0e0e0"
        lineWidth={1}
      />

      {/* Vertices */}
      {points.map((point, i) => (
        <mesh key={i} position={point}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#764ba2" />
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
    <Canvas camera={{ position: [0, 0, 4] }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <PersonalityShape traits={traits} />
      <OrbitControls enableZoom={false} enablePan={false} />
    </Canvas>
  );
}

export default PersonalityGraph;
