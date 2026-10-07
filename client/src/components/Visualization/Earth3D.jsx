import { useRef, useMemo, Suspense, useEffect, memo, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html, Line } from "@react-three/drei";
import * as THREE from "three";
import Atmosphere from "./Atmosphere";
import {
  julianDate,
  earthQuaternion,
  sunDirectionEcl,
  moonGeocentricKm,
  eclToScene,
  eclDirToScene,
  radiusToScene,
  makeTrajectory,
  kmToLD,
  EARTH_SCENE_RADIUS,
  LUNAR_DISTANCE_KM,
} from "../../utils/ephemeris";
import { RISK_COLORS } from "../../utils/riskColors";

// ─── Textures (NASA Blue Marble / LRO via three.js examples) ─────────
const TEX_BASE =
  "https://cdn.jsdelivr.net/gh/mrdoob/three.js@r161/examples/textures/planets/";
const EARTH_DAY_URL = TEX_BASE + "earth_atmos_2048.jpg";
const EARTH_NIGHT_URL = TEX_BASE + "earth_lights_2048.png";
const EARTH_SPECULAR_URL = TEX_BASE + "earth_specular_2048.jpg";
const EARTH_CLOUDS_URL = TEX_BASE + "earth_clouds_1024.png";
const MOON_URL = TEX_BASE + "moon_1024.jpg";


const HOUR = 3600000;
const DAY = 24 * HOUR;
const MOON_SCENE_RADIUS = EARTH_SCENE_RADIUS * (1737.4 / 6371);

// Shared simulation clock: Date.now() + offset. Read inside useFrame so
// moving bodies update without re-rendering React components.
const simNow = (offsetRef) => Date.now() + offsetRef.current * HOUR;
const UP = new THREE.Vector3(0, 1, 0);

// ─── Earth (real orientation + real sun lighting) ────────────────────
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
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPosition;
  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 sunDir = normalize(sunDirection);
    float sunDot = dot(N, sunDir);
    float dayFactor = smoothstep(-0.18, 0.12, sunDot);
    vec3 dayColor = texture2D(dayTexture, vUv).rgb * 1.3;
    vec3 night = texture2D(nightTexture, vUv).rgb * 1.7;
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 halfDir = normalize(sunDir + viewDir);
    float spec = pow(max(dot(N, halfDir), 0.0), 48.0) * texture2D(specularMap, vUv).r;
    vec3 color = mix(night, dayColor, dayFactor) + spec * vec3(0.55, 0.65, 0.8) * dayFactor;
    // twilight band
    float twilight = smoothstep(-0.18, 0.0, sunDot) * (1.0 - smoothstep(0.0, 0.2, sunDot));
    color += vec3(0.9, 0.35, 0.1) * twilight * 0.12;
    float rim = pow(1.0 - max(dot(N, viewDir), 0.0), 3.0);
    color += vec3(0.3, 0.6, 1.0) * rim * 0.35 * (0.3 + 0.7 * dayFactor);
    gl_FragColor = vec4(color, 1.0);
  }
