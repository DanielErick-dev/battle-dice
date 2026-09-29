/** Height of a character on the board, in world units (a tile is 1.8 wide). */
export const FIGURE_HEIGHT = 3.0;

/**
 * Figure height the effects around a token (aura, shield, orbs, wind, healing) were modelled
 * for; they're scaled by EFFECT_SCALE so they keep fitting whatever size the figure is.
 */
const EFFECTS_MODEL_HEIGHT = 1.9;
export const EFFECT_SCALE = FIGURE_HEIGHT / EFFECTS_MODEL_HEIGHT;

/** Where beams and blasts leave and hit a figure. */
export const CHEST_HEIGHT = FIGURE_HEIGHT * 0.55;
