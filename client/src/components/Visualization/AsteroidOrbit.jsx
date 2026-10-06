import { useRef, useMemo, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import {
  estimateOrbit,
  computeOrbitPoints,
  getPositionAtTime,
  riskHex,
} from "../../utils/orbitalMechanics";

// ─── Orbit path line ─────────────────────────────────────────────────
const OrbitPath = ({ points, color, opacity = 0.35 }) => {
  const lineRef = useRef();

  const geometry = useMemo(() => {
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    // Manually set a large bounding sphere to prevent frustum culling issues
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 100);
    return geom;
  }, [points]);

  return (
    <line ref={lineRef} geometry={geometry} frustumCulled={false} renderOrder={1}>
      <lineBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        depthTest={true}
        linewidth={1}
      />
    </line>
  );
};

// ─── Animated trail behind asteroid ──────────────────────────────────
const OrbitTrail = ({ points, color, trailLength = 40, progress = 0 }) => {
  const lineRef = useRef();

  const { geometry, opacities } = useMemo(() => {
    const totalPts = points.length;
    const startIdx = Math.floor(progress * totalPts);
    const trailPts = [];
    const alphas = [];

    for (let i = 0; i < trailLength; i++) {
      const idx = (startIdx - i + totalPts) % totalPts;
      trailPts.push(points[idx]);
      alphas.push(1.0 - i / trailLength);
    }

    const geom = new THREE.BufferGeometry().setFromPoints(trailPts);
    const colorAttr = new Float32Array(trailLength * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < trailLength; i++) {
      colorAttr[i * 3] = c.r;
      colorAttr[i * 3 + 1] = c.g;
      colorAttr[i * 3 + 2] = c.b;
    }
    geom.setAttribute("color", new THREE.BufferAttribute(colorAttr, 3));

    return { geometry: geom, opacities: alphas };
  }, [points, color, trailLength, progress]);

  return (
    <line ref={lineRef} geometry={geometry} frustumCulled={false} renderOrder={2}>
      <lineBasicMaterial
        vertexColors
        transparent
        opacity={0.8}
        depthWrite={false}
      />
    </line>
  );
};

// ─── Asteroid rock mesh ──────────────────────────────────────────────
const AsteroidMesh = ({ size = 0.1, color = "#ef4444" }) => {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 1.8;
      meshRef.current.rotation.z = clock.getElapsedTime() * 1.2;
    }
  });

  return (
    <mesh ref={meshRef}>
      <dodecahedronGeometry args={[size, 1]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        roughness={0.5}
        metalness={0.3}
      />
    </mesh>
  );
};

// ─── Pulse ring emitted at close approach ────────────────────────────
const PulseRing = ({ color }) => {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (ref.current) {
      const t = (clock.getElapsedTime() % 2) / 2; // 0-1 over 2 seconds
      ref.current.scale.setScalar(1 + t * 2);
      ref.current.material.opacity = 0.5 * (1 - t);
    }
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.12, 0.18, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.5}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// ─── Main AsteroidOrbit component ────────────────────────────────────
const AsteroidOrbit = ({
  asteroid,
  timeOffset = 0,
  selected = false,
  hovered = false,
  onSelect,
  onHover,
  showOrbit = true,
  showLabel = false,
}) => {
  const groupRef = useRef();
  const glowRef = useRef();
  const [isHovered, setIsHovered] = useState(false);

  const color = riskHex(asteroid.riskCategory);
  const isActive = selected || isHovered || hovered;

  // Compute orbital elements & points
  const orbital = useMemo(() => estimateOrbit(asteroid), [asteroid]);
  const orbitPoints = useMemo(
    () => computeOrbitPoints(orbital, 256),
    [orbital],
  );

  // Current position
  const position = useMemo(
    () => getPositionAtTime(orbital, timeOffset),
    [orbital, timeOffset],
  );

  // Progress ratio around orbit for trail
  const progress = useMemo(() => {
    const total = orbital.periodHours;
    return (((timeOffset % total) + total) % total) / total;
  }, [orbital, timeOffset]);

  // Asteroid visual size based on diameter
  const visualSize = useMemo(() => {
    const d = asteroid.estimatedDiameterMax || 100;
    return Math.max(0.06, Math.min(0.25, d / 2000));
  }, [asteroid]);

  // Point-light glow animation
  useFrame(({ clock }) => {
    if (glowRef.current) {
      const pulse = 0.5 + Math.sin(clock.getElapsedTime() * 3) * 0.3;
      glowRef.current.intensity = isActive ? 2 + pulse : 0.5 + pulse * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Orbit path */}
      {showOrbit && (
        <OrbitPath
          points={orbitPoints}
          color={color}
          opacity={isActive ? 0.6 : 0.2}
        />
      )}

      {/* Animated trail */}
      {isActive && (
        <OrbitTrail
          points={orbitPoints}
          color={color}
          trailLength={50}
          progress={progress}
        />
      )}

      {/* Asteroid group at position */}
      <group position={[position.x, position.y, position.z]}>
        {/* Clickable / hoverable invisible sphere - larger hitbox for easier clicking */}
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            console.log("Asteroid clicked:", asteroid.name);
            onSelect?.(asteroid);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setIsHovered(true);
            onHover?.(asteroid);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setIsHovered(false);
            onHover?.(null);
            document.body.style.cursor = "auto";
          }}
        >
          {/* Hitbox size: at least 0.4 for easy clicking */}
          <sphereGeometry args={[Math.max(0.4, visualSize * 3), 16, 16]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>

        {/* Actual asteroid mesh */}
        <AsteroidMesh size={visualSize} color={color} />

        {/* Point glow */}
        <pointLight ref={glowRef} color={color} intensity={0.5} distance={3} />

        {/* Hazardous pulse ring */}
        {asteroid.isPotentiallyHazardous && <PulseRing color={color} />}

        {/* Selection indicator */}
        {selected && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[visualSize * 1.8, visualSize * 2.2, 32]} />
            <meshBasicMaterial
              color="#00d4ff"
              transparent
              opacity={0.8}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* HTML label */}
        {(showLabel || isActive) && (
          <Html
            position={[0, visualSize + 0.3, 0]}
            center
            distanceFactor={8}
            style={{ pointerEvents: "none" }}
          >
            <div className="px-2 py-1 rounded-lg bg-slate-900/90 border border-white/20 backdrop-blur-sm whitespace-nowrap">
              <p className="text-xs font-medium text-white">
                {asteroid.name?.replace(/[()]/g, "").trim()}
              </p>
              {isActive && (
                <p className="text-[10px] text-white/60">
                  {asteroid.missDistanceLunar?.toFixed(1)} LD •{" "}
                  {asteroid.relativeVelocityKmS?.toFixed(1)} km/s
                </p>
              )}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
};

export default AsteroidOrbit;
