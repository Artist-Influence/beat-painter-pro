/**
 * Flower 3D Shape - Layered petals arranged radially around a core (blooming flower)
 * Audio: Bass = bloom open/close, Mids = rotation, Highs = petal flutter
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ShapeProps, NEUTRAL_SOLID, clamp } from './ShapeBase';

export function Flower3DShape({ config, audioData, time, audioSensitivity = 1 }: ShapeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const instancedRef = useRef<THREE.InstancedMesh>(null);

  const { elementCount, scale: shapeScale } = config.shapeParams;
  const petalsPerLayer = clamp(Math.floor(elementCount / 3), 6, 12);
  const layers = 3;
  const petalCount = petalsPerLayer * layers;

  const petals = useMemo(() => {
    const arr: { angle: number; layer: number }[] = [];
    for (let l = 0; l < layers; l++) {
      for (let p = 0; p < petalsPerLayer; p++) {
        const angle = (p / petalsPerLayer) * Math.PI * 2 + l * 0.4;
        arr.push({ angle, layer: l });
      }
    }
    return arr;
  }, [petalsPerLayer]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    if (!instancedRef.current || !groupRef.current) return;

    const bass = audioData.bass * audioSensitivity;
    const mids = audioData.mids * audioSensitivity;
    const highs = audioData.highs * audioSensitivity;

    // Bloom: petals tilt outward more with bass
    const bloom = 0.4 + bass * 0.8 * (0.5 + 0.5 * Math.sin(time * 2.5));

    petals.forEach((petal, i) => {
      const layerT = petal.layer / (layers - 1);
      const tilt = bloom * (0.5 + layerT * 0.8);
      const r = shapeScale * (0.4 + layerT * 0.5);
      const flutter = highs * 0.15 * Math.sin(time * 8 + i);

      const x = Math.cos(petal.angle) * r;
      const z = Math.sin(petal.angle) * r;
      const y = -layerT * shapeScale * 0.3 + Math.cos(tilt) * shapeScale * 0.4;

      dummy.position.set(x, y, z);
      // Orient petal: point outward and tilt up
      dummy.rotation.set(0, -petal.angle, 0);
      dummy.rotateX(Math.PI / 2 - tilt + flutter);
      const len = shapeScale * (0.5 + layerT * 0.3);
      dummy.scale.set(shapeScale * 0.22, len, shapeScale * 0.06);
      dummy.updateMatrix();
      instancedRef.current!.setMatrixAt(i, dummy.matrix);
    });

    instancedRef.current.instanceMatrix.needsUpdate = true;
    groupRef.current.rotation.y += 0.003 + mids * 0.008;
  });

  return (
    <group ref={groupRef}>
      <instancedMesh ref={instancedRef} args={[undefined, undefined, petalCount]}>
        <sphereGeometry args={[0.5, 10, 8]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} side={THREE.DoubleSide} />
      </instancedMesh>
      <mesh>
        <sphereGeometry args={[shapeScale * 0.28, 16, 12]} />
        <meshStandardMaterial {...NEUTRAL_SOLID} />
      </mesh>
    </group>
  );
}

export default Flower3DShape;
