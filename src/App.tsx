import { useEffect, useRef, useState } from "react";
import {
  ALLY_BONUS,
  BONUS,
  BonusKey,
  GameState,
  MAX_ROUND,
  calcRound,
  bonusOf,
  hasPair,
  initialState,
  newPlayerTricks,
  totalScore,
  trickCount,
} from "./game";

const KEY = "skullking-v2";
const load = (): GameState => {
  try {
    const x = localStorage.getItem(KEY);
    if (x) return JSON.parse(x) as GameState;
  } catch {
    /* ignore */
  }
  return initialState();
};
const fmt = (v: number) => (v > 0 ? "+" : "") + v;

function Stepper({
  v,
  onMinus,
  onPlus,
  plusOff,
  big,
}: {
  v: number;
  onMinus: () => void;
  onPlus: () => void;
  plusOff?: boolean;
  big?: boolean;
}) {
  return (
    <span className={"st" + (big ? " big" : "")}>
      <button onClick={onMinus}>−</button>
      <span>{v}</span>
      <button onClick={onPlus} disabled={plusOff}>
        +
      </button>
    </span>
  );
}

function Board({ s }: { s: GameState }) {
  return (
    <div className="card wrap">
      <table>
        <thead>
          <tr>
            <th>R</th>
            {s.players.map((p, i) => (
              <th key={i}>{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {s.hist.map((h) => (
            <tr key={h.r}>
              <td>{h.r}</td>
              {h.sc.map((v, i) => (
                <td key={i} className={v < 0 ? "bad" : "ok"}>
                  {fmt(v)}
                  <div className="mu">
                    {h.bids[i]}/{h.w[i]}
                  </div>
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th>합계</th>
            {s.players.map((_, i) => (
              <th key={i}>{totalScore(s.hist, i)}</th>
            ))}
          </tr>
        </tbody>
      </table>
      <div className="mu">셀 아래: 예측/실제 승수</div>
    </div>
  );
}

export default function App() {
  const [s, setS] = useState<GameState>(load);
  const [name, setName] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);
  useEffect(() => {
    if (s.ph === "setup") nameRef.current?.focus();
  }, [s.ph, s.players.length]);

  const upd = (f: (d: GameState) => void) =>
    setS((p) => {
      const d = structuredClone(p);
      f(d);
      return d;
    });
  const { players: P, ph, r } = s;
  const cnt = trickCount(s);

  const addPlayer = () => {
    const v = name.trim();
    if (v && P.length < 8) {
      upd((d) => {
        d.players.push(v);
      });
      setName("");
    }
    nameRef.current?.focus();
  };
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    if ((e.nativeEvent as any).isComposing) return;
    e.preventDefault();
    addPlayer();
  };
  const restore = (d: GameState) => {
    const h = d.hist.pop()!;
    d.r = h.r;
    d.bids = h.bids;
    d.pl = h.pl;
    d.kr = h.kr;
    d.pairs = h.pairs;
    d.ph = "result";
  };
  const back = () =>
    upd((d) => {
      if (d.ph === "bid") {
        d.hist.length ? restore(d) : (d.ph = "setup");
      } else if (d.ph === "trick") d.ph = "bid";
      else if (d.ph === "result") d.ph = "trick";
      else if (d.ph === "end") restore(d);
    });
  const next = () =>
    upd((d) => {
      const res = calcRound(d.r, d.bids, d.pl, d.pairs);
      d.hist.push({
        r: d.r,
        bids: d.bids,
        pl: d.pl,
        kr: d.kr,
        pairs: d.pairs,
        ...res,
      });
      if (d.r >= MAX_ROUND) d.ph = "end";
      else {
        d.r++;
        d.bids = d.players.map(() => 0);
        d.ph = "bid";
      }
    });
  const setWin = (i: number, dlt: number) => {
    if (dlt > 0 && cnt >= r) return;
    upd((d) => {
      d.pl[i].w = Math.max(0, d.pl[i].w + dlt);
    });
  };
  const setBonus = (i: number, k: BonusKey, dlt: number, max: number) =>
    upd((d) => {
      d.pl[i][k] = Math.max(0, Math.min(max, d.pl[i][k] + dlt));
    });
  const togglePair = (i: number, j: number) =>
    upd((d) => {
      const a = Math.min(i, j),
        b = Math.max(i, j);
      const x = d.pairs.findIndex((p) => p[0] === a && p[1] === b);
      x < 0 ? d.pairs.push([a, b]) : d.pairs.splice(x, 1);
    });

  return (
    <div id="app">
      <div className="hd">
        <button
          onClick={back}
          style={{ visibility: ph === "setup" ? "hidden" : "visible" }}
        >
          ← 이전
        </button>
        <h1>🏴‍☠️ 스컬킹 점수 계산기</h1>
      </div>

      {ph === "setup" && (
        <div className="card">
          <h2>플레이어 (2~8인)</h2>
          {P.map((p, i) => (
            <div className="row sp" key={i}>
              <span>{p}</span>
              <button
                className="g"
                onClick={() =>
                  upd((d) => {
                    d.players.splice(i, 1);
                  })
                }
              >
                삭제
              </button>
            </div>
          ))}
          <div className="row">
            <input
              ref={nameRef}
              value={name}
              maxLength={12}
              placeholder="이름 입력 후 Enter"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleNameKeyDown}
            />
          </div>
          <div className="row">
            <button onClick={addPlayer} disabled={P.length >= 8}>
              추가
            </button>
            <button
              className="p"
              disabled={P.length < 2}
              onClick={() =>
                upd((d) => {
                  d.ph = "bid";
                  d.r = 1;
                  d.hist = [];
                  d.bids = d.players.map(() => 0);
                })
              }
            >
              게임 시작
            </button>
          </div>
        </div>
      )}

      {ph === "bid" && (
        <>
          <div className="card">
            <h2>
              라운드 {r} / {MAX_ROUND} · 비딩
            </h2>
            <div className="mu">각자 예측한 승수를 선택하세요 (0~{r})</div>
            {P.map((p, i) => (
              <div key={i} style={{ margin: "10px 0" }}>
                <b>{p}</b>
                <div className="row">
                  {Array.from({ length: r + 1 }, (_, v) => (
                    <button
                      key={v}
                      className={s.bids[i] === v ? "on" : ""}
                      onClick={() =>
                        upd((d) => {
                          d.bids[i] = v;
                        })
                      }
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="row">
              <button
                className="p"
                onClick={() => {
                  setOpen({});
                  upd((d) => {
                    d.pl = newPlayerTricks(d.players.length);
                    d.kr = 0;
                    d.pairs = [];
                    d.ph = "trick";
                  });
                }}
              >
                트릭 진행 →
              </button>
            </div>
          </div>
          {s.hist.length > 0 && <Board s={s} />}
        </>
      )}

      {ph === "trick" && (
        <>
          <div className="card">
            <div className="row sp">
              <h2 style={{ margin: 0 }}>라운드 {r} · 트릭 기록</h2>
              <b>
                {cnt} / {r}
              </b>
            </div>
            <div className="row sp">
              <span className="mu">승자 없음(크라켄 등)</span>
              <Stepper
                big
                v={s.kr}
                plusOff={cnt >= r}
                onMinus={() =>
                  upd((d) => {
                    d.kr = Math.max(0, d.kr - 1);
                  })
                }
                onPlus={() =>
                  cnt < r &&
                  upd((d) => {
                    d.kr++;
                  })
                }
              />
            </div>
          </div>
          {P.map((p, i) => {
            const q = s.pl[i],
              bid = s.bids[i];
            const cl = q.w === bid ? "ok" : q.w > bid ? "bad" : "mu";
            const bs = bonusOf(q),
              np = s.pairs.filter((x) => x.includes(i)).length;
            return (
              <div className="card" key={i}>
                <div className="row sp">
                  <div>
                    <b>{p}</b>
                    <div className="mu">
                      예측 {bid}승 · <span className={cl}>현재 {q.w}승</span>
                    </div>
                  </div>
                  <Stepper
                    big
                    v={q.w}
                    plusOff={cnt >= r}
                    onMinus={() => setWin(i, -1)}
                    onPlus={() => setWin(i, 1)}
                  />
                </div>
                <details open={!!open[i]}>
                  <summary
                    onClick={(e) => {
                      e.preventDefault();
                      setOpen((o) => ({ ...o, [i]: !o[i] }));
                    }}
                  >
                    보너스 · 약탈 동맹
                    {bs || np ? ` (보너스 ${bs}점, 동맹 ${np})` : ""}
                  </summary>
                  {BONUS.map((b) => (
                    <div className="row sp" key={b.key}>
                      <span className="mu">{b.label}</span>
                      <Stepper
                        v={q[b.key]}
                        onMinus={() => setBonus(i, b.key, -1, b.max)}
                        onPlus={() => setBonus(i, b.key, 1, b.max)}
                      />
                    </div>
                  ))}
                  <div className="mu">
                    약탈 동맹 상대 (둘 다 성공 시 각 +{ALLY_BONUS})
                  </div>
                  <div className="row">
                    {P.map((x, j) =>
                      j === i ? null : (
                        <button
                          key={j}
                          className={hasPair(s.pairs, i, j) ? "on" : ""}
                          onClick={() => togglePair(i, j)}
                        >
                          {x}
                        </button>
                      ),
                    )}
                  </div>
                </details>
              </div>
            );
          })}
          <div className="row">
            <button
              className="p"
              disabled={cnt !== r}
              onClick={() =>
                upd((d) => {
                  d.ph = "result";
                })
              }
            >
              라운드 종료 · 점수 계산
            </button>
            {cnt !== r && (
              <span className="mu">{r - cnt}트릭 더 기록 필요</span>
            )}
          </div>
          <Board s={s} />
        </>
      )}

      {ph === "result" &&
        (() => {
          const R = calcRound(r, s.bids, s.pl, s.pairs);
          return (
            <>
              <div className="card wrap">
                <h2>라운드 {r} 결과</h2>
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      <th>예측</th>
                      <th>실제</th>
                      <th>보너스</th>
                      <th>점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {P.map((p, i) => (
                      <tr key={i}>
                        <td>{p}</td>
                        <td>{s.bids[i]}</td>
                        <td className={R.ok[i] ? "ok" : "bad"}>{R.w[i]}</td>
                        <td>{fmt(R.b[i] + R.al[i])}</td>
                        <td className={R.sc[i] < 0 ? "bad" : "ok"}>
                          <b>{fmt(R.sc[i])}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mu">
                  카드 보너스는 1승 이상 예측 성공 시에만 적용됩니다
                </div>
                <div className="row">
                  <button className="p" onClick={next}>
                    {r >= MAX_ROUND ? "최종 결과 보기" : "확정 · 다음 라운드"}
                  </button>
                </div>
              </div>
              <Board s={s} />
            </>
          );
        })()}

      {ph === "end" && (
        <>
          <div className="card">
            <h2>🏆 최종 순위</h2>
            {P.map((p, i) => ({ p, t: totalScore(s.hist, i) }))
              .sort((a, b) => b.t - a.t)
              .map((x, i) => (
                <div className="row sp" key={x.p + i}>
                  <span>
                    {i + 1}위 {x.p}
                  </span>
                  <b>{x.t}점</b>
                </div>
              ))}
          </div>
          <Board s={s} />
        </>
      )}

      {ph !== "setup" && (
        <div className="row">
          {confirmReset ? (
            <>
              <span>정말 초기화할까요?</span>
              <button
                className="d"
                onClick={() => {
                  setS(initialState(P));
                  setConfirmReset(false);
                }}
              >
                초기화
              </button>
              <button onClick={() => setConfirmReset(false)}>취소</button>
            </>
          ) : (
            <button className="g" onClick={() => setConfirmReset(true)}>
              새 게임
            </button>
          )}
        </div>
      )}
    </div>
  );
}
