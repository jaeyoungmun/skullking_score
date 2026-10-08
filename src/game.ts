export type Phase = 'setup' | 'bid' | 'trick' | 'result' | 'end';
export type BonusKey = 's' | 'k' | 'm' | 'p' | 'q';
/** w: 현재 승수, 나머지: 보너스 카드 획득 횟수 */
export type PlayerTricks = Record<BonusKey | 'w', number>;
export type Pair = [number, number];

export interface RoundResult {
  w: number[]; b: number[]; al: number[]; ok: boolean[]; sc: number[];
}
export interface HistEntry extends RoundResult {
  r: number; bids: number[]; pl: PlayerTricks[]; kr: number; pairs: Pair[];
}
export interface GameState {
  ph: Phase; players: string[]; r: number; bids: number[];
  pl: PlayerTricks[]; kr: number; pairs: Pair[]; hist: HistEntry[];
}

export const MAX_ROUND = 10;
export const BONUS: { key: BonusKey; label: string; value: number; max: number }[] = [
  { key: 's', label: '일반 14 (+10)', value: 10, max: 3 },
  { key: 'k', label: '해적깃발 14 (+20)', value: 20, max: 1 },
  { key: 'm', label: '해적이 인어 잡음 (+20/장)', value: 20, max: 2 },
  { key: 'p', label: '스컬킹이 해적 잡음 (+30/장)', value: 30, max: 5 },
  { key: 'q', label: '인어가 스컬킹 잡음 (+40)', value: 40, max: 1 },
];
export const ALLY_BONUS = 20;

export const initialState = (players: string[] = []): GameState => ({
  ph: 'setup', players, r: 1, bids: [], pl: [], kr: 0, pairs: [], hist: [],
});
export const newPlayerTricks = (n: number): PlayerTricks[] =>
  Array.from({ length: n }, () => ({ w: 0, s: 0, k: 0, m: 0, p: 0, q: 0 }));

export const bonusOf = (p: PlayerTricks) => BONUS.reduce((a, b) => a + p[b.key] * b.value, 0);
export const trickCount = (s: GameState) => s.pl.reduce((a, p) => a + p.w, 0) + s.kr;
export const hasPair = (pairs: Pair[], i: number, j: number) =>
  pairs.some(([a, b]) => a === Math.min(i, j) && b === Math.max(i, j));
export const totalScore = (hist: HistEntry[], i: number) => hist.reduce((a, h) => a + h.sc[i], 0);

/** 라운드 점수 계산. 카드 보너스는 1승 이상 예측 성공 시에만, 약탈 동맹은 둘 다 성공 시 각 +20 */
export function calcRound(r: number, bids: number[], pl: PlayerTricks[], pairs: Pair[]): RoundResult {
  const w = pl.map((p) => p.w);
  const ok = bids.map((x, i) => x === w[i]);
  const al = bids.map(() => 0);
  pairs.forEach(([i, j]) => { if (ok[i] && ok[j]) { al[i] += ALLY_BONUS; al[j] += ALLY_BONUS; } });
  const b = pl.map((p, i) => (ok[i] && bids[i] > 0 ? bonusOf(p) : 0));
  const sc = bids.map((x, i) => {
    const base = x === 0 ? (ok[i] ? r * 10 : -r * 10) : ok[i] ? x * 20 : -10 * Math.abs(x - w[i]);
    return base + b[i] + al[i];
  });
  return { w, b, al, ok, sc };
}
