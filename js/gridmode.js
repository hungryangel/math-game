/* =========================================================
   gridmode.js — 모눈종이 작도 문제 (교과서형)
   격자점을 찍어 밀기·뒤집기·돌리기 한 도형을 직접 그린다.
   ========================================================= */
(function (global) {
  'use strict';

  const COLS = 9, ROWS = 7, CELL = 34, PAD = 22;
  const W = PAD * 2 + COLS * CELL;
  const H = PAD * 2 + ROWS * CELL;

  /* ---------- 도형 (격자점 위 다각형, 왼쪽 위를 (0,0)으로 정규화) ---------- */
  const GRID_SHAPES = [
    { id: 'tri',   name: '직각삼각형', pts: [[0, 0], [3, 0], [0, 2]] },
    { id: 'trap',  name: '사다리꼴',   pts: [[0, 0], [3, 0], [2, 2], [0, 2]] },
    { id: 'ell',   name: 'ㄱ자 도형',  pts: [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]] },
    { id: 'pent',  name: '오각형',     pts: [[0, 0], [2, 0], [3, 2], [1, 3], [0, 2]] },
    { id: 'quad',  name: '사각형',     pts: [[0, 0], [2, 0], [3, 2], [0, 3]] },
    { id: 'flat',  name: '삼각형',     pts: [[0, 0], [3, 0], [0, 1]] },
    { id: 'tri2',  name: '뾰족삼각형', pts: [[0, 0], [2, 0], [3, 3]] }
  ];

  /* ---------- 기하 ---------- */
  const rnd = n => Math.floor(Math.random() * n);
  const pick = a => a[rnd(a.length)];

  const move = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
  const mirrorX = (pts, a) => pts.map(([x, y]) => [2 * a - x, y]);          // 세로 기준선 x=a
  const mirrorY = (pts, b) => pts.map(([x, y]) => [x, 2 * b - y]);          // 가로 기준선 y=b
  // 화면 좌표(y가 아래로 증가)에서 시계 방향 회전
  const turn = (pts, cx, cy, deg) => pts.map(([x, y]) => {
    const dx = x - cx, dy = y - cy;
    if (deg === 90) return [cx - dy, cy + dx];
    if (deg === 180) return [cx - dx, cy - dy];
    return [cx + dy, cy - dx];                                              // 270 = 반시계 90
  });

  function bbox(pts) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  }
  const fits = pts => pts.every(([x, y]) => x >= 0 && x <= COLS && y >= 0 && y <= ROWS);
  const setKey = pts => pts.map(p => p.join(',')).sort().join(' ');
  const sameSet = (a, b) => a.length === b.length && setKey(a) === setKey(b);

  /* 도형이 완전히 비대칭인지(8가지 변환 결과가 모두 다른지) 확인 */
  function isAsymmetric(pts) {
    const norm = p => { const b = bbox(p); return setKey(move(p, -b.x0, -b.y0)); };
    const v = [pts, mirrorX(pts, 0), mirrorY(pts, 0),
               turn(pts, 0, 0, 90), turn(pts, 0, 0, 180), turn(pts, 0, 0, 270),
               mirrorX(turn(pts, 0, 0, 90), 0), mirrorX(turn(pts, 0, 0, 270), 0)].map(norm);
    return new Set(v).size === v.length;
  }
  const SHAPES = GRID_SHAPES.filter(s => {
    const ok = isAsymmetric(s.pts);
    if (!ok) console.warn('[gridmode] 대칭 도형이라 제외됨:', s.id);
    return ok;
  });

  /* ---------- 문제 생성 ----------
     격자가 작으므로 가능한 배치를 모두 훑어 조건에 맞는 것 중 하나를 고른다. */

  const DIRS = [
    { k: 'right', dx: 1, dy: 0, label: '오른쪽' },
    { k: 'left',  dx: -1, dy: 0, label: '왼쪽' },
    { k: 'down',  dx: 0, dy: 1, label: '아래쪽' },
    { k: 'up',    dx: 0, dy: -1, label: '위쪽' }
  ];

  function makeSlide(shape) {
    const b = bbox(shape.pts), w = b.x1 - b.x0, h = b.y1 - b.y0;
    const dir = pick(DIRS), n = 3 + rnd(3);                 // 3~5칸
    const cand = [];
    for (let x = 0; x <= COLS - w; x++) {
      for (let y = 0; y <= ROWS - h; y++) {
        const s = move(shape.pts, x - b.x0, y - b.y0);
        const a = move(s, dir.dx * n, dir.dy * n);
        if (fits(s) && fits(a)) cand.push([s, a]);
      }
    }
    if (!cand.length) return null;
    const [start, answer] = pick(cand);
    return {
      kind: 'slide', shape, start, answer, slide: { dir, n },
      prompt: `이 도형을 <b>${dir.label}으로 ${n}칸</b> 밀었을 때의 도형을 그려 보세요.`,
      hint: '밀기는 <b>위치만</b> 바뀌고 모양·크기·방향은 그대로예요. 꼭짓점마다 똑같이 칸을 세어 보세요.'
    };
  }

  function makeFlip(shape, vertical) {
    const b = bbox(shape.pts), w = b.x1 - b.x0, h = b.y1 - b.y0;
    const cand = [];
    const lim = vertical ? COLS : ROWS;
    for (let ax = 1; ax < lim; ax++) {
      for (let x = 0; x <= COLS - w; x++) {
        for (let y = 0; y <= ROWS - h; y++) {
          const s = move(shape.pts, x - b.x0, y - b.y0), sb = bbox(s);
          const near = vertical ? sb : { x0: sb.y0, x1: sb.y1 };
          const lo = vertical ? sb.x0 : sb.y0, hi = vertical ? sb.x1 : sb.y1;
          if (lo < ax && hi > ax) continue;                   // 기준선이 도형을 가로지르면 제외
          const gap = hi <= ax ? ax - hi : lo - ax;
          if (gap > 2) continue;                              // 기준선에서 너무 멀면 제외
          const a = vertical ? mirrorX(s, ax) : mirrorY(s, ax);
          if (fits(s) && fits(a)) cand.push([s, a, ax, hi <= ax]);
          void near;
        }
      }
    }
    if (!cand.length) return null;
    const [start, answer, at, before] = pick(cand);
    const label = vertical ? (before ? '오른쪽' : '왼쪽') : (before ? '아래쪽' : '위쪽');
    return {
      kind: vertical ? 'flipH' : 'flipV', shape, start, answer,
      axis: { dir: vertical ? 'v' : 'h', at },
      prompt: `<b>빨간 기준선</b>을 따라 이 도형을 <b>${label}으로 뒤집었을 때</b>의 도형을 그려 보세요.`,
      hint: vertical
        ? '기준선에서 <b>같은 칸 수만큼</b> 반대쪽으로! 위아래 높이는 그대로예요.'
        : '기준선에서 <b>같은 칸 수만큼</b> 반대쪽으로! 좌우 위치는 그대로예요.'
    };
  }

  function makeTurn(shape, deg) {
    const b = bbox(shape.pts), w = b.x1 - b.x0, h = b.y1 - b.y0;
    const cand = [];
    for (let x = 0; x <= COLS - w; x++) {
      for (let y = 0; y <= ROWS - h; y++) {
        const s = move(shape.pts, x - b.x0, y - b.y0), sb = bbox(s);
        // 회전 중심은 도형에 붙어 있는 격자점만 (교과서 형태)
        for (let cx = sb.x0 - 1; cx <= sb.x1 + 1; cx++) {
          for (let cy = sb.y0 - 1; cy <= sb.y1 + 1; cy++) {
            if (cx < 0 || cx > COLS || cy < 0 || cy > ROWS) continue;
            const a = turn(s, cx, cy, deg);
            if (fits(s) && fits(a) && !sameSet(s, a)) cand.push([s, a, cx, cy]);
          }
        }
      }
    }
    if (!cand.length) return null;
    const [start, answer, cx, cy] = pick(cand);
    const label = deg === 90 ? '시계 방향으로 90°' : deg === 180 ? '시계 방향으로 180°' : '시계 반대 방향으로 90°';
    return {
      kind: 'rot' + deg, shape, start, answer, center: [cx, cy],
      prompt: `<b>빨간 점</b>을 중심으로 <b>${label}</b> 돌렸을 때의 도형을 그려 보세요.`,
      hint: deg === 90 ? '중심에서 <b>오른쪽으로 3칸</b>인 점은 <b>아래로 3칸</b>인 곳으로 가요.'
        : deg === 180 ? '중심을 사이에 두고 <b>정반대편 같은 거리</b>로 가요.'
        : '중심에서 <b>오른쪽으로 3칸</b>인 점은 <b>위로 3칸</b>인 곳으로 가요.'
    };
  }

  const MAKERS = {
    slide: s => makeSlide(s),
    flipH: s => makeFlip(s, true),
    flipV: s => makeFlip(s, false),
    rot90: s => makeTurn(s, 90),
    rot180: s => makeTurn(s, 180),
    rot270: s => makeTurn(s, 270)
  };

  function makeDraw(cfg) {
    const kinds = cfg.kinds && cfg.kinds.length ? cfg.kinds : Object.keys(MAKERS);
    for (let i = 0; i < 30; i++) {
      const q = MAKERS[pick(kinds)](pick(SHAPES));
      if (q) return Object.assign(q, { type: 'draw', need: q.start.length });
    }
    // 극히 예외적인 경우의 안전장치
    const q = makeSlide(SHAPES[0]);
    return Object.assign(q, { type: 'draw', need: q.start.length });
  }

  /* ---------- SVG 렌더 (조각을 나눠 두어 다른 문제 유형에서도 재사용) ---------- */
  const px = x => PAD + x * CELL, py = y => PAD + y * CELL;
  const poly = pts => pts.map(([x, y]) => `${px(x)},${py(y)}`).join(' ');

  const DEFS = `<defs>
      <marker id="ah" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
        <path d="M0,0 L9,4.5 L0,9 z" fill="#0ea5e9"/>
      </marker>
      <marker id="ahg" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="#16a34a"/>
      </marker>
    </defs>`;

  function frame() {                              // 모눈종이 배경 + 격자선
    let s = `<rect x="0" y="0" width="${W}" height="${H}" rx="14" fill="#f8fbff"/>`;
    for (let x = 0; x <= COLS; x++)
      s += `<line x1="${px(x)}" y1="${py(0)}" x2="${px(x)}" y2="${py(ROWS)}" stroke="#d6e4f7" stroke-width="1"/>`;
    for (let y = 0; y <= ROWS; y++)
      s += `<line x1="${px(0)}" y1="${py(y)}" x2="${px(COLS)}" y2="${py(y)}" stroke="#d6e4f7" stroke-width="1"/>`;
    return s;
  }

  function dots() {                               // 격자점
    let s = '';
    for (let x = 0; x <= COLS; x++)
      for (let y = 0; y <= ROWS; y++)
        s += `<circle cx="${px(x)}" cy="${py(y)}" r="2.4" fill="#8fa6c4" opacity=".55"/>`;
    return s;
  }

  function hits() {                               // 터치 영역 (항상 맨 위에)
    let s = '';
    for (let x = 0; x <= COLS; x++)
      for (let y = 0; y <= ROWS; y++)
        s += `<circle class="hit" cx="${px(x)}" cy="${py(y)}" r="13" fill="transparent" data-x="${x}" data-y="${y}"/>`;
    return s;
  }

  // 교과서처럼 "모눈 한 칸 = 1cm"를 표시
  function unitLabel() {
    return `<g font-size="10.5" font-weight="700" fill="#64748b">
      <line x1="${px(0)}" y1="${py(0) - 7}" x2="${px(1)}" y2="${py(0) - 7}" stroke="#64748b" stroke-width="1.2"/>
      <text x="${px(0.5)}" y="${py(0) - 10}" text-anchor="middle">1 cm</text>
      <line x1="${px(0) - 7}" y1="${py(0)}" x2="${px(0) - 7}" y2="${py(1)}" stroke="#64748b" stroke-width="1.2"/>
      <text x="9" y="${py(0.5)}" text-anchor="middle" transform="rotate(-90 9 ${py(0.5)})">1 cm</text>
    </g>`;
  }

  // 점 ㄱ, ㄴ 같은 이름표가 붙은 점
  function markPoint(x, y, label, color) {
    return `<circle cx="${px(x)}" cy="${py(y)}" r="6" fill="${color}" stroke="#fff" stroke-width="2"/>
      <text x="${px(x) - 9}" y="${py(y) + 16}" font-size="13" font-weight="900" fill="${color}">${label}</text>`;
  }

  function wrap(inner, opts) {
    opts = opts || {};
    return `<svg class="paper" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">`
      + DEFS + frame() + (opts.unit ? unitLabel() : '') + inner + dots()
      + (opts.locked ? '' : hits()) + '</svg>';
  }

  function svg(q, user, opts) {
    opts = opts || {};
    let s = `<svg class="paper" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">`
      + DEFS + frame() + (q.unit ? unitLabel() : '');

    // 기준선 / 회전 중심 / 밀기 화살표
    if (q.axis) {
      s += q.axis.dir === 'v'
        ? `<line x1="${px(q.axis.at)}" y1="${py(0) - 8}" x2="${px(q.axis.at)}" y2="${py(ROWS) + 8}" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>`
        : `<line x1="${px(0) - 8}" y1="${py(q.axis.at)}" x2="${px(COLS) + 8}" y2="${py(q.axis.at)}" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round"/>`;
    }
    if (q.slide) {
      const b = bbox(q.start), d = q.slide;
      const mx = px((b.x0 + b.x1) / 2), my = py((b.y0 + b.y1) / 2);
      s += `<line x1="${mx}" y1="${my}" x2="${mx + d.dir.dx * d.n * CELL}" y2="${my + d.dir.dy * d.n * CELL}"
              stroke="#0ea5e9" stroke-width="2.5" stroke-dasharray="7 5" marker-end="url(#ah)"/>`;
    }

    // 처음 도형
    s += `<polygon points="${poly(q.start)}" fill="rgba(99,102,241,.16)" stroke="#6366f1" stroke-width="3" stroke-linejoin="round"/>`;

    // 사용자가 그린 도형
    if (user.length > 1) {
      const done = user.length >= q.need;
      s += done
        ? `<polygon points="${poly(user)}" fill="rgba(236,72,153,.16)" stroke="#ec4899" stroke-width="3.5" stroke-linejoin="round"/>`
        : `<polyline points="${poly(user)}" fill="none" stroke="#ec4899" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    }

    // 정답 안내는 내가 그린 도형에 가리지 않도록 맨 위에, 채우기 없이 굵은 점선으로
    if (opts.showAnswer)
      s += `<polygon points="${poly(q.answer)}" fill="none" stroke="#16a34a" stroke-width="4.5"
              stroke-dasharray="9 6" stroke-linejoin="round" stroke-linecap="round"/>`;

    s += dots();

    if (q.center)
      s += `<circle cx="${px(q.center[0])}" cy="${py(q.center[1])}" r="7" fill="#ef4444" stroke="#fff" stroke-width="2.5"/>`;

    // 사용자가 찍은 점
    user.forEach(([x, y], i) => {
      s += `<circle cx="${px(x)}" cy="${py(y)}" r="6.5" fill="#ec4899" stroke="#fff" stroke-width="2.5"/>`;
      s += `<text x="${px(x)}" y="${py(y) - 12}" text-anchor="middle" font-size="12" font-weight="800" fill="#be185d">${i + 1}</text>`;
    });

    if (!opts.locked) s += hits();
    return s + '</svg>';
  }

  global.GridMode = {
    COLS, ROWS, CELL, PAD, W, H, SHAPES,
    makeDraw, svg, sameSet, bbox, move, mirrorX, mirrorY, turn,
    px, py, poly, wrap, markPoint, pick, rnd
  };
})(window);
