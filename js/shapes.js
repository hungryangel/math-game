/* =========================================================
   shapes.js — 도형 데이터 & 변환(밀기/뒤집기/돌리기) 로직
   ========================================================= */
(function (global) {
  'use strict';

  /* ---------- 변환 함수 ----------
     격자(rows)는 5x5 문자열 배열. '.'은 빈 칸, 나머지 문자는 색 키.
     항상 '틀(격자 전체)' 안에서 변환하므로 위치 변화까지 학습된다. */
  const T = {
    id:     g => g.slice(),
    flipH:  g => g.map(row => row.split('').reverse().join('')),          // 좌우 뒤집기
    flipV:  g => g.slice().reverse(),                                     // 상하 뒤집기
    rot90:  g => g[0].split('').map((_, c) => g.map(r => r[c]).reverse().join('')), // 시계 90°
    rot180: g => T.flipH(T.flipV(g)),
    rot270: g => T.rot90(T.rot180(g)),
    slide:  g => g.slice()                                                // 밀기 = 모양 그대로
  };

  /* ---------- 동작(조작) 정의 ---------- */
  const OPS = {
    slide:  { key: 'slide',  short: '밀기',        label: '밀기',                     icon: '➡',  css: 'translate3d(28%,0,0)',
              tip: '밀기는 <b>위치만</b> 바뀌고 모양은 그대로예요. 아무리 밀어도 도형은 변하지 않아요!' },
    flipH:  { key: 'flipH',  short: '좌우 뒤집기', label: '왼쪽·오른쪽으로 뒤집기',   icon: '↔',  css: 'rotateY(180deg)',
              tip: '세로 점선을 거울처럼 두고 <b>좌우</b>를 바꿔요. 왼쪽 끝은 오른쪽 끝으로 이동!' },
    flipV:  { key: 'flipV',  short: '상하 뒤집기', label: '위·아래로 뒤집기',         icon: '↕',  css: 'rotateX(180deg)',
              tip: '가로 점선을 거울처럼 두고 <b>위아래</b>를 바꿔요. 위쪽 줄은 아래쪽 줄로 이동!' },
    rot90:  { key: 'rot90',  short: '시계 90°',    label: '시계 방향으로 90° 돌리기', icon: '↻',  css: 'rotate(90deg)',
              tip: '가운데 점을 중심으로 시계 방향 90°! <b>위쪽이 오른쪽</b>으로 가요.' },
    rot180: { key: 'rot180', short: '180° 돌리기', label: '시계 방향으로 180° 돌리기',icon: '⟳',  css: 'rotate(180deg)',
              tip: '반 바퀴 돌리기! <b>위쪽이 아래쪽</b>으로 가요. 시계 방향·반시계 방향 결과가 같아요.' },
    rot270: { key: 'rot270', short: '반시계 90°',  label: '시계 반대 방향으로 90° 돌리기', icon: '↺', css: 'rotate(-90deg)',
              tip: '반시계 방향 90°! <b>위쪽이 왼쪽</b>으로 가요. 시계 방향 270°와 같아요.' }
  };

  const MOVE_OPS  = ['flipH', 'flipV', 'rot90', 'rot180', 'rot270']; // 문제에 쓰는 동작
  const BUILD_OPS = ['flipH', 'flipV', 'rot90', 'rot270'];           // 직접 조작용 버튼

  /* ---------- 도형 데이터 ---------- */
  const RAW_SHAPES = [
    { id: 'flag', name: '깃발', emoji: '🚩',
      rows: ['BRRR.', 'BRRR.', 'BRR..', 'B....', 'B....'],
      colors: { B: '#8b5e34', R: '#fb5a72' } },

    { id: 'fish', name: '물고기', emoji: '🐟',
      rows: ['.b.oo', '.bbbo', 'bkbbb', '.bbbo', '...oo'],
      colors: { b: '#38bdf8', k: '#0f2740', o: '#fb923c' } },

    { id: 'rocket', name: '로켓', emoji: '🚀',
      rows: ['..r..', '.rwr.', '.rrr.', 'frrrf', '.yy..'],
      colors: { r: '#f76c6c', w: '#dff2ff', f: '#facc15', y: '#fb923c' } },

    { id: 'giyeok', name: 'ㄱ 도형', emoji: '📐',
      rows: ['pppp.', 'p....', 'p....', '.....', '.....'],
      colors: { p: '#a78bfa' } },

    { id: 'dog', name: '강아지', emoji: '🐶',
      rows: ['d...d', 'ddddd', 'dkdkd', 'ddddd', '..dt.'],
      colors: { d: '#c99268', k: '#3b2418', t: '#fb7185' } },

    { id: 'house', name: '집', emoji: '🏠',
      rows: ['..h..', '.hhh.', 'hhhhh', 'wwwww', 'wwd.w'],
      colors: { h: '#ef6461', w: '#fde8c9', d: '#8b5e34' } },

    { id: 'letterF', name: 'F 모양', emoji: '🔤',
      rows: ['ffff.', 'f....', 'fff..', 'f....', 'f....'],
      colors: { f: '#22d3ee' } },

    { id: 'letterP', name: 'P 모양', emoji: '🅿️',
      rows: ['ppp..', 'p..p.', 'ppp..', 'p....', 'p....'],
      colors: { p: '#34d399' } },

    { id: 'cup', name: '컵', emoji: '☕',
      rows: ['ccccc', 'c...c', 'c..cs', 'ccc.s', '..c..'],
      colors: { c: '#f472b6', s: '#fbbf24' } },

    { id: 'boot', name: '장화', emoji: '👢',
      rows: ['gg...', 'gg...', 'gg...', 'gggg.', 'ggggg'],
      colors: { g: '#60a5fa' } }
  ];

  /* ---------- 검증: 8가지 변환 결과가 모두 서로 달라야 문제로 쓸 수 있다 ----------
     (대칭인 도형은 "뒤집기와 돌리기 결과가 같아짐" → 정답이 두 개가 되어버림) */
  function key(rows) { return rows.join('/'); }

  function isFullyAsymmetric(rows) {
    const variants = ['id', 'flipH', 'flipV', 'rot90', 'rot180', 'rot270'].map(op => key(T[op](rows)));
    // 대각선 대칭(전치)도 확인
    const n = rows.length;
    const transpose = rows[0].split('').map((_, c) => rows.map(r => r[c]).join(''));
    variants.push(key(transpose), key(T.flipH(T.flipV(transpose))));
    return new Set(variants).size === variants.length;
  }

  const SHAPES = RAW_SHAPES.filter(s => {
    const ok = isFullyAsymmetric(s.rows);
    if (!ok) console.warn('[shapes] 대칭 도형이라 제외됨:', s.id);
    return ok;
  });

  /* ---------- 최소 조작 횟수 (BFS, D4 군은 최대 8개 상태) ---------- */
  function minSteps(fromRows, toRows, ops) {
    const goal = key(toRows);
    if (key(fromRows) === goal) return 0;
    const seen = new Set([key(fromRows)]);
    let frontier = [fromRows], depth = 0;
    while (frontier.length && depth < 6) {
      depth++;
      const next = [];
      for (const cur of frontier) {
        for (const op of ops) {
          const nx = T[op](cur), k = key(nx);
          if (k === goal) return depth;
          if (!seen.has(k)) { seen.add(k); next.push(nx); }
        }
      }
      frontier = next;
    }
    return depth;
  }

  global.Shapes = { T, OPS, MOVE_OPS, BUILD_OPS, SHAPES, key, minSteps };
})(window);
