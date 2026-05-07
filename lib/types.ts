export type Card = {
  isrc: string;
  artist: string;
  title: string;
  year: number;
  yearOverride?: number;
};

export type Deck = {
  id: string;
  name: string;
  sourceUrl: string;
  /** Unix epoch milliseconds. */
  createdAt: number;
  cards: Card[];
};
