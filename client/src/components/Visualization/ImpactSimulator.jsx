import {
  useRef,
  useMemo,
  useEffect,
  useState,
  useCallback,
  Suspense,
} from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html, Text } from "@react-three/drei";
import * as THREE from "three";
import Atmosphere from "./Atmosphere";

// ─── Texture URLs ────────────────────────────────────────────────────
const TEX_BASE =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r161/examples/textures/planets/";
const EARTH_DAY_URL = TEX_BASE + "earth_atmos_2048.jpg";
const EARTH_NIGHT_URL = TEX_BASE + "earth_lights_2048.png";
const EARTH_SPECULAR_URL = TEX_BASE + "earth_specular_2048.jpg";
const EARTH_CLOUDS_URL = TEX_BASE + "earth_clouds_1024.png";

// ─── Impact physics estimator ────────────────────────────────────────
export function estimateImpact({
  diameterKm,
  velocityKmS,
  densityKgM3,
  angleDegs,
}) {
  const r = (diameterKm * 1000) / 2;
  const volume = (4 / 3) * Math.PI * r ** 3;
  const mass = volume * densityKgM3;
  const v = velocityKmS * 1000;
  const sinA = Math.sin((angleDegs * Math.PI) / 180);
  const kineticEnergy = 0.5 * mass * v ** 2; // joules
  const energyMegatons = kineticEnergy / 4.184e15;
  const craterDiameterKm =
    0.07 * Math.pow(kineticEnergy, 0.29) * Math.pow(sinA, 0.33);
  const earthquakeMagnitude = Math.min(
    10,
    0.67 * Math.log10(energyMegatons) + 5.87,
  );
  const fireballRadiusKm = Math.pow(energyMegatons, 0.4) * 1.2;
  const ejectaHeightKm = Math.min(100, craterDiameterKm * 2.5);

  return {
    energyMegatons,
    craterDiameterKm: Math.max(0.01, craterDiameterKm),
    earthquakeMagnitude,
    fireballRadiusKm,
    ejectaHeightKm,
    massKg: mass,
    kineticEnergyJ: kineticEnergy,
    tntEquivalent:
      energyMegatons > 1000 ?
        `${(energyMegatons / 1000).toFixed(1)} Gigatons TNT`
      : `${energyMegatons.toFixed(1)} Megatons TNT`,
    comparison: getComparison(energyMegatons),
  };
}

function getComparison(megatons) {
  if (megatons < 0.001) return "Equivalent to a large conventional bomb";
  if (megatons < 0.02) return "Comparable to the Hiroshima bomb";
  if (megatons < 1) return "Comparable to a modern nuclear warhead";
  if (megatons < 100) return "Comparable to the Tsar Bomba";
  if (megatons < 10000)
    return "Comparable to the Chicxulub impactor's baby cousin";
  if (megatons < 1e6) return "Regional extinction-level event";
  if (megatons < 1e9) return "Comparable to the Chicxulub dinosaur-killer";
  return "Planet-shattering cataclysm ☠️";
}

