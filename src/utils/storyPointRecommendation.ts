const parseNumeric = (value: string): number | null => {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

export const getNumericDeckValues = (deck: string[]): number[] => {
  const values = deck.map(parseNumeric).filter((value): value is number => value !== null);

  return Array.from(new Set(values)).sort((a, b) => a - b);
};

export const recommendStoryPointFromAverage = (
  average: number | null,
  deck: string[]
): number | null => {
  if (average === null) return null;

  const numericDeck = getNumericDeckValues(deck);
  if (!numericDeck.length) return Math.ceil(average);

  return numericDeck.reduce((best, candidate) => {
    const bestDistance = Math.abs(best - average);
    const candidateDistance = Math.abs(candidate - average);

    if (candidateDistance < bestDistance) return candidate;
    if (candidateDistance === bestDistance) return candidate > best ? candidate : best;
    return best;
  });
};
