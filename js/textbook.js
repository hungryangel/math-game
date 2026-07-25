/* =========================================================
   textbook.js — 교과서(수학 4-1, 4단원) 문제 유형
     · point     : 점 이동하기 (모눈에 점 ㄴ 찍기)
     · choice    : 그림을 보고 고르는 문제 (이동 방법 찾기 / 몇 cm 밀었나)
     · concept   : 개념 문장 빈칸 고르기 ("위쪽과 아래쪽이 서로 바뀝니다")
   ========================================================= */
(function (global) {
  'use strict';
  const GM = global.GridMode;
  const { COLS, ROWS, W, H, px, py, poly, wrap, markPoint, pick, rnd, move, bbox } = GM;

  const shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  const DIRS = {
    up:    { label: '위쪽',   dx: 0,  dy: -1, opposite: 'down' },
    down:  { label: '아래쪽', dx: 0,  dy: 1,  opposite: 'up' },
    left:  { label: '왼쪽',   dx: -1, dy: 0,  opposite: 'right' },
    right: { label: '오른쪽', dx: 1,  dy: 0,  opposite: 'left' }
  };
  const DIR_KEYS = Object.keys(DIRS);

  /* =========================================================
     1) 점 이동하기 — 교과서 110~111쪽
     ========================================================= */
  function makePoint(cfg) {
    const two = cfg.twoStep ? Math.random() < 0.75 : Math.random() < 0.35;
    const unit = cfg.unit === 'cm';
    const u = unit ? 'cm' : '칸';

    for (let t = 0; t < 60; t++) {
      const gx = 1 + rnd(COLS - 1), gy = 1 + rnd(ROWS - 1);
      const a = pick(['up', 'down']), b = pick(['left', 'right']);
      const na = 2 + rnd(3), nb = 2 + rnd(4);
      const steps = two ? [[a, na], [b, nb]] : [[pick(DIR_KEYS), 2 + rnd(4)]];

      let x = gx, y = gy;
      steps.forEach(([k, n]) => { x += DIRS[k].dx * n; y += DIRS[k].dy * n; });
      if (x < 0 || x > COLS || y < 0 || y > ROWS) continue;
      if (x === gx && y === gy) continue;

      const desc = steps.map(([k, n]) => `<b>${DIRS[k].label}으로 ${n}${u}</b>`).join(', ');
      return {
        type: 'point', unit, from: [gx, gy], answer: [x, y], need: 1, steps,
        prompt: `점 ㄱ을 ${desc} 이동했을 때의 위치에 <b>점 ㄴ</b>을 표시해 보세요.`,
        hint: unit
          ? '모눈 한 칸이 <b>1 cm</b>예요. 방향을 확인하고 칸을 하나씩 세어 보세요.'
          : '방향을 먼저 확인하고, 칸을 하나씩 세면서 이동해 보세요.'
      };
    }
    return null;
  }

  function svgPoint(q, user, opts) {
    opts = opts || {};
    let inner = '';
    // 이동 경로 안내 (정답 공개 시에만)
    if (opts.showAnswer) {
      let cx = q.from[0], cy = q.from[1];
      q.steps.forEach(([k, n]) => {
        const nx = cx + DIRS[k].dx * n, ny = cy + DIRS[k].dy * n;
        inner += `<line x1="${px(cx)}" y1="${py(cy)}" x2="${px(nx)}" y2="${py(ny)}"
                    stroke="#16a34a" stroke-width="3" stroke-dasharray="7 5" marker-end="url(#ahg)" opacity=".9"/>`;
        cx = nx; cy = ny;
      });
      inner += `<circle cx="${px(q.answer[0])}" cy="${py(q.answer[1])}" r="11" fill="none"
                  stroke="#16a34a" stroke-width="3.5" stroke-dasharray="6 4"/>`;
    }
    inner += markPoint(q.from[0], q.from[1], 'ㄱ', '#1e2a4a');
    if (user.length) inner += markPoint(user[0][0], user[0][1], 'ㄴ', '#ec4899');
    return wrap(inner, { unit: q.unit, locked: opts.locked });
  }

  /* =========================================================
     2) 그림 보고 고르기 — 몇 cm 밀었나 / 어떻게 이동했나 (112~113쪽)
     ========================================================= */

  // "나 도형은 가 도형을 아래쪽으로 몇 cm 밀어서 이동한 것인가요?"
  function makeDistance() {
    for (let t = 0; t < 200; t++) {
      const shape = pick(GM.SHAPES);
      const b = bbox(shape.pts), w = b.x1 - b.x0, h = b.y1 - b.y0;
      const dirKey = pick(DIR_KEYS), d = DIRS[dirKey];
      // 두 도형이 겹치면 칸을 세기 어려우므로, 이동 거리를 도형 크기보다 크게 잡아 떨어뜨린다
      const span = d.dx ? w : h;
      const n = span + 1 + rnd(2);
      const x0 = rnd(COLS - w + 1), y0 = rnd(ROWS - h + 1);
      const A = move(shape.pts, x0 - b.x0, y0 - b.y0);
      const B = move(A, d.dx * n, d.dy * n);
      if (!B.every(([x, y]) => x >= 0 && x <= COLS && y >= 0 && y <= ROWS)) continue;

      const opts = shuffle([n, ...shuffle([1, 2, 3, 4, 5, 6].filter(v => v !== n)).slice(0, 3)]);
      return {
        type: 'choice', unit: true,
        prompt: `<b>나</b> 도형은 <b>가</b> 도형을 ${d.label}으로 몇 cm 밀어서 이동한 것인가요?`,
        figures: [{ pts: A, label: '가', color: '#6366f1' }, { pts: B, label: '나', color: '#ec4899' }],
        options: opts.map(v => `${v} cm`), answerIndex: opts.indexOf(n),
        hint: '모눈 한 칸이 <b>1 cm</b>예요. 두 도형의 <b>같은 꼭짓점끼리</b> 짝지어 칸을 세면 밀린 거리를 알 수 있어요.'
      };
    }
    return null;
  }

  // "점 ㄱ이 점 ㄴ에 도착하려면 어떻게 이동해야 할까요?" (111쪽 11번)
  function makePointBack() {
    for (let t = 0; t < 60; t++) {
      const gx = 1 + rnd(COLS - 1), gy = 1 + rnd(ROWS - 1);
      const vk = pick(['up', 'down']), hk = pick(['left', 'right']);
      const vn = 1 + rnd(4), hn = 1 + rnd(5);
      const x = gx + DIRS[hk].dx * hn, y = gy + DIRS[vk].dy * vn;
      if (x < 0 || x > COLS || y < 0 || y > ROWS) continue;

      const right = `${DIRS[vk].label}으로 ${vn} cm, ${DIRS[hk].label}으로 ${hn} cm`;
      const wrongs = [
        `${DIRS[DIRS[vk].opposite].label}으로 ${vn} cm, ${DIRS[hk].label}으로 ${hn} cm`,
        `${DIRS[vk].label}으로 ${hn} cm, ${DIRS[hk].label}으로 ${vn} cm`,
        `${DIRS[vk].label}으로 ${vn} cm, ${DIRS[DIRS[hk].opposite].label}으로 ${hn} cm`
      ].filter(s => s !== right);
      const options = shuffle([right, ...wrongs.slice(0, 3)]);

      return {
        type: 'choice', unit: true,
        prompt: '점 ㄱ이 <b>점 ㄴ</b>에 도착하려면 어떻게 이동해야 할까요?',
        marks: [{ x: gx, y: gy, label: 'ㄱ', color: '#1e2a4a' }, { x, y, label: 'ㄴ', color: '#0ea5e9' }],
        options, answerIndex: options.indexOf(right),
        hint: '<b>위아래로 몇 칸</b>, <b>좌우로 몇 칸</b>인지 따로 세어 보세요. 모눈 한 칸이 1 cm예요.'
      };
    }
    return null;
  }

  function svgChoice(q) {
    let inner = '';
    (q.figures || []).forEach(f => {
      inner += `<polygon points="${poly(f.pts)}" fill="${f.color}22" stroke="${f.color}" stroke-width="3" stroke-linejoin="round"/>`;
      // 이름표는 꼭짓점의 평균(무게중심)에 두어야 삼각형에서도 도형 안쪽에 들어간다
      const cx = f.pts.reduce((s, p) => s + p[0], 0) / f.pts.length;
      const cy = f.pts.reduce((s, p) => s + p[1], 0) / f.pts.length;
      inner += `<text x="${px(cx)}" y="${py(cy) + 5}"
                  text-anchor="middle" font-size="15" font-weight="900" fill="${f.color}">${f.label}</text>`;
    });
    (q.marks || []).forEach(m => { inner += markPoint(m.x, m.y, m.label, m.color); });
    return wrap(inner, { unit: q.unit, locked: true });
  }

  /* =========================================================
     3) 개념 문장 빈칸 — 교과서 114~118쪽의 핵심 문장 그대로
     ========================================================= */
  const FLIP_SIDE = { right: '왼쪽과 오른쪽', left: '왼쪽과 오른쪽', up: '위쪽과 아래쪽', down: '위쪽과 아래쪽' };
  // 시계 방향으로 돌리면 위쪽 부분이 가는 곳
  const CW = { 90: '오른쪽', 180: '아래쪽', 270: '왼쪽', 360: '위쪽' };
  const CCW = { 90: '왼쪽', 180: '아래쪽', 270: '오른쪽', 360: '위쪽' };

  const CONCEPT_MAKERS = [
    // 뒤집기: 어느 쪽이 서로 바뀌는가
    ['flip', () => {
      const k = pick(DIR_KEYS), ans = FLIP_SIDE[k];
      const options = shuffle(['왼쪽과 오른쪽', '위쪽과 아래쪽']);
      return {
        prompt: `도형을 <b>${DIRS[k].label}</b>으로 뒤집으면 도형의 ___이 서로 바뀝니다.`,
        options, answerIndex: options.indexOf(ans),
        hint: '왼쪽·오른쪽으로 뒤집으면 <b>좌우</b>가, 위쪽·아래쪽으로 뒤집으면 <b>상하</b>가 바뀝니다.'
      };
    }],
    // 밀기의 성질
    ['slide', () => {
      const options = shuffle(['변하지 않습니다', '변합니다']);
      return {
        prompt: `도형을 어느 쪽으로 밀어도 도형의 <b>모양</b>은 ___.`,
        options, answerIndex: options.indexOf('변하지 않습니다'),
        hint: '밀기는 <b>위치만</b> 바뀌고 모양·크기·방향은 그대로예요.'
      };
    }],
    ['slide', () => {
      const options = shuffle(['위치', '모양', '크기']);
      return {
        prompt: `밀기를 하면 도형의 모양과 크기는 그대로이고 ___만 바뀝니다.`,
        options, answerIndex: options.indexOf('위치'),
        hint: '밀기는 도형을 <b>그대로 옮기는</b> 것이에요.'
      };
    }],
    // 두 번 뒤집기
    ['flip', () => {
      const k = pick(DIR_KEYS);
      const options = shuffle(['같습니다', '다릅니다']);
      return {
        prompt: `도형을 <b>${DIRS[k].label}</b>으로 <b>두 번</b> 뒤집으면 처음 도형과 ___.`,
        options, answerIndex: options.indexOf('같습니다'),
        hint: '한 번 뒤집으면 좌우(또는 상하)가 바뀌고, <b>한 번 더 뒤집으면 되돌아와요</b>.'
      };
    }],
    // 좌우(상하) 뒤집기 결과가 같음
    ['flip', () => {
      const pair = pick([['왼쪽', '오른쪽'], ['위쪽', '아래쪽']]);
      const options = shuffle(['같습니다', '다릅니다']);
      return {
        prompt: `도형을 <b>${pair[0]}</b>으로 뒤집은 도형과 <b>${pair[1]}</b>으로 뒤집은 도형은 ___.`,
        options, answerIndex: options.indexOf('같습니다'),
        hint: `${pair[0]}으로 뒤집든 ${pair[1]}으로 뒤집든 <b>기준이 되는 선이 같아서</b> 결과가 같아요.`
      };
    }],
    // 돌리기: 위쪽 부분이 어디로 가는가
    ['turn', () => {
      const cw = Math.random() < 0.5;
      const deg = pick([90, 180, 270, 360]);
      const ans = (cw ? CW : CCW)[deg];
      const options = shuffle(['위쪽', '아래쪽', '왼쪽', '오른쪽']);
      return {
        prompt: `도형을 <b>시계 ${cw ? '' : '반대 '}방향으로 ${deg}°</b>만큼 돌리면 도형의 <b>위쪽 부분</b>이 ___으로 이동합니다.`,
        options, answerIndex: options.indexOf(ans),
        hint: cw ? '시계 방향 90°, 180°, 270°, 360° → 위쪽 부분이 <b>오른쪽 · 아래쪽 · 왼쪽 · 위쪽</b>으로 갑니다.'
                 : '시계 반대 방향 90°, 180°, 270°, 360° → 위쪽 부분이 <b>왼쪽 · 아래쪽 · 오른쪽 · 위쪽</b>으로 갑니다.'
      };
    }],
    // 180° 등가
    ['turn', () => {
      const options = shuffle(['같습니다', '다릅니다']);
      return {
        prompt: `<b>시계 방향으로 180°</b> 돌린 도형과 <b>시계 반대 방향으로 180°</b> 돌린 도형은 ___.`,
        options, answerIndex: options.indexOf('같습니다'),
        hint: '반 바퀴는 어느 쪽으로 돌려도 <b>도착하는 위치가 같아요</b>.'
      };
    }],
    // 돌리기 등가 찾기
    ['turn', () => {
      const deg = pick([90, 180, 270]);
      const ans = `시계 반대 방향으로 ${360 - deg}°`;
      const options = shuffle([ans,
        `시계 반대 방향으로 ${deg}°`,
        `시계 방향으로 ${360 - deg}°`,
        '시계 반대 방향으로 360°'].filter((v, i, a) => a.indexOf(v) === i)).slice(0, 4);
      return {
        prompt: `도형을 <b>시계 방향으로 ${deg}°</b> 돌린 것과 결과가 <b>같은</b> 것은?`,
        options, answerIndex: options.indexOf(ans),
        hint: `시계 방향 ${deg}°와 시계 반대 방향 ${360 - deg}°는 <b>화살표 끝이 같은 곳</b>을 가리켜요.`
      };
    }]
  ];

  function makeConcept(cfg) {
    const topics = (cfg && cfg.topics) || null;
    const pool = topics ? CONCEPT_MAKERS.filter(m => topics.includes(m[0])) : CONCEPT_MAKERS;
    const q = pick(pool.length ? pool : CONCEPT_MAKERS)[1]();
    return Object.assign(q, { type: 'concept' });
  }

  /* ---------- 진입점 ---------- */
  function make(cfg) {
    const kind = pick(cfg.kinds);
    let q = null;
    if (kind === 'point') q = makePoint(cfg);
    else if (kind === 'pointBack') q = makePointBack();
    else if (kind === 'distance') q = makeDistance();
    else q = makeConcept(cfg);
    return q || makeConcept(cfg);
  }

  global.Textbook = { make, svgPoint, svgChoice, makeConcept };
})(window);
