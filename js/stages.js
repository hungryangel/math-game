/* =========================================================
   stages.js — 챕터/스테이지 구성 & 문제 생성기
   ========================================================= */
(function (global) {
  'use strict';
  const { T, OPS, MOVE_OPS, BUILD_OPS, SHAPES, key, minSteps } = global.Shapes;

  const rnd = n => Math.floor(Math.random() * n);
  const pick = arr => arr[rnd(arr.length)];
  const shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  /* ---------- 챕터 & 스테이지 ---------- */
  const CHAPTERS = [
    {
      id: 1, title: '뒤집기 마을', emoji: '🪞', color: '#6366f1',
      desc: '거울처럼 좌우·위아래를 바꿔 봐요',
      stages: [
        { id: '1-1', name: '좌우로 뒤집기', ops: ['flipH'], types: ['predict'], count: 5 },
        { id: '1-2', name: '위아래로 뒤집기', ops: ['flipV'], types: ['predict'], count: 5 },
        { id: '1-3', name: '두 가지 뒤집기', ops: ['flipH', 'flipV'], types: ['predict'], count: 5 },
        { id: '1-4', name: '무슨 뒤집기였을까?', ops: ['flipH', 'flipV'], types: ['identify'], count: 5 },
        { id: '1-5', name: '직접 뒤집어 보기', ops: ['flipH', 'flipV'], types: ['build'], count: 4, buildSteps: [1, 2] }
      ]
    },
    {
      id: 2, title: '돌리기 숲', emoji: '🎡', color: '#f59e0b',
      desc: '가운데 점을 중심으로 빙글빙글!',
      stages: [
        { id: '2-1', name: '시계 방향 90°', ops: ['rot90'], types: ['predict'], count: 5 },
        { id: '2-2', name: '180° 돌리기', ops: ['rot180'], types: ['predict'], count: 5 },
        { id: '2-3', name: '반시계 방향 90°', ops: ['rot270'], types: ['predict'], count: 5 },
        { id: '2-4', name: '돌리기 총집합', ops: ['rot90', 'rot180', 'rot270'], types: ['predict'], count: 6 },
        { id: '2-5', name: '몇 도 돌렸을까?', ops: ['rot90', 'rot180', 'rot270'], types: ['identify'], count: 5 }
      ]
    },
    {
      id: 3, title: '이동 대탐험', emoji: '🏆', color: '#ec4899',
      desc: '뒤집기와 돌리기를 모두 섞어서!',
      stages: [
        { id: '3-1', name: '섞어서 맞히기', ops: MOVE_OPS, types: ['predict'], count: 6 },
        { id: '3-2', name: '어떤 동작이었을까', ops: MOVE_OPS, types: ['identify'], count: 6 },
        { id: '3-3', name: '두 번 조작하기', ops: BUILD_OPS, types: ['build'], count: 4, buildSteps: [2, 2] },
        { id: '3-4', name: '실전 연습', ops: MOVE_OPS, types: ['predict', 'identify'], count: 6 },
        { id: '3-5', name: '최종 도전!', ops: MOVE_OPS, types: ['predict', 'identify', 'build'], count: 8, buildSteps: [1, 3], boss: true }
      ]
    },
    {
      // 교과서와 같은 형식: 모눈종이에 점을 찍어 이동한 도형을 직접 그린다
      id: 4, title: '교과서 모눈종이', emoji: '📐', color: '#0ea5e9',
      desc: '모눈종이에 점을 찍어 직접 그려요',
      stages: [
        { id: '4-1', name: '모눈종이에 밀기', ops: [], types: ['draw'], kinds: ['slide'], count: 3 },
        { id: '4-2', name: '기준선으로 좌우 뒤집기', ops: [], types: ['draw'], kinds: ['flipH'], count: 3 },
        { id: '4-3', name: '기준선으로 위아래 뒤집기', ops: [], types: ['draw'], kinds: ['flipV'], count: 3 },
        { id: '4-4', name: '한 점을 중심으로 돌리기', ops: [], types: ['draw'], kinds: ['rot90', 'rot180', 'rot270'], count: 3 },
        { id: '4-5', name: '교과서 종합 문제', ops: [], types: ['draw'],
          kinds: ['slide', 'flipH', 'flipV', 'rot90', 'rot180', 'rot270'], count: 4, boss: true }
      ]
    }
  ];

  const ALL_STAGES = CHAPTERS.flatMap(c => c.stages.map(s => ({ ...s, chapter: c })));
  const TOTAL_STARS = ALL_STAGES.length * 3;

  function stageById(id) { return ALL_STAGES.find(s => s.id === id); }
  function nextStageId(id) {
    const i = ALL_STAGES.findIndex(s => s.id === id);
    return i >= 0 && i < ALL_STAGES.length - 1 ? ALL_STAGES[i + 1].id : null;
  }

  /* ---------- 문제 생성 ---------- */

  // 유형 1: 변환 결과 고르기
  function makePredict(cfg, shape) {
    const op = pick(cfg.ops);
    const answer = T[op](shape.rows);
    const ansKey = key(answer);

    // 오답 후보 우선순위: 이 스테이지의 다른 동작 → 처음 모양 그대로 → 나머지 동작
    const ordered = [
      ...shuffle(cfg.ops.filter(o => o !== op)),
      'id',
      ...shuffle(MOVE_OPS.filter(o => o !== op && !cfg.ops.includes(o)))
    ];
    const pool = [];
    const seen = new Set([ansKey]);
    for (const o of ordered) {
      const g = T[o](shape.rows), k = key(g);
      if (!seen.has(k)) { seen.add(k); pool.push(g); }
    }
    const options = shuffle([answer, ...pool.slice(0, 3)]);
    return {
      type: 'predict', shape, op,
      prompt: `이 도형을 <b>${OPS[op].label}</b> 하면 어떤 모양이 될까요?`,
      options, answerIndex: options.findIndex(o => key(o) === ansKey)
    };
  }

  // 유형 2: 어떤 동작을 했는지 고르기
  function makeIdentify(cfg, shape) {
    const op = pick(cfg.ops);
    const result = T[op](shape.rows);
    const ok = o => o !== op && key(T[o](shape.rows)) !== key(result);
    // 오답 후보는 이 스테이지가 다루는 동작에서 먼저 뽑고(핵심 구별 연습), 모자라면 나머지에서 채운다.
    const others = [
      ...shuffle(cfg.ops.filter(ok)),
      ...shuffle(MOVE_OPS.filter(o => ok(o) && !cfg.ops.includes(o)))
    ].slice(0, 3);
    const options = shuffle([op, ...others]);
    return {
      type: 'identify', shape, op, result,
      prompt: '왼쪽 도형을 어떻게 움직여서 오른쪽 도형이 되었을까요?',
      options, answerIndex: options.indexOf(op)
    };
  }

  // 유형 3: 직접 조작해서 목표 모양 만들기
  // 스테이지가 다루는 동작(cfg.ops)만 버튼으로 제공하고, 목표도 그 동작들로만 만든다.
  function makeBuild(cfg, shape) {
    const ops = BUILD_OPS.filter(o => cfg.ops.includes(o));
    const usable = ops.length ? ops : BUILD_OPS;
    const range = cfg.buildSteps || [1, 2];
    const want = range[0] + rnd(range[1] - range[0] + 1);

    let target = shape.rows;
    for (let i = 0; i < want; i++) target = T[pick(usable)](target);
    if (key(target) === key(shape.rows)) target = T[pick(usable)](shape.rows); // 시작=목표 방지

    return {
      type: 'build', shape, target, buildOps: usable,
      minStep: minSteps(shape.rows, target, usable),
      prompt: '버튼을 눌러 <b>오른쪽 목표 모양</b>과 똑같이 만들어 보세요!'
    };
  }

  function makeQuestion(cfg, usedShapeIds) {
    if (cfg.types.length === 1 && cfg.types[0] === 'draw') return global.GridMode.makeDraw(cfg);

    const avail = SHAPES.filter(s => !usedShapeIds.has(s.id));
    const shape = pick(avail.length ? avail : SHAPES);
    usedShapeIds.add(shape.id);
    if (usedShapeIds.size >= SHAPES.length) usedShapeIds.clear();

    const type = pick(cfg.types);
    if (type === 'draw') return global.GridMode.makeDraw(cfg);
    if (type === 'identify') return makeIdentify(cfg, shape);
    if (type === 'build') return makeBuild(cfg, shape);
    return makePredict(cfg, shape);
  }

  function buildStage(stage) {
    const used = new Set();
    const qs = [];
    for (let i = 0; i < stage.count; i++) qs.push(makeQuestion(stage, used));
    return qs;
  }

  global.Stages = { CHAPTERS, ALL_STAGES, TOTAL_STARS, stageById, nextStageId, buildStage, pick, shuffle };
})(window);
