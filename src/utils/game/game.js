export function getGame() {
  if (!(game instanceof foundry.Game)) {
    throw new Error('Game is not initialized yet.');
  }
  return game;
}
