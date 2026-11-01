import { withDressing, type GroundDressing } from "../kit/groundDressing";
import { type NoiseLook, type Painter } from "../kit/textures";

/** Dark loam with moss patches, fallen leaves and grit. */
const paintForestFloor: Painter = (context, size, random) => {
  context.fillStyle = "#18120e";
  context.fillRect(0, 0, size, size);
  for (let patch = 0; patch < 34; patch++) {
    const x = random() * size;
    const y = random() * size;
    const radius = 20 + random() * 55;
    const moss = context.createRadialGradient(x, y, 0, x, y, radius);
    moss.addColorStop(0, `rgba(${38 + random() * 14},${54 + random() * 18},${26 + random() * 8},0.55)`);
    moss.addColorStop(1, "rgba(30,40,20,0)");
    context.fillStyle = moss;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  for (let fleck = 0; fleck < 2600; fleck++) {
    context.fillStyle = random() < 0.6 ? "rgba(6,4,3,0.4)" : "rgba(70,56,42,0.3)";
    context.fillRect(random() * size, random() * size, 1 + random() * 2, 1 + random() * 2);
  }
  const leaves = ["#4a2312", "#5c1a14", "#3a2a14", "#6b2a16", "#2e1f12"];
  for (let leaf = 0; leaf < 170; leaf++) {
    context.fillStyle = leaves[Math.floor(random() * leaves.length)];
    context.globalAlpha = 0.55 + random() * 0.35;
    context.beginPath();
    context.ellipse(
      random() * size,
      random() * size,
      3 + random() * 5,
      1.5 + random() * 2.5,
      random() * Math.PI,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.globalAlpha = 1;
};

/** Red with pale warts; on a hemisphere's UVs the top of the canvas is the cap's crown. */
export const paintToadstoolCap: Painter = (context, size, random) => {
  const gradient = context.createLinearGradient(0, 0, 0, size / 2);
  gradient.addColorStop(0, "#d9182a");
  gradient.addColorStop(1, "#7a0a14");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  context.fillStyle = "#f3e6d4";
  for (let wart = 0; wart < 22; wart++) {
    context.beginPath();
    context.arc(random() * size, random() * size * 0.42, 2 + random() * 4, 0, Math.PI * 2);
    context.fill();
  }
};

export const BARK: NoiseLook = { base: [52, 38, 28], dark: [22, 15, 10], light: [86, 68, 50], fadeOut: false };

export const STONE: NoiseLook = { base: [72, 70, 66], dark: [34, 33, 31], light: [108, 104, 96], fadeOut: false };

/** A muddy trail through the hollow, red autumn leaves and the glow of spores. */
const HOLLOW_GROUND: GroundDressing = {
  wash: { colour: "#ef4444", alpha: 0.22 },
  patches: { colours: ["rgba(140,255,120,0.16)", "rgba(200,60,255,0.12)"], count: 14, radius: [14, 34] },
  path: { kind: "dirt", colour: "rgba(70,48,32,0.9)", edge: "rgba(30,20,12,0.6)", width: [0.12, 0.24], wind: 0.06 },
  litter: [{ shape: "leaf", colours: ["#b91c1c", "#ea580c", "#7c2d12"], count: 160, size: 5 }],
};

export const paintHollowFloor = withDressing(paintForestFloor, HOLLOW_GROUND);
