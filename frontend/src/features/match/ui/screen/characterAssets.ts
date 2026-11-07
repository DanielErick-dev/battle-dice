import { CHARACTERS, type CharacterDefinition, type CharacterId } from "@/features/characters";
import type { ChairId } from "@/features/characters/accessories/chairs";

/** The chairs a character may sit on: their own, and their fallen form's. */
export function chairsOf(character: CharacterId): ChairId[] {
  const { chair, fallenChair }: CharacterDefinition = CHARACTERS[character];
  return [chair, fallenChair].filter((id) => id !== undefined);
}

/** The models a character may show in the match: their own, and their fallen form's (Seraphiel). */
export function modelsOf(character: CharacterId): string[] {
  const { model, fallenModel }: CharacterDefinition = CHARACTERS[character];
  return fallenModel ? [model, fallenModel] : [model];
}