// ─── Earth for Impact Scene ──────────────────────────────────────────
const earthVertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vUv = uv;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const earthFragmentShader = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D specularMap;
  uniform vec3 sunDirection;
  uniform float time;
  uniform vec3 impactPoint;
  uniform float impactGlow;
  uniform float craterSize;

  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;

  void main() {
    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);
    float specMask = texture2D(specularMap, vUv).r;

    vec3 N = normalize(vWorldNormal);
    vec3 sunDir = normalize(sunDirection);
    float sunDot = dot(N, sunDir);
    float dayFactor = smoothstep(-0.25, 0.15, sunDot);

    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir = normalize(sunDir + viewDir);
    float spec = pow(max(dot(N, halfDir), 0.0), 64.0) * specMask;
    vec3 specular = spec * vec3(0.5, 0.6, 0.7) * dayFactor;

    float twinkle = 0.92 + 0.08 * sin(time * 1.5 + vUv.x * 100.0 + vUv.y * 60.0);
    vec3 night = nightColor.rgb * twinkle * 1.6;
    vec3 brightDay = dayColor.rgb * 1.35;
    vec3 color = mix(night, brightDay, dayFactor) + specular;

    float rim = 1.0 - max(dot(N, viewDir), 0.0);
    float rimGlow = pow(rim, 3.0);
    color += vec3(0.3, 0.6, 1.0) * rimGlow * 0.35;

    // Impact crater burn
    if (impactGlow > 0.0) {
      vec3 surfaceDir = normalize(vWorldPosition);
      vec3 impDir = normalize(impactPoint);
      float dist = acos(clamp(dot(surfaceDir, impDir), -1.0, 1.0));
      float craterR = craterSize * 0.15;

      // Crater dark spot
      float craterMask = 1.0 - smoothstep(craterR * 0.3, craterR, dist);
      color = mix(color, vec3(0.15, 0.05, 0.02), craterMask * impactGlow);

      // Lava glow ring
      float ringDist = abs(dist - craterR * 0.6);
      float ring = exp(-ringDist * 40.0) * impactGlow;
      color += vec3(1.0, 0.3, 0.05) * ring * 2.0;

      // Wider scorch
      float scorch = exp(-dist * 8.0 / craterR) * impactGlow * 0.4;
      color = mix(color, vec3(0.3, 0.1, 0.02), scorch);
    }

    gl_FragColor = vec4(color, 1.0);
  }
