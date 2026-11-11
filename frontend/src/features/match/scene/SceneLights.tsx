"use client";

/** The match's moonlight: one key light casting the board's shadows, and a cool rim light. */
export function SceneLights({ scale, shadowExtent }: { scale: number; shadowExtent: number }) {
  return (
    <>
      {/* Cold moonlight; warmth comes only from fires, torches and lanterns. */}
      <directionalLight
        position={[7 * scale, 14 * scale, 8 * scale]}
        intensity={2}
        color="#c6d1e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-far={60 * scale}
      />
      {/* Cool rim light from the moon's side of the sky. */}
      <directionalLight position={[-0.3, 0.28, -0.8]} intensity={0.7} color="#8da0c2" />
    </>
  );
}
