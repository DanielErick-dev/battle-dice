import dynamic from "next/dynamic";

// WebGL only exists in the browser, so the stage is never server-rendered.
export const LazyCharacterStage = dynamic(() => import("./CharacterStage").then((module) => module.CharacterStage), {
  ssr: false,
});
