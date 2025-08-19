// Semantic templates for complex visualizers with multiple objects
export const SEMANTIC_TEMPLATES = {
  airplane: {
    name: "Flying Squadron",
    geometry: "custom",
    template: `import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';

export function CustomVisualizer({ audioData }) {
  const groupRef = useRef();
  const airplanesRef = useRef([]);

  // Generate multiple airplane positions
  const airplanePositions = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => ({
      x: (i - 2) * 8,
      y: Math.sin(i * 0.5) * 3,
      z: i * -2,
      rotationOffset: i * 0.3,
      speedMultiplier: 0.8 + (i * 0.1)
    }));
  }, []);

  // Calculate audio frequencies
  const { bass, mids, highs } = useMemo(() => {
    if (!audioData || !audioData.length) return { bass: 0, mids: 0, highs: 0 };
    const bass = audioData.slice(0, 4).reduce((sum, freq) => sum + freq, 0) / 4;
    const mids = audioData.slice(4, 12).reduce((sum, freq) => sum + freq, 0) / 8;
    const highs = audioData.slice(12, 20).reduce((sum, freq) => sum + freq, 0) / 8;
    return { bass: bass / 128, mids: mids / 128, highs: highs / 128 };
  }, [audioData]);

  useFrame((state) => {
    if (!groupRef.current) return;

    // Animate each airplane independently
    airplanesRef.current.forEach((airplane, index) => {
      if (!airplane) return;
      
      const position = airplanePositions[index];
      const time = state.clock.elapsedTime;
      
      // Audio-reactive movement
      const bassBoost = bass * 2;
      const midsBoost = mids * 1.5;
      
      // Formation flying with audio reactivity
      airplane.position.x = position.x + Math.sin(time * position.speedMultiplier + position.rotationOffset) * (2 + bassBoost);
      airplane.position.y = position.y + Math.cos(time * 0.5 + position.rotationOffset) * (1 + midsBoost);
      airplane.position.z = position.z + Math.sin(time * 0.3) * (1 + highs);
      
      // Banking and rolling
      airplane.rotation.z = Math.sin(time + position.rotationOffset) * (0.3 + bass * 0.5);
      airplane.rotation.y = time * 0.2 + position.rotationOffset;
      airplane.rotation.x = Math.cos(time * 0.7) * (0.1 + mids * 0.3);
      
      // Propeller spinning (if it has children)
      if (airplane.children[0]) {
        airplane.children[0].rotation.z = time * (10 + highs * 20);
      }
    });
  });

  return (
    <group ref={groupRef} scale={0.25}>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      
      {airplanePositions.map((position, index) => (
        <group
          key={index}
          ref={(el) => (airplanesRef.current[index] = el)}
          position={[position.x, position.y, position.z]}
        >
          {/* Fuselage */}
          <mesh>
            <cylinderGeometry args={[0.3, 0.5, 4, 8]} />
            <meshStandardMaterial color="#888888" />
          </mesh>
          
          {/* Wings */}
          <mesh position={[0, 0, 0.5]}>
            <boxGeometry args={[6, 0.1, 1]} />
            <meshStandardMaterial color="#666666" />
          </mesh>
          
          {/* Tail */}
          <mesh position={[0, 1, -1.5]}>
            <boxGeometry args={[0.2, 2, 0.8]} />
            <meshStandardMaterial color="#555555" />
          </mesh>
          
          {/* Propeller */}
          <group position={[0, 0, 2]}>
            <mesh>
              <boxGeometry args={[0.1, 0.1, 0.3]} />
              <meshStandardMaterial color="#333333" />
            </mesh>
            <mesh>
              <boxGeometry args={[3, 0.05, 0.1]} />
              <meshStandardMaterial color="#222222" />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}`,
    emoji: "✈️"
  },
  
  flower: {
    name: "Blooming Meadow",
    geometry: "custom",
    template: `import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';

export function CustomVisualizer({ audioData }) {
  const groupRef = useRef();
  const flowersRef = useRef([]);

  // Generate flower field positions
  const flowerPositions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      x: (Math.random() - 0.5) * 16,
      z: (Math.random() - 0.5) * 16,
      y: Math.random() * 2 - 1,
      scale: 0.8 + Math.random() * 0.4,
      swayOffset: Math.random() * Math.PI * 2,
      petalCount: 6 + Math.floor(Math.random() * 4)
    }));
  }, []);

  const { bass, mids, highs } = useMemo(() => {
    if (!audioData || !audioData.length) return { bass: 0, mids: 0, highs: 0 };
    const bass = audioData.slice(0, 4).reduce((sum, freq) => sum + freq, 0) / 4;
    const mids = audioData.slice(4, 12).reduce((sum, freq) => sum + freq, 0) / 8;
    const highs = audioData.slice(12, 20).reduce((sum, freq) => sum + freq, 0) / 8;
    return { bass: bass / 128, mids: mids / 128, highs: highs / 128 };
  }, [audioData]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    flowersRef.current.forEach((flower, index) => {
      if (!flower) return;
      
      const position = flowerPositions[index];
      
      // Gentle swaying with audio reactivity
      const sway = Math.sin(time * 0.5 + position.swayOffset) * (0.2 + bass * 0.3);
      const bounce = Math.sin(time * 2 + position.swayOffset) * (0.1 + mids * 0.2);
      
      flower.rotation.z = sway;
      flower.position.y = position.y + bounce;
      
      // Scale pulsing with highs
      const pulsing = 1 + highs * 0.3;
      flower.scale.setScalar(position.scale * pulsing);
      
      // Petal rotation
      if (flower.children[1]) { // petals group
        flower.children[1].rotation.y = time * 0.1 + highs * 0.5;
      }
    });
  });

  return (
    <group ref={groupRef} scale={0.15}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} />
      
      {flowerPositions.map((position, index) => (
        <group
          key={index}
          ref={(el) => (flowersRef.current[index] = el)}
          position={[position.x, position.y, position.z]}
        >
          {/* Stem */}
          <mesh position={[0, -2, 0]}>
            <cylinderGeometry args={[0.1, 0.15, 4, 6]} />
            <meshStandardMaterial color="#228B22" />
          </mesh>
          
          {/* Petals */}
          <group position={[0, 0, 0]}>
            {Array.from({ length: position.petalCount }, (_, petalIndex) => {
              const angle = (petalIndex / position.petalCount) * Math.PI * 2;
              return (
                <mesh
                  key={petalIndex}
                  position={[
                    Math.cos(angle) * 1.2,
                    0,
                    Math.sin(angle) * 1.2
                  ]}
                  rotation={[0, angle, 0]}
                >
                  <sphereGeometry args={[0.8, 8, 6]} />
                  <meshStandardMaterial color={petalIndex % 2 ? "#FFB6C1" : "#FF69B4"} />
                </mesh>
              );
            })}
          </group>
          
          {/* Center */}
          <mesh>
            <sphereGeometry args={[0.4, 8, 6]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
        </group>
      ))}
    </group>
  );
}`,
    emoji: "🌸"
  }
};