`;

const Earth = ({ offsetRef, sunDirRef }) => {
  const earthRef = useRef();
  const cloudsRef = useRef();
  const [day, night, specular, clouds] = useLoader(THREE.TextureLoader, [
    EARTH_DAY_URL,
    EARTH_NIGHT_URL,
    EARTH_SPECULAR_URL,
    EARTH_CLOUDS_URL,
  ]);

  useMemo(() => {
    [day, night, clouds].forEach((t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
    });
  }, [day, night, clouds]);

  const uniforms = useMemo(
    () => ({
      dayTexture: { value: day },
      nightTexture: { value: night },
      specularMap: { value: specular },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
    }),
    [day, night, specular],
  );

  const q = useMemo(() => new THREE.Quaternion(), []);

  useFrame(({ clock }) => {
    const jd = julianDate(simNow(offsetRef));
    earthQuaternion(jd, q);
    earthRef.current?.quaternion.copy(q);
    if (cloudsRef.current) {
      cloudsRef.current.quaternion.copy(q);
      cloudsRef.current.rotateY(clock.getElapsedTime() * 0.004);
    }
    uniforms.sunDirection.value.copy(sunDirRef.current);
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_SCENE_RADIUS, 128, 64]} />
        <shaderMaterial
          uniforms={uniforms}
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
        />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[EARTH_SCENE_RADIUS * 1.012, 64, 64]} />
        <meshStandardMaterial map={clouds} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <Atmosphere radius={EARTH_SCENE_RADIUS} color="#4da6ff" intensity={0.8} falloff={3.5} />
      <Atmosphere radius={EARTH_SCENE_RADIUS} color="#88ccff" intensity={0.3} falloff={5.0} />
    </group>
  );
};

// ─── Sun: real direction, directional light + distant glow ───────────
const makeGlowTexture = (inner, outer) => {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.25, outer);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

const Sun = ({ offsetRef, sunDirRef, showLabel }) => {
  const lightRef = useRef();
  const spriteRef = useRef();
  const glow = useMemo(
    () => makeGlowTexture("rgba(255,250,235,1)", "rgba(255,190,90,0.45)"),
    [],
  );

  useFrame(() => {
    const jd = julianDate(simNow(offsetRef));
    eclDirToScene(sunDirectionEcl(jd), sunDirRef.current);
    lightRef.current?.position.copy(sunDirRef.current).multiplyScalar(100);
    spriteRef.current?.position.copy(sunDirRef.current).multiplyScalar(300);
  });

  return (
    <group>
      <directionalLight ref={lightRef} intensity={2.2} color="#fff5e6" />
      <ambientLight intensity={0.18} color="#2a3a5a" />
      <sprite ref={spriteRef} scale={[60, 60, 1]}>
        <spriteMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
        {showLabel && (
          <Html zIndexRange={[15, 0]} center position={[0, -0.45, 0]} style={{ pointerEvents: "none" }}>
            <span className="text-[10px] uppercase tracking-widest text-amber-200/70">Sun</span>
          </Html>
        )}
      </sprite>
    </group>
  );
};

// ─── Moon at its computed position + its real path ───────────────────
const Moon = ({ offsetRef, showLabel }) => {
  const ref = useRef();
  const tex = useLoader(THREE.TextureLoader, MOON_URL);
  useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
  }, [tex]);

  // Sample one sidereal month around page load for the orbit line
  const [epoch] = useState(() => Date.now());
  const path = useMemo(() => {
    const now = epoch;
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const t = now + (i / 160 - 0.5) * 27.32 * DAY;
      pts.push(eclToScene(moonGeocentricKm(julianDate(t))));
    }
    return pts;
  }, [epoch]);

  useFrame(() => {
    const jd = julianDate(simNow(offsetRef));
    if (ref.current) {
      eclToScene(moonGeocentricKm(jd), ref.current.position);
      // Tidally locked: same face toward Earth
      ref.current.lookAt(0, 0, 0);
      ref.current.rotateY(-Math.PI / 2);
    }
  });

  return (
    <group>
      <Line points={path} color="#94a3b8" lineWidth={1} transparent opacity={0.25} />
      <mesh ref={ref}>
        <sphereGeometry args={[MOON_SCENE_RADIUS, 48, 32]} />
        <meshStandardMaterial map={tex} roughness={1} />
        {showLabel && (
          <Html zIndexRange={[15, 0]} center position={[0, MOON_SCENE_RADIUS + 0.5, 0]} style={{ pointerEvents: "none" }}>
            <span className="text-[10px] uppercase tracking-widest text-slate-300/80">Moon</span>
          </Html>
        )}
      </mesh>
    </group>
  );
};

// ─── Labelled distance rings (ecliptic plane, log scale) ─────────────
const DISTANCE_RINGS = [
  { km: 42164, label: "GEO satellites" },
  { km: LUNAR_DISTANCE_KM, label: "1 LD · Moon" },
  { km: LUNAR_DISTANCE_KM * 10, label: "10 LD" },
  { km: LUNAR_DISTANCE_KM * 50, label: "50 LD" },
  { km: LUNAR_DISTANCE_KM * 200, label: "200 LD" },
];

const DistanceRing = ({ km, label, showLabel }) => {
  const r = radiusToScene(km);
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    return pts;
  }, [r]);
  return (
    <group>
      <Line points={points} color="#38bdf8" lineWidth={1} transparent opacity={0.12} dashed dashSize={0.4} gapSize={0.3} />
      {showLabel && (
        <Html zIndexRange={[15, 0]} position={[r, 0, 0]} center style={{ pointerEvents: "none" }}>
          <span className="text-[10px] text-sky-300/60 whitespace-nowrap translate-x-6 inline-block">
            {label}
          </span>
        </Html>
      )}
    </group>
  );
};

// ─── Asteroid body + flyby trajectory ────────────────────────────────
const rockGeometry = (() => {
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = 0.78 + 0.22 * Math.abs(Math.sin(v.x * 3.1) * Math.cos(v.y * 2.7) + Math.sin(v.z * 4.3) * 0.5);
    v.multiplyScalar(n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
})();

const glowCache = {};
const glowFor = (color) =>
  (glowCache[color] ??= makeGlowTexture(color, color + "55"));

const AsteroidBody = memo(function AsteroidBody({
  asteroid,
  offsetRef,
  selected,
  hovered,
  showLabel,
  showPath,
  onSelect,
  onHover,
}) {
  const groupRef = useRef();
  const rockRef = useRef();
  const trailRef = useRef();
  const leaderRef = useRef();
  const distLabelRef = useRef();
  const color = RISK_COLORS[asteroid.riskCategory] || RISK_COLORS.minimal;
  const active = selected || hovered;

  const traj = useMemo(() => makeTrajectory(asteroid), [asteroid]);
  const tca = useMemo(() => new Date(asteroid.closeApproachDate).getTime(), [asteroid]);

  // Trajectory ±6 days around closest approach, sampled every ~1.5 h
  const { pathPoints, caPoint } = useMemo(() => {
    const pts = [];
    const N = 190;
    for (let i = 0; i <= N; i++) {
      const t = tca + (i / N - 0.5) * 12 * DAY;
      pts.push(eclToScene(traj.at(t)));
    }
    return { pathPoints: pts, caPoint: eclToScene(traj.at(tca)) };
  }, [traj, tca]);

  // Fade the path toward its ends; colour brighter near closest approach
  const pathColors = useMemo(() => {
    const c = new THREE.Color(color);
    return pathPoints.map((_, i) => {
      const x = Math.abs(i / (pathPoints.length - 1) - 0.5) * 2; // 0 at CA, 1 at ends
      const k = 0.15 + 0.85 * (1 - x) ** 1.5;
      return [c.r * k, c.g * k, c.b * k];
    });
  }, [pathPoints, color]);

  const size = useMemo(() => {
    const d = asteroid.estimatedDiameterMax || 50;
    return 0.07 + 0.06 * Math.log10(Math.max(1, d));
  }, [asteroid]);

  const trailGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(40 * 3), 3));
    return g;
  }, []);
  const leaderGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    return g;
  }, []);

  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const now = simNow(offsetRef);
    const p = traj.at(now);
    if (groupRef.current) eclToScene(p, groupRef.current.position);
    if (rockRef.current) {
      rockRef.current.rotation.x = clock.getElapsedTime() * 0.6;
      rockRef.current.rotation.y = clock.getElapsedTime() * 0.4;
    }

    // Bright trail: where the asteroid was over the last 24 h
    if (trailRef.current && active) {
      const geom = trailRef.current.geometry;
      const arr = geom.attributes.position.array;
      for (let i = 0; i < 40; i++) {
        eclToScene(traj.at(now - (i / 39) * DAY), tmp);
        arr[i * 3] = tmp.x;
        arr[i * 3 + 1] = tmp.y;
        arr[i * 3 + 2] = tmp.z;
      }
      geom.attributes.position.needsUpdate = true;
      geom.computeBoundingSphere();
    }

    // Leader line Earth surface → asteroid with live distance
    if (selected && leaderRef.current && groupRef.current) {
      const pos = groupRef.current.position;
      const geom = leaderRef.current.geometry;
      tmp.copy(pos).normalize().multiplyScalar(EARTH_SCENE_RADIUS);
      geom.attributes.position.array.set([tmp.x, tmp.y, tmp.z, pos.x, pos.y, pos.z]);
      geom.attributes.position.needsUpdate = true;
      geom.computeBoundingSphere();
      leaderRef.current.computeLineDistances();
      if (distLabelRef.current) {
        distLabelRef.current.textContent = `${kmToLD(Math.hypot(p[0], p[1], p[2])).toFixed(2)} LD now`;
      }
    }
  });

  const caDate = new Date(tca);

  return (
    <group>
      {showPath && (
        <Line
          points={pathPoints}
          vertexColors={pathColors}
          lineWidth={active ? 2.2 : 1}
          transparent
          opacity={active ? 1 : 0.55}
        />
      )}

      {active && (
        <line geometry={trailGeom} ref={trailRef} frustumCulled={false}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.85} />
        </line>
      )}

      {/* Closest-approach marker */}
      {(active || showPath) && (
        <mesh position={caPoint}>
          <sphereGeometry args={[active ? 0.09 : 0.045, 12, 12]} />
          <meshBasicMaterial color={color} transparent opacity={active ? 1 : 0.6} />
          {selected && (
            <Html zIndexRange={[15, 0]} center position={[0, -0.4, 0]} style={{ pointerEvents: "none" }}>
              <div className="px-2 py-1 rounded-md bg-slate-950/85 border border-white/15 text-[10px] text-white/80 whitespace-nowrap">
                Closest approach · {asteroid.missDistanceLunar?.toFixed(2)} LD
                <br />
                {caDate.toUTCString().slice(5, 22)} UTC
              </div>
            </Html>
          )}
        </mesh>
      )}

      {selected && (
        <line geometry={leaderGeom} ref={leaderRef} frustumCulled={false}>
          <lineDashedMaterial color="#00d4ff" transparent opacity={0.6} dashSize={0.2} gapSize={0.15} />
        </line>
      )}

      <group ref={groupRef}>
        {/* generous invisible hit target */}
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(asteroid);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            onHover?.(asteroid);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            onHover?.(null);
            document.body.style.cursor = "auto";
          }}
        >
          <sphereGeometry args={[Math.max(0.35, size * 3), 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <mesh ref={rockRef} geometry={rockGeometry} scale={size}>
          <meshStandardMaterial color="#8b8178" roughness={0.95} metalness={0.05} emissive={color} emissiveIntensity={active ? 0.35 : 0.15} />
        </mesh>
        <sprite scale={[size * (active ? 9 : 6), size * (active ? 9 : 6), 1]}>
          <spriteMaterial map={glowFor(color)} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={active ? 1 : 0.8} />
        </sprite>

        {selected && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[size * 2.6, size * 3.1, 40]} />
            <meshBasicMaterial color="#00d4ff" side={THREE.DoubleSide} transparent opacity={0.9} />
          </mesh>
        )}

        {(showLabel || active) && (
          <Html zIndexRange={[15, 0]} center position={[0, size + 0.32, 0]} style={{ pointerEvents: "none" }}>
            <div className={`px-2 py-0.5 rounded-md whitespace-nowrap text-[11px] border ${active ? "bg-slate-950/90 border-white/25 text-white" : "bg-slate-950/60 border-white/10 text-white/70"}`}>
              {asteroid.isPotentiallyHazardous && <span className="text-rose-400 mr-1">▲</span>}
              {asteroid.name?.replace(/[()]/g, "").trim()}
              {selected && (
                <span ref={distLabelRef} className="block text-[10px] text-sky-300" />
              )}
            </div>
          </Html>
        )}
      </group>
    </group>
  );
});

// ─── Camera: smooth focus + follow of the selected asteroid ──────────
const FocusController = ({ selected, offsetRef, controlsRef, home }) => {
  const { camera } = useThree();
  const traj = useMemo(() => (selected ? makeTrajectory(selected) : null), [selected]);
  const anim = useRef({ t: 1, fromPos: new THREE.Vector3(), fromTarget: new THREE.Vector3() });
  const target = useMemo(() => new THREE.Vector3(), []);
  const camGoal = useMemo(() => new THREE.Vector3(), []);
  const focus = useMemo(() => new THREE.Vector3(), []);
  const side = useMemo(() => new THREE.Vector3(), []);
  const delta3 = useMemo(() => new THREE.Vector3(), []);
  const homePos = useMemo(() => new THREE.Vector3(...home), [home]);

  useEffect(() => {
    if (!controlsRef.current) return;
    anim.current.t = 0;
    anim.current.fromPos.copy(camera.position);
    anim.current.fromTarget.copy(controlsRef.current.target);
  }, [selected, camera, controlsRef]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;
    const a = anim.current;

    if (traj) eclToScene(traj.at(simNow(offsetRef)), target);
    else target.set(0, 0, 0);

    if (a.t < 1) {
      a.t = Math.min(1, a.t + delta / 1.6);
      const k = a.t * a.t * (3 - 2 * a.t);
      if (traj) {
        // Side-on framing: look at a point between Earth and the asteroid from
        // a direction perpendicular to the Earth–asteroid line
        // (distance ≈ 1.9 r keeps both inside the 45° field of view)
        const r = Math.max(target.length(), 4);
        focus.copy(target).multiplyScalar(0.5);
        side.crossVectors(target, UP);
        if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
        side.normalize();
        // Portrait screens have a narrow horizontal field of view — back off
        const fit = Math.min(3.2, 1.8 * Math.max(1, 1.15 / camera.aspect));
        camGoal.copy(focus).addScaledVector(side, r * fit).addScaledVector(UP, r * 0.55);
      } else {
        focus.set(0, 0, 0);
        camGoal.copy(homePos);
      }
      camera.position.lerpVectors(a.fromPos, camGoal, k);
      controls.target.lerpVectors(a.fromTarget, focus, k);
    } else if (traj) {
      // Follow while the clock runs, keeping the user's chosen view offset
      delta3.copy(target).multiplyScalar(0.5).sub(controls.target);
      controls.target.add(delta3);
      camera.position.add(delta3);
    }
    controls.update();
  });

  return null;
};

// ─── Scene ───────────────────────────────────────────────────────────
const Scene = ({
  asteroids,
  offsetRef,
  selectedAsteroid,
  hoveredAsteroid,
  onSelectAsteroid,
  onHoverAsteroid,
  compact,
  showLabels,
  showPaths,
  home,
}) => {
  const controlsRef = useRef();
  const sunDirRef = useRef(new THREE.Vector3(1, 0, 0));

  return (
    <>
      <Sun offsetRef={offsetRef} sunDirRef={sunDirRef} showLabel={!compact} />
      <Stars radius={400} depth={60} count={compact ? 4000 : 9000} factor={6} saturation={0.15} fade speed={0.3} />

      <Suspense fallback={null}>
        <Earth offsetRef={offsetRef} sunDirRef={sunDirRef} />
        <Moon offsetRef={offsetRef} showLabel={!compact || !!selectedAsteroid} />
      </Suspense>

      {!compact &&
        DISTANCE_RINGS.map((r) => (
          <DistanceRing key={r.km} {...r} showLabel={showLabels} />
        ))}

      {asteroids.map((a) => {
        const id = a.neo_reference_id;
        return (
          <AsteroidBody
            key={id}
            asteroid={a}
            offsetRef={offsetRef}
            selected={selectedAsteroid?.neo_reference_id === id}
            hovered={hoveredAsteroid?.neo_reference_id === id}
            showLabel={showLabels && !compact && a.isPotentiallyHazardous}
            showPath={showPaths}
            onSelect={onSelectAsteroid}
            onHover={onHoverAsteroid}
          />
        );
      })}

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={3.2}
        maxDistance={compact ? 70 : 140}
        rotateSpeed={0.7}
        zoomSpeed={1.4}
        autoRotate={!selectedAsteroid && !hoveredAsteroid}
        autoRotateSpeed={compact ? 0.35 : 0.15}
      />
      <FocusController
        selected={selectedAsteroid}
        offsetRef={offsetRef}
        controlsRef={controlsRef}
        home={home}
      />
    </>
  );
};

/**
 * Real-time geocentric view of Earth, the Moon, the Sun direction and every
 * tracked asteroid's flyby trajectory (JPL orbital elements, log distance).
 *
 * timeOffset: hours from now (0 = live, positions advance in real time).
 */
const Earth3D = ({
  asteroids = [],
  className = "",
  timeOffset = 0,
  selectedAsteroid = null,
  hoveredAsteroid = null,
  onSelectAsteroid,
  onHoverAsteroid,
  onDeselectAsteroid,
  compact = false,
  showLabels = true,
  showPaths = true,
}) => {
  const offsetRef = useRef(timeOffset);
  useEffect(() => {
    offsetRef.current = timeOffset;
  }, [timeOffset]);

  // Open on Earth's sunlit side (≈40° off the Sun direction) so the first view
  // shows the day side and the terminator rather than a dark night hemisphere
  const home = useMemo(() => {
    const sun = eclDirToScene(sunDirectionEcl(julianDate(Date.now())));
    const dir = sun.applyAxisAngle(UP, 0.7).setY(0).normalize();
    const dist = compact ? 15 : 38;
    const elev = compact ? 0.3 : 0.38;
    return [dir.x * dist, dist * elev, dir.z * dist];
  }, [compact]);
  const [contextLost, setContextLost] = useState(false);

  return (
    <div className={`relative ${className}`}>
      {contextLost ?
        <div className="w-full h-full flex items-center justify-center text-white/40 text-sm">
          3D view paused — reload to resume
        </div>
      : <Canvas
          camera={{ position: home, fov: 45, near: 0.05, far: 2000 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.3,
          }}
          dpr={[1, 2]}
          style={{ background: "transparent" }}
          onPointerMissed={() => onDeselectAsteroid?.()}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", () => setContextLost(true));
          }}
        >
          <Scene
            asteroids={asteroids}
            offsetRef={offsetRef}
            selectedAsteroid={selectedAsteroid}
            hoveredAsteroid={hoveredAsteroid}
            onSelectAsteroid={onSelectAsteroid}
            onHoverAsteroid={onHoverAsteroid}
            compact={compact}
            showLabels={showLabels}
            showPaths={showPaths}
            home={home}
          />
        </Canvas>
      }
    </div>
  );
};

export default Earth3D;
