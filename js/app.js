/* =========================================================
   app.js — 화면 구성 & 게임 진행
   ========================================================= */
(function () {
  'use strict';
  const { T, OPS, BUILD_OPS, SHAPES, key } = window.Shapes;
  const { CHAPTERS, ALL_STAGES, TOTAL_STARS, stageById, nextStageId, buildStage, pick } = window.Stages;
  const { Sound, confetti } = window.FX;

  const $ = sel => document.querySelector(sel);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- 저장 ---------- */
  const SAVE_KEY = 'mg_progress_v1';
  let progress = {};
  try { progress = JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch (e) { progress = {}; }
  const save = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(progress)); } catch (e) {} };
  const starsOf = id => progress[id] || 0;
  const totalStars = () => ALL_STAGES.reduce((s, st) => s + starsOf(st.id), 0);
  const isUnlocked = id => {
    const i = ALL_STAGES.findIndex(s => s.id === id);
    return i === 0 || starsOf(ALL_STAGES[i - 1].id) > 0;
  };

  /* ---------- 토스트 ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
  }

  /* ---------- 도형 렌더 ---------- */
  function shapeHTML(rows, colors, size = 'md') {
    const n = rows.length;
    let cells = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const ch = rows[r][c];
        cells += ch === '.'
          ? '<i class="cell empty"></i>'
          : `<i class="cell" style="background:${colors[ch] || '#94a3b8'}"></i>`;
      }
    }
    return `<div class="grid ${size}" style="--n:${n}">${cells}</div>`;
  }
  const shapeCard = (rows, colors, size) => `<div class="shape-card">${shapeHTML(rows, colors, size)}</div>`;

  /* ---------- 애니메이션 무대 ---------- */
  function ShapeStage(rows, colors, size = 'lg') {
    const wrap = document.createElement('div');
    wrap.className = 'shape-stage';
    const inner = document.createElement('div');
    inner.className = 'stage-inner';
    const guide = document.createElement('div');
    guide.className = 'guide';
    wrap.append(inner, guide);

    const api = {
      el: wrap, rows: rows.slice(), colors, busy: false,
      render() { inner.innerHTML = shapeCard(api.rows, api.colors, size); },
      set(newRows) { api.rows = newRows.slice(); api.render(); },
      play(op, dur = 720) {
        if (api.busy) return Promise.resolve(false);
        api.busy = true;
        Sound.play('move');
        guide.className = 'guide show ' +
          (op === 'flipH' ? 'v' : op === 'flipV' ? 'h' : op.startsWith('rot') ? 'pivot' : '');
        inner.style.transition = `transform ${dur}ms cubic-bezier(.66,-0.12,.3,1.14)`;
        inner.style.transform = OPS[op].css;

        return new Promise(res => {
          setTimeout(() => {
            if (op === 'slide') {                    // 밀기: 모양 그대로, 제자리로 복귀
              inner.style.transform = 'none';
              setTimeout(() => { guide.className = 'guide'; api.busy = false; res(true); }, dur * 0.7);
              return;
            }
            // 데이터를 실제로 변환하고, 화면은 그대로 이어지도록 트랜지션 없이 되돌린다.
            // (rAF는 탭이 백그라운드면 멈추므로 강제 리플로우로 동기 처리한다)
            inner.style.transition = 'none';
            api.rows = T[op](api.rows);
            api.render();
            inner.style.transform = 'none';
            void inner.offsetWidth;
            inner.style.transition = '';
            guide.className = 'guide';
            api.busy = false;
            res(true);
          }, dur + 40);
        });
      }
    };
    api.render();
    return api;
  }

  /* ---------- 화면 전환 ---------- */
  function show(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('is-active'));
    $('#screen-' + name).classList.add('is-active');
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }

  function soundBtnHTML() {
    return `<button class="icon-btn" id="btn-sound" title="소리 켜기/끄기">${Sound.on ? '🔊' : '🔇'}</button>`;
  }
  function bindSound() {
    const b = $('#btn-sound');
    if (b) b.onclick = () => { const on = Sound.toggle(); b.textContent = on ? '🔊' : '🔇'; if (on) Sound.play('tap'); };
  }

  /* =========================================================
     홈
     ========================================================= */
  function renderHome() {
    const st = totalStars();
    const demo = [SHAPES[0], SHAPES[1], SHAPES[3] || SHAPES[2]];
    $('#screen-home').innerHTML = `
      <div class="topbar">
        <div class="topbar-title" style="text-align:right"></div>
        ${soundBtnHTML()}
      </div>
      <div class="hero">
        <span class="hero-badge">초등 4학년 · 평면도형의 이동</span>
        <h1>도형 이동 대탐험</h1>
        <p>밀기 · 뒤집기 · 돌리기를<br>눈으로 보고, 손으로 움직이며 배워요!</p>
        <div class="hero-shapes">
          ${demo.map(s => shapeHTML(s.rows, s.colors, 'sm')).join('')}
        </div>
      </div>

      <div class="star-bar">
        <span class="big">⭐</span>
        <span class="txt">${st} / ${TOTAL_STARS}<small>모은 별</small></span>
        <span class="progress"><i style="width:${(st / TOTAL_STARS * 100).toFixed(1)}%"></i></span>
      </div>

      <div class="menu">
        <button class="menu-item" data-go="learn">
          <span class="menu-emoji">🔍</span>
          <span class="menu-text"><b>배우기 놀이터</b><span>버튼을 눌러 도형이 어떻게 움직이는지 직접 확인해요</span></span>
          <span class="menu-arrow">›</span>
        </button>
        <button class="menu-item" data-go="map">
          <span class="menu-emoji">🗺️</span>
          <span class="menu-text"><b>도전하기</b><span>15개 스테이지를 차례로 깨고 별을 모아요</span></span>
          <span class="menu-arrow">›</span>
        </button>
        <button class="menu-item" data-go="random">
          <span class="menu-emoji">🎲</span>
          <span class="menu-text"><b>랜덤 연습</b><span>모든 유형이 섞여 나오는 8문제 연습</span></span>
          <span class="menu-arrow">›</span>
        </button>
      </div>

      <div class="card" style="margin-top:14px">
        <div class="tip" style="margin:0">
          <span class="bulb">💡</span>
          <span><b>밀기</b>는 위치만 바뀌고, <b>뒤집기</b>는 거울처럼 반대로,
          <b>돌리기</b>는 가운데 점을 중심으로 빙글! 세 가지 모두 <b>모양과 크기는 변하지 않아요.</b></span>
        </div>
      </div>
    `;
    bindSound();
    $('#screen-home').querySelectorAll('[data-go]').forEach(b => {
      b.onclick = () => {
        Sound.play('tap');
        const go = b.dataset.go;
        if (go === 'learn') renderLearn();
        else if (go === 'map') renderMap();
        else startStage({
          id: 'random', name: '랜덤 연습', ops: window.Shapes.MOVE_OPS,
          types: ['predict', 'identify', 'build'], count: 8, buildSteps: [1, 2],
          chapter: { title: '연습', color: '#0ea5e9' }
        }, true);
      };
    });
  }

  /* =========================================================
     배우기 놀이터
     ========================================================= */
  function renderLearn() {
    let shape = SHAPES[0];
    let stage = null;

    const el = $('#screen-learn');
    el.innerHTML = `
      <div class="topbar">
        <button class="icon-btn" id="l-back">‹</button>
        <div class="topbar-title">배우기 놀이터<div class="topbar-sub">버튼을 눌러 도형을 움직여 보세요</div></div>
        ${soundBtnHTML()}
      </div>
      <div class="card">
        <div class="chips" id="l-chips"></div>
        <div class="learn-stage" id="l-stage"></div>
        <div class="ghost-note" id="l-note">👆 아래 버튼을 눌러 보세요</div>
        <div class="op-grid" id="l-ops"></div>
        <div style="display:flex;gap:10px;margin-top:12px">
          <button class="btn ghost block" id="l-reset">↩︎ 처음 모양으로</button>
        </div>
        <div class="tip" id="l-tip">
          <span class="bulb">💡</span>
          <span id="l-tip-text">도형을 <b>밀기</b>, <b>뒤집기</b>, <b>돌리기</b> 해도 모양과 크기는 절대 변하지 않아요!</span>
        </div>
      </div>
    `;
    bindSound();
    $('#l-back').onclick = () => { Sound.play('tap'); renderHome(); };

    $('#l-chips').innerHTML = SHAPES.map((s, i) =>
      `<button class="chip ${i === 0 ? 'on' : ''}" data-i="${i}">${s.emoji} ${s.name}</button>`).join('');

    $('#l-ops').innerHTML = ['slide', 'flipH', 'flipV', 'rot90', 'rot180', 'rot270'].map(k =>
      `<button class="op-btn" data-op="${k}"><span class="oi">${OPS[k].icon}</span><span>${OPS[k].short}</span></button>`).join('');

    function mount() {
      stage = ShapeStage(shape.rows, shape.colors, 'lg');
      const host = $('#l-stage');
      host.innerHTML = '';
      host.appendChild(stage.el);
    }
    mount();

    $('#l-chips').onclick = e => {
      const b = e.target.closest('.chip'); if (!b) return;
      Sound.play('tap');
      $('#l-chips').querySelectorAll('.chip').forEach(c => c.classList.remove('on'));
      b.classList.add('on');
      shape = SHAPES[+b.dataset.i];
      mount();
      $('#l-note').textContent = '👆 아래 버튼을 눌러 보세요';
    };

    $('#l-ops').onclick = async e => {
      const b = e.target.closest('.op-btn'); if (!b || stage.busy) return;
      const op = b.dataset.op;
      $('#l-ops').querySelectorAll('.op-btn').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      $('#l-tip-text').innerHTML = OPS[op].tip;
      $('#l-note').textContent = `${OPS[op].label} 중…`;
      await stage.play(op);
      const same = key(stage.rows) === key(shape.rows);
      $('#l-note').textContent = same ? '✨ 처음 모양으로 돌아왔어요!' : `${OPS[op].short} 완료!`;
    };

    $('#l-reset').onclick = () => {
      Sound.play('tap'); stage.set(shape.rows);
      $('#l-ops').querySelectorAll('.op-btn').forEach(x => x.classList.remove('on'));
      $('#l-note').textContent = '처음 모양으로 되돌렸어요';
    };

    show('learn');
  }

  /* =========================================================
     스테이지 지도
     ========================================================= */
  function renderMap() {
    const st = totalStars();
    $('#screen-map').innerHTML = `
      <div class="topbar">
        <button class="icon-btn" id="m-back">‹</button>
        <div class="topbar-title">도전하기<div class="topbar-sub">⭐ ${st} / ${TOTAL_STARS} 개 수집</div></div>
        ${soundBtnHTML()}
      </div>
      ${CHAPTERS.map(ch => `
        <div class="chapter">
          <div class="chapter-head">
            <span class="chapter-emoji">${ch.emoji}</span>
            <span><b>${ch.title}</b><span>${ch.desc}</span></span>
          </div>
          <div class="stage-list">
            ${ch.stages.map((s, i) => {
              const stars = starsOf(s.id), open = isUnlocked(s.id);
              return `<button class="stage-item ${open ? '' : 'locked'} ${stars ? 'cleared' : ''}"
                        data-stage="${s.id}" ${open ? '' : 'disabled'}>
                <span class="stage-no" style="--c:${ch.color}">${open ? (stars ? '✓' : ch.id + '-' + (i + 1)) : '🔒'}</span>
                <span class="stage-meta">
                  <b>${s.name}${s.boss ? '<span class="boss-tag">BOSS</span>' : ''}</b>
                  <span>${s.count}문제 · ${typeLabel(s.types)}</span>
                </span>
                <span class="stars"><i class="${stars > 0 ? 'on' : ''}">⭐</i><i class="${stars > 1 ? 'on' : ''}">⭐</i><i class="${stars > 2 ? 'on' : ''}">⭐</i></span>
              </button>`;
            }).join('')}
          </div>
        </div>`).join('')}
    `;
    bindSound();
    $('#m-back').onclick = () => { Sound.play('tap'); renderHome(); };
    $('#screen-map').querySelectorAll('[data-stage]').forEach(b => {
      b.onclick = () => {
        const s = stageById(b.dataset.stage);
        if (!isUnlocked(s.id)) { toast('앞 스테이지를 먼저 클리어하세요!'); return; }
        Sound.play('tap'); startStage(s);
      };
    });
    show('map');
  }

  function typeLabel(types) {
    const m = { predict: '결과 맞히기', identify: '동작 찾기', build: '직접 조작' };
    return types.map(t => m[t]).join(' + ');
  }

  /* =========================================================
     문제 풀이
     ========================================================= */
  let S = null; // 현재 세션

  function startStage(stage, isRandom) {
    S = {
      stage, isRandom: !!isRandom,
      qs: buildStage(stage),
      idx: 0, correct: 0, combo: 0, bestCombo: 0, results: []
    };
    renderQuestion();
    show('quiz');
  }

  function dotsHTML() {
    return S.qs.map((_, i) => {
      const r = S.results[i];
      return `<i class="${i === S.idx ? 'cur' : r === true ? 'ok' : r === false ? 'no' : ''}"></i>`;
    }).join('');
  }

  function headHTML() {
    return `
      <div class="topbar">
        <button class="icon-btn" id="q-back">✕</button>
        <div class="topbar-title">${S.stage.name}
          <div class="topbar-sub">${S.idx + 1} / ${S.qs.length} 문제</div>
        </div>
        ${soundBtnHTML()}
      </div>
      <div class="quiz-head">
        <span class="dots">${dotsHTML()}</span>
        ${S.combo >= 2 ? `<span class="combo">🔥 ${S.combo}연속!</span>` : ''}
      </div>`;
  }

  function renderQuestion() {
    const q = S.qs[S.idx];
    if (q.type === 'predict') renderPredict(q);
    else if (q.type === 'identify') renderIdentify(q);
    else renderBuild(q);
    $('#q-back').onclick = () => {
      Sound.play('tap');
      S.isRandom ? renderHome() : renderMap();
    };
    bindSound();
  }

  /* ---------- 유형 1: 결과 맞히기 ---------- */
  function renderPredict(q) {
    $('#screen-quiz').innerHTML = `
      ${headHTML()}
      <div class="card">
        <div class="q-prompt">${q.prompt}</div>
        <div class="center"><span class="q-op-chip">${OPS[q.op].icon} ${OPS[q.op].label}</span></div>
        <div class="center" id="q-stage"></div>
        <div class="pair-label">처음 도형</div>
        <div class="answer-grid" id="q-opts">
          ${q.options.map((o, i) => `
            <button class="answer" data-i="${i}">
              <span class="tagno">${i + 1}</span>
              ${shapeHTML(o, q.shape.colors, 'sm')}
            </button>`).join('')}
        </div>
        <div id="q-feed"></div>
      </div>`;

    const stage = ShapeStage(q.shape.rows, q.shape.colors, 'md');
    $('#q-stage').appendChild(stage.el);

    $('#q-opts').onclick = async e => {
      const b = e.target.closest('.answer'); if (!b || $('#q-opts').dataset.done) return;
      $('#q-opts').dataset.done = '1';
      const chosen = +b.dataset.i;
      const ok = chosen === q.answerIndex;
      const opts = [...$('#q-opts').children];
      opts.forEach((o, i) => {
        if (i === q.answerIndex) o.classList.add('correct');
        else if (i === chosen) o.classList.add('wrong');
        else o.classList.add('dim');
      });
      await showFeedback(ok, q, stage);
    };
  }

  /* ---------- 유형 2: 동작 찾기 ---------- */
  function renderIdentify(q) {
    $('#screen-quiz').innerHTML = `
      ${headHTML()}
      <div class="card">
        <div class="q-prompt">${q.prompt}</div>
        <div class="pair" style="margin:14px 0 2px">
          <div>
            <div class="center" id="q-stage"></div>
            <div class="pair-label">처음</div>
          </div>
          <span class="arrow">➜</span>
          <div>
            <div class="center">${shapeCard(q.result, q.shape.colors, 'md')}</div>
            <div class="pair-label">움직인 뒤</div>
          </div>
        </div>
        <div class="answer-grid" id="q-opts">
          ${q.options.map((op, i) => `
            <button class="answer text-opt" data-i="${i}">
              <span class="oi">${OPS[op].icon}</span><span>${OPS[op].label}</span>
            </button>`).join('')}
        </div>
        <div id="q-feed"></div>
      </div>`;

    const stage = ShapeStage(q.shape.rows, q.shape.colors, 'md');
    $('#q-stage').appendChild(stage.el);

    $('#q-opts').onclick = async e => {
      const b = e.target.closest('.answer'); if (!b || $('#q-opts').dataset.done) return;
      $('#q-opts').dataset.done = '1';
      const chosen = +b.dataset.i;
      const ok = chosen === q.answerIndex;
      [...$('#q-opts').children].forEach((o, i) => {
        if (i === q.answerIndex) o.classList.add('correct');
        else if (i === chosen) o.classList.add('wrong');
        else o.classList.add('dim');
      });
      await showFeedback(ok, q, stage);
    };
  }

  /* ---------- 유형 3: 직접 조작 ---------- */
  function renderBuild(q) {
    $('#screen-quiz').innerHTML = `
      ${headHTML()}
      <div class="card">
        <div class="q-prompt">${q.prompt}</div>
        <div class="build-wrap" style="margin:14px 0 2px">
          <div class="build-col">
            <div class="center" id="q-stage"></div>
            <div class="lbl">지금 모양</div>
          </div>
          <span class="arrow" style="align-self:center;font-size:22px;color:#c3ccdf">➜</span>
          <div class="build-col target" id="q-target">
            <div class="center">${shapeCard(q.target, q.shape.colors, 'md')}</div>
            <div class="lbl">🎯 목표 모양</div>
          </div>
        </div>
        <div class="move-count" id="q-moves">움직인 횟수 <b>0</b>번 · 최소 <b>${q.minStep}</b>번이면 성공!</div>
        <div class="op-grid" id="q-ops">
          ${(q.buildOps || BUILD_OPS).map(k => `<button class="op-btn" data-op="${k}"><span class="oi">${OPS[k].icon}</span><span>${OPS[k].short}</span></button>`).join('')}
        </div>
        <button class="btn ghost block" id="q-reset" style="margin-top:10px">↩︎ 처음부터 다시</button>
        <div id="q-feed"></div>
      </div>`;

    const stage = ShapeStage(q.shape.rows, q.shape.colors, 'md');
    $('#q-stage').appendChild(stage.el);
    let moves = 0, done = false;

    const updateMoves = () =>
      $('#q-moves').innerHTML = `움직인 횟수 <b>${moves}</b>번 · 최소 <b>${q.minStep}</b>번이면 성공!`;

    $('#q-ops').onclick = async e => {
      const b = e.target.closest('.op-btn'); if (!b || done || stage.busy) return;
      moves++; updateMoves();
      await stage.play(b.dataset.op, 640);
      if (key(stage.rows) === key(q.target)) {
        done = true;
        $('#q-target').classList.add('hit');
        const perfect = moves <= q.minStep;
        await showFeedback(true, q, null, perfect
          ? `<b>완벽해요!</b> 최소 횟수 ${q.minStep}번 만에 목표 모양을 만들었어요! 🎯`
          : `<b>성공!</b> ${moves}번 만에 완성했어요. 최소 ${q.minStep}번으로도 가능하답니다!`);
      }
    };

    $('#q-reset').onclick = () => {
      if (done || stage.busy) return;
      Sound.play('tap'); stage.set(q.shape.rows); moves = 0; updateMoves();
    };
  }

  /* ---------- 정답/오답 피드백 ---------- */
  async function showFeedback(ok, q, stage, customMsg) {
    S.results[S.idx] = ok;
    if (ok) { S.correct++; S.combo++; S.bestCombo = Math.max(S.bestCombo, S.combo); Sound.play('correct'); confetti(ok ? 28 : 0); }
    else { S.combo = 0; Sound.play('wrong'); }

    const praise = ['정답이에요!', '훌륭해요!', '멋져요!', '척척박사!', '완벽해요!'];
    let msg = customMsg;
    if (!msg) {
      msg = ok
        ? `<b>${pick(praise)}</b> ${OPS[q.op].tip}`
        : `<b>아쉬워요!</b> ${OPS[q.op].tip}<br>아래에서 실제로 움직이는 모습을 확인해 보세요 👀`;
    }

    $('#q-feed').innerHTML = `
      <div class="feedback ${ok ? 'ok' : 'no'}">
        <span class="fi">${ok ? '🎉' : '🤔'}</span><span>${msg}</span>
      </div>
      <div class="mascot ${ok ? 'happy' : 'sad'}" style="margin-top:10px">${ok ? '🦊' : '🐣'}</div>
      <button class="btn block" id="q-next" style="margin-top:14px">
        ${S.idx === S.qs.length - 1 ? '결과 보기 🏁' : '다음 문제 ›'}
      </button>`;

    // 해설 애니메이션: 실제로 도형을 움직여 보여준다
    if (stage && q.op) { await wait(ok ? 320 : 520); await stage.play(q.op, 820); }

    $('#q-next').onclick = () => {
      Sound.play('tap');
      S.idx++;
      if (S.idx >= S.qs.length) renderResult();
      else renderQuestion();
    };
  }

  /* =========================================================
     결과
     ========================================================= */
  function renderResult() {
    const total = S.qs.length, correct = S.correct;
    const rate = correct / total;
    const stars = rate === 1 ? 3 : rate >= 0.8 ? 2 : rate >= 0.6 ? 1 : 0;

    let isNewBest = false;
    if (!S.isRandom && stars > starsOf(S.stage.id)) { progress[S.stage.id] = stars; save(); isNewBest = true; }

    const titles = ['다시 도전해요!', '잘했어요!', '훌륭해요!', '완벽해요!'];
    const emojis = ['🐣', '🙂', '😄', '🏆'];
    const nid = S.isRandom ? null : nextStageId(S.stage.id);

    $('#screen-result').innerHTML = `
      <div class="card result-box">
        <div style="font-size:clamp(46px,12vw,64px)">${emojis[stars]}</div>
        <div class="result-title">${titles[stars]}</div>
        <div class="result-sub">${S.stage.name}</div>
        <div class="big-stars"><i>⭐</i><i>⭐</i><i>⭐</i></div>
        <div class="score-line">
          <div><b>${correct}/${total}</b><span>맞힌 문제</span></div>
          <div><b>${Math.round(rate * 100)}%</b><span>정답률</span></div>
          <div><b>${S.bestCombo}</b><span>최고 연속</span></div>
        </div>
        ${isNewBest ? '<div style="margin-top:12px;font-weight:900;color:var(--amber)">🎊 신기록 달성!</div>' : ''}
        ${stars === 0 ? '<div style="margin-top:12px;font-weight:700;color:var(--ink-soft);font-size:14px">별을 받으려면 60% 이상 맞혀야 해요. 다시 도전!</div>' : ''}
        <div class="result-actions">
          ${nid && stars > 0 ? `<button class="btn accent block" id="r-next">다음 스테이지 ›</button>` : ''}
          <button class="btn ${nid && stars > 0 ? 'ghost' : ''} block" id="r-retry">🔄 다시 풀기</button>
          <button class="btn ghost block" id="r-map">${S.isRandom ? '🏠 처음으로' : '🗺️ 지도로 돌아가기'}</button>
        </div>
      </div>`;

    show('result');

    // 별 연출
    const starEls = $('#screen-result').querySelectorAll('.big-stars i');
    for (let i = 0; i < stars; i++) {
      setTimeout(() => { starEls[i].classList.add('on'); Sound.play('star'); }, 380 + i * 380);
    }
    if (stars === 3) setTimeout(() => { confetti(110); Sound.play('clear'); }, 380 + stars * 380);
    else if (stars > 0) setTimeout(() => confetti(45), 380 + stars * 380);

    const retryStage = S.stage, wasRandom = S.isRandom;
    const rn = $('#r-next'); if (rn) rn.onclick = () => { Sound.play('tap'); startStage(stageById(nid)); };
    $('#r-retry').onclick = () => { Sound.play('tap'); startStage(retryStage, wasRandom); };
    $('#r-map').onclick = () => { Sound.play('tap'); wasRandom ? renderHome() : renderMap(); };
  }

  /* ---------- 시작 ---------- */
  renderHome();
  show('home');
  document.addEventListener('click', function unlock() {
    Sound.play('tap');
    document.removeEventListener('click', unlock);
  }, { once: true });
})();