`;

const ImpactEarth = ({ impactPoint, impactGlow, craterSize }) => {
  const earthRef = useRef();
  const cloudsRef = useRef();

  const [dayTexture, nightTexture, specularTexture, cloudsTexture] = useLoader(
    THREE.TextureLoader,
    [EARTH_DAY_URL, EARTH_NIGHT_URL, EARTH_SPECULAR_URL, EARTH_CLOUDS_URL],
  );

  useMemo(() => {
    [dayTexture, nightTexture, specularTexture, cloudsTexture].forEach((t) => {
      if (t) {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
      }
    });
  }, [dayTexture, nightTexture, specularTexture, cloudsTexture]);

  const earthUniforms = useMemo(
    () => ({
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture },
      specularMap: { value: specularTexture },
      sunDirection: { value: new THREE.Vector3(5, 2, 3).normalize() },
      time: { value: 0 },
      impactPoint: { value: new THREE.Vector3(0, 0, 2) },
      impactGlow: { value: 0 },
      craterSize: { value: 1 },
    }),
    [dayTexture, nightTexture, specularTexture],
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (earthRef.current) {
      earthRef.current.material.uniforms.time.value = t;
      earthRef.current.material.uniforms.impactPoint.value.copy(impactPoint);
      earthRef.current.material.uniforms.impactGlow.value = impactGlow;
      earthRef.current.material.uniforms.craterSize.value = craterSize;
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = t * 0.02;
    }
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[2, 128, 64]} />
        <shaderMaterial
          uniforms={earthUniforms}
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          depthWrite
          depthTest
        />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.025, 64, 64]} />
        <meshStandardMaterial
          map={cloudsTexture}
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      <Atmosphere radius={2} color="#4da6ff" intensity={0.8} falloff={3.5} />
      <Atmosphere radius={2} color="#88ccff" intensity={0.3} falloff={5.0} />
    </group>
  );
};

// ─── Asteroid projectile ─────────────────────────────────────────────
const AsteroidProjectile = ({ position, size, visible }) => {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.x = clock.getElapsedTime() * 2;
      ref.current.rotation.z = clock.getElapsedTime() * 1.5;
    }
  });

  if (!visible) return null;

  return (
    <mesh ref={ref} position={position}>
      <dodecahedronGeometry args={[size, 1]} />
      <meshStandardMaterial
        color="#8B7355"
        roughness={0.85}
        metalness={0.15}
        emissive="#3a2a1a"
        emissiveIntensity={0.3}
      />
    </mesh>
  );
};

// ─── Explosion effects ───────────────────────────────────────────────
const ExplosionFlash = ({ position, progress, intensity }) => {
  const ref = useRef();

  useFrame(() => {
    if (!ref.current) return;
    // Flash rapidly grows then fades
    const flashPhase = Math.max(0, 1 - progress * 4);
    const scale = 0.1 + progress * intensity * 2;
    ref.current.scale.setScalar(scale);
    ref.current.material.opacity = flashPhase * 0.9;
  });

  if (progress > 0.3) return null;

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={1}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const FireballExpansion = ({ position, progress, intensity }) => {
  const ref = useRef();
  const innerRef = useRef();

  useFrame(() => {
    if (!ref.current) return;
    const growPhase = Math.min(1, progress * 2);
    const fadePhase = Math.max(0, 1 - (progress - 0.3) * 1.8);
    const s = growPhase * intensity * 1.5;
    ref.current.scale.setScalar(s);
    ref.current.material.opacity = fadePhase * 0.7;

    if (innerRef.current) {
      innerRef.current.scale.setScalar(s * 0.6);
      innerRef.current.material.opacity = fadePhase * 0.9;
    }
  });

  if (progress > 0.85) return null;

  return (
    <group>
      <mesh ref={ref} position={position}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#ff6600"
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={innerRef} position={position}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#ffcc00"
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

const ShockwaveRing = ({ position, normal, progress, intensity }) => {
  const ref = useRef();

  // Orient ring to face outward from impact point (must be before any early return)
  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 0, 1);
    q.setFromUnitVectors(up, normal.clone().normalize());
    return q;
  }, [normal]);

  useFrame(() => {
    if (!ref.current) return;
    const growPhase = Math.min(1, progress * 1.5);
    const fadePhase = Math.max(0, 1 - progress * 1.2);
    const s = growPhase * intensity * 3;
    ref.current.scale.setScalar(s);
    ref.current.material.opacity = fadePhase * 0.5;
  });

  if (progress > 0.9) return null;

  return (
    <mesh ref={ref} position={position} quaternion={quaternion}>
      <ringGeometry args={[0.8, 1, 64]} />
      <meshBasicMaterial
        color="#ff8844"
        transparent
        opacity={0.5}
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// ─── Debris Particles ────────────────────────────────────────────────
const DebrisParticles = ({ origin, progress, count = 200, spread = 2 }) => {
  const ref = useRef();

  const { positions, velocities, sizes } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = [];
    const sz = new Float32Array(count);
    const dir = origin.clone().normalize();

    for (let i = 0; i < count; i++) {
      pos[i * 3] = origin.x;
      pos[i * 3 + 1] = origin.y;
      pos[i * 3 + 2] = origin.z;

      // Random direction biased outward from impact
      const randDir = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
      )
        .add(dir.clone().multiplyScalar(1 + Math.random() * 2))
        .normalize()
        .multiplyScalar(0.5 + Math.random() * 3);

      vel.push(randDir);
      sz[i] = 0.02 + Math.random() * 0.06;
    }
    return { positions: pos, velocities: vel, sizes: sz };
  }, [origin, count, spread]);

  useFrame(() => {
    if (!ref.current || progress <= 0) return;
    const geo = ref.current.geometry;
    const posAttr = geo.attributes.position;

    for (let i = 0; i < count; i++) {
      const t = Math.min(1, progress * 1.5);
      posAttr.array[i * 3] = origin.x + velocities[i].x * t;
      posAttr.array[i * 3 + 1] = origin.y + velocities[i].y * t;
      posAttr.array[i * 3 + 2] = origin.z + velocities[i].z * t;
    }
    posAttr.needsUpdate = true;

    // Fade out
    ref.current.material.opacity = Math.max(0, 1 - progress * 1.3);
  });

  if (progress <= 0 || progress > 0.8) return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#ff9944"
        transparent
        opacity={1}
        size={0.08}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

// ─── Dust Cloud ──────────────────────────────────────────────────────
const DustCloud = ({ position, progress, intensity }) => {
  const ref = useRef();

  useFrame(() => {
    if (!ref.current) return;
    const growPhase = Math.min(1, (progress - 0.2) * 2);
    if (growPhase <= 0) {
      ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    const fadePhase = Math.max(0, 1 - (progress - 0.5) * 2.5);
    const s = growPhase * intensity * 2.5;
    ref.current.scale.setScalar(s);
    ref.current.material.opacity = fadePhase * 0.4;
  });

  if (progress < 0.15 || progress > 0.95) return null;

  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial
        color="#664422"
        transparent
        opacity={0.4}
        depthWrite={false}
      />
    </mesh>
  );
};

// ─── Camera Shake ────────────────────────────────────────────────────
const CameraShake = ({ intensity, active }) => {
  const { camera } = useThree();
  const originalPos = useRef(null);

  useEffect(() => {
    if (active && !originalPos.current) {
      originalPos.current = camera.position.clone();
    }
  }, [active, camera]);

  useFrame(() => {
    if (!active || !originalPos.current) return;
    const shakeAmount = intensity * 0.15;
    camera.position.x =
      originalPos.current.x + (Math.random() - 0.5) * shakeAmount;
    camera.position.y =
      originalPos.current.y + (Math.random() - 0.5) * shakeAmount;
    camera.position.z =
      originalPos.current.z + (Math.random() - 0.5) * shakeAmount;
  });

  useEffect(() => {
    if (!active && originalPos.current) {
      camera.position.copy(originalPos.current);
      originalPos.current = null;
    }
  }, [active, camera]);

  return null;
};

// ─── Approach trail ──────────────────────────────────────────────────
const ApproachTrail = ({ start, end, progress, visible }) => {
  const ref = useRef();

  const points = useMemo(() => {
    const pts = [];
    const segments = 100;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      pts.push(new THREE.Vector3().lerpVectors(start, end, t));
    }
    return pts;
  }, [start, end]);

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [points]);

  useFrame(() => {
    if (!ref.current) return;
    ref.current.material.opacity = visible ? 0.3 * (1 - progress) : 0;
  });

  if (!visible) return null;

  return (
    <line ref={ref} geometry={geometry}>
      <lineDashedMaterial
        color="#ff4444"
        transparent
        opacity={0.3}
        dashSize={0.2}
        gapSize={0.1}
        depthWrite={false}
      />
    </line>
  );
};

// ─── Main Impact Scene ───────────────────────────────────────────────
const ImpactScene = ({
  params,
  phase, // "idle" | "approaching" | "impact" | "aftermath"
  progress, // 0–1 for each phase
  impactPoint,
  asteroidPos,
  asteroidStartPos,
  explosionIntensity,
}) => {
  const orbitControlsRef = useRef();
  const impactNormal = useMemo(
    () => impactPoint.clone().normalize(),
    [impactPoint],
  );

  const asteroidVisualSize = Math.max(
    0.05,
    Math.min(0.5, params.diameterKm * 0.8),
  );

  const showAsteroid = phase === "idle" || phase === "approaching";
  const showExplosion = phase === "impact";
  const showAftermath =
    phase === "aftermath" || (phase === "impact" && progress > 0.3);
  const shakeActive = phase === "impact" && progress < 0.6;
  const shakeIntensity =
    phase === "impact" ? Math.max(0, 1 - progress * 2) * explosionIntensity : 0;

  return (
    <>
      {/* Lighting */}
      <directionalLight
        position={[50, 20, 30]}
        intensity={2.0}
        color="#fff5e6"
      />
      <ambientLight intensity={0.25} color="#2a3a5a" />
      <pointLight
        position={[-20, -10, -15]}
        intensity={0.3}
        color="#4444aa"
        distance={60}
      />

      {/* Impact flash light */}
      {showExplosion && progress < 0.3 && (
        <pointLight
          position={[
            impactPoint.x * 1.1,
            impactPoint.y * 1.1,
            impactPoint.z * 1.1,
          ]}
          intensity={50 * (1 - progress * 3) * explosionIntensity}
          color="#ff8844"
          distance={20}
        />
      )}

      <Stars
        radius={200}
        depth={80}
        count={6000}
        factor={5}
        saturation={0.1}
        fade
        speed={0.3}
      />

      <Suspense fallback={null}>
        <ImpactEarth
          impactPoint={impactPoint}
          impactGlow={
            phase === "impact" ? Math.min(1, progress * 3)
            : phase === "aftermath" ?
              Math.max(0, 1 - progress * 0.5)
            : 0
          }
          craterSize={explosionIntensity}
        />
      </Suspense>

      {/* Asteroid */}
      <AsteroidProjectile
        position={asteroidPos}
        size={asteroidVisualSize}
        visible={showAsteroid}
      />

      {/* Approach trajectory line */}
      <ApproachTrail
        start={asteroidStartPos}
        end={impactPoint}
        progress={phase === "approaching" ? progress : 1}
        visible={phase === "approaching" || phase === "idle"}
      />

      {/* Explosion effects */}
      {showExplosion && (
        <>
          <ExplosionFlash
            position={[
              impactPoint.x * 1.02,
              impactPoint.y * 1.02,
              impactPoint.z * 1.02,
            ]}
            progress={progress}
            intensity={explosionIntensity}
          />
          <FireballExpansion
            position={[
              impactPoint.x * 1.01,
              impactPoint.y * 1.01,
              impactPoint.z * 1.01,
            ]}
            progress={progress}
            intensity={explosionIntensity}
          />
          <ShockwaveRing
            position={[
              impactPoint.x * 1.03,
              impactPoint.y * 1.03,
              impactPoint.z * 1.03,
            ]}
            normal={impactNormal}
            progress={progress}
            intensity={explosionIntensity}
          />
          <DebrisParticles
            origin={impactPoint}
            progress={progress}
            count={Math.min(500, 100 + explosionIntensity * 100)}
            spread={explosionIntensity}
          />
          <DustCloud
            position={[
              impactPoint.x * 1.05,
              impactPoint.y * 1.05,
              impactPoint.z * 1.05,
            ]}
            progress={progress}
            intensity={explosionIntensity}
          />
        </>
      )}

      {/* Aftermath lingering effects */}
      {showAftermath && phase === "aftermath" && (
        <>
          <DustCloud
            position={[
              impactPoint.x * 1.08,
              impactPoint.y * 1.08,
              impactPoint.z * 1.08,
            ]}
            progress={progress * 0.5}
            intensity={explosionIntensity * 0.6}
          />
        </>
      )}

      <CameraShake intensity={shakeIntensity} active={shakeActive} />

      <OrbitControls
        ref={orbitControlsRef}
        enableZoom
        enablePan={false}
        minDistance={3}
        maxDistance={25}
        zoomSpeed={2}
        rotateSpeed={0.8}
        autoRotate={phase === "idle"}
        autoRotateSpeed={0.2}
        enableDamping
        dampingFactor={0.05}
      />
    </>
  );
};

// ─── Main exported component ─────────────────────────────────────────
const ImpactSimulator = ({
  params,
  phase,
  progress,
  impactPoint,
  asteroidPos,
  asteroidStartPos,
  explosionIntensity,
  className = "",
}) => {
  return (
    <div className={`relative ${className}`}>
      <Canvas
        camera={{ position: [0, 2, 7], fov: 50, near: 0.01, far: 1000 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.5,
          logarithmicDepthBuffer: true,
        }}
        style={{ background: "transparent" }}
        dpr={[1, 2]}
      >
        <ImpactScene
          params={params}
          phase={phase}
          progress={progress}
          impactPoint={impactPoint}
          asteroidPos={asteroidPos}
          asteroidStartPos={asteroidStartPos}
          explosionIntensity={explosionIntensity}
        />
      </Canvas>
    </div>
  );
};

export default ImpactSimulator;
