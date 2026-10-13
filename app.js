'use strict';
(() => {
  const $ = (id) => document.getElementById(id);
  const letters = ['A','B','C','D'];
  const STORAGE_KEY = 'sinh12_kntt_attempts_v1';
  const STUDENT_KEY = 'sinh12_kntt_student_v1';
  const state = {
    test: null, started: false, submitted: false, submitting: false,
    answers: {}, result: null, remaining: 900, timerId: null,
    currentQuestion: 0, attempts: [], remoteAttempts: []
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }
  function makeStudentId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'student-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }
  let studentId = localStorage.getItem(STUDENT_KEY);
  if (!studentId) { studentId = makeStudentId(); localStorage.setItem(STUDENT_KEY, studentId); }

  function getLocalAttempts() {
    try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }
  function saveLocalAttempt(attempt) {
    const list = getLocalAttempts();
    list.unshift(attempt);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 100)));
    state.attempts = list.slice(0, 100);
  }
  state.attempts = getLocalAttempts();

  function toast(message) {
    const node = $('toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => node.classList.remove('show'), 2600);
  }
  async function requestJSON(url, options) {
    const response = await fetch(url, options);
    let body;
    try { body = await response.json(); } catch { body = {}; }
    if (!response.ok) throw new Error(body.error || `Lỗi hệ thống (${response.status})`);
    return body;
  }
  function setBackendStatus(message, bad = false) {
    $('backendStatus').textContent = message;
    const dot = document.querySelector('.online-dot');
    if (dot) { dot.style.background = bad ? '#d37b50' : '#2ba87d'; dot.style.boxShadow = bad ? '0 0 0 4px #f8e6d9' : '0 0 0 4px #d6f2e4'; }
  }
  function fillTestSelector() {
    $('testSelect').innerHTML = Array.from({length:24}, (_,i) => `<option value="${i+1}">Đề ${String(i+1).padStart(2,'0')} · 10 câu / 15 phút</option>`).join('');
  }
  function updateTestLabels(test) {
    const name = test.title || `Đề luyện tập ${String(test.id).padStart(2,'0')}`;
    $('selectedTestName').textContent = name;
    $('examTitle').textContent = name;
    $('examSub').textContent = `${test.totalQuestions} câu hỏi · Chương I · Bài 1–5`;
  }
  async function loadTest(id, opts = {}) {
    if (state.started && !state.submitted && Object.values(state.answers).some(v => v !== null && v !== undefined)) {
      if (!opts.force && !confirm('Bạn đang làm dở đề. Mở đề mới sẽ xóa các lựa chọn hiện tại. Tiếp tục?')) return;
    }
    stopTimer();
    try {
      $('openTestBtn').disabled = true;
      $('openTestBtn').innerHTML = 'Đang mở…';
      const test = await requestJSON(`/api/test?set=${encodeURIComponent(id)}`);
      state.test = test;
      state.answers = {};
      state.started = false;
      state.submitted = false;
      state.submitting = false;
      state.result = null;
      state.remaining = test.durationSeconds || 900;
      state.currentQuestion = 0;
      updateTestLabels(test);
      $('testSelect').value = String(test.id);
      $('prestart').classList.remove('hidden');
      $('questionArea').classList.add('hidden');
      $('resultArea').classList.add('hidden');
      $('reviewArea').classList.add('hidden');
      $('submitBtn').disabled = true;
      $('submitBtn').innerHTML = 'Nộp bài <span>↗</span>';
      $('startBtn').disabled = false;
      $('startBtn').innerHTML = 'Bắt đầu làm bài <span>→</span>';
      $('resetBtn').disabled = false;
      $('examStatus').className = 'exam-status';
      $('examStatus').innerHTML = '<span></span> Chờ bắt đầu';
      $('timerHint').textContent = 'Bấm bắt đầu để chạy đồng hồ.';
      updateTimerDisplay();
      renderQuestions();
      renderAnswerGrid();
      updateAnswerStats();
      setBackendStatus('Backend đã phản hồi');
      if (opts.scroll) $('examArea').scrollIntoView({behavior:'smooth', block:'start'});
    } catch (error) {
      setBackendStatus('Không kết nối được backend', true);
      toast(`Không mở được đề: ${error.message}. Hãy kiểm tra đã deploy cả thư mục dự án chưa.`);
    } finally {
      $('openTestBtn').disabled = false;
      $('openTestBtn').innerHTML = 'Mở đề <span>→</span>';
    }
  }
  function renderQuestions() {
    if (!state.test) return;
    $('questionArea').innerHTML = `
      <div class="exam-progress-row"><span>Tiến độ làm bài</span><strong id="questionProgressText">0 / 10 câu đã trả lời</strong></div>
      <div class="exam-progress"><span id="questionProgressBar" style="width:0%"></span></div>
      ${state.test.questions.map((question,index) => `
        <section class="question-card" id="question-${index}" data-question-index="${index}">
          <div class="question-head">
            <div class="question-num">${String(index+1).padStart(2,'0')}</div>
            <div><div class="question-meta">${escapeHtml(question.lessonTitle)} · ${escapeHtml(question.level || 'Ôn tập')}</div><div class="question-text">${escapeHtml(question.prompt)}</div></div>
          </div>
          <div class="choice-list">
            ${question.choices.map((choice,j)=>`
              <label class="answer-choice ${state.answers[question.id] === j ? 'selected' : ''}" data-choice-wrap="${escapeHtml(question.id)}-${j}">
                <input type="radio" name="${escapeHtml(question.id)}" value="${j}" ${state.answers[question.id]===j?'checked':''} ${state.submitted?'disabled':''}>
                <span class="choice-letter">${letters[j]}</span><span class="choice-text">${escapeHtml(choice)}</span>
              </label>`).join('')}
          </div>
        </section>`).join('')}`;
    updateAnswerStats();
  }
  function renderAnswerGrid() {
    if (!state.test) return;
    $('answerGrid').innerHTML = state.test.questions.map((q,i)=>`<button type="button" class="answer-jump ${state.answers[q.id] !== undefined && state.answers[q.id] !== null ? 'answered' : ''} ${state.currentQuestion===i?'current':''}" data-jump="${i}" aria-label="Đi đến câu ${i+1}">${i+1}</button>`).join('');
  }
  function updateAnswerStats() {
    if (!state.test) return;
    const answered = state.test.questions.filter(q=>state.answers[q.id] !== undefined && state.answers[q.id] !== null).length;
    $('answeredStat').textContent = `${answered} / ${state.test.totalQuestions}`;
    $('remainingStat').textContent = `${state.test.totalQuestions - answered} câu`;
    const progress = answered / state.test.totalQuestions * 100;
    const text = $('questionProgressText');
    const bar = $('questionProgressBar');
    if (text) text.textContent = `${answered} / ${state.test.totalQuestions} câu đã trả lời`;
    if (bar) bar.style.width = `${progress}%`;
    $('answerGrid').querySelectorAll('[data-jump]').forEach((button,index)=>{
      const question = state.test.questions[index];
      button.classList.toggle('answered', state.answers[question.id] !== undefined && state.answers[question.id] !== null);
      button.classList.toggle('current', index === state.currentQuestion && !state.submitted);
    });
  }
  function beginTest() {
    if (!state.test || state.started || state.submitted) return;
    state.started = true;
    $('prestart').classList.add('hidden');
    $('questionArea').classList.remove('hidden');
    $('examStatus').className = 'exam-status live';
    $('examStatus').innerHTML = '<span></span> Đang làm bài';
    $('timerHint').textContent = 'Tập trung làm bài — hệ thống tự nộp khi hết giờ.';
    $('submitBtn').disabled = false;
    $('startBtn').disabled = true;
    updateTimerDisplay();
    state.timerId = setInterval(() => {
      if (!state.started || state.submitted) return;
      state.remaining = Math.max(0, state.remaining - 1);
      updateTimerDisplay();
      if (state.remaining <= 0) { stopTimer(); submitTest(true); }
    }, 1000);
    $('questionArea').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function stopTimer() { if (state.timerId) clearInterval(state.timerId); state.timerId = null; }
  function updateTimerDisplay() {
    const seconds = Math.max(0, state.remaining);
    const m = Math.floor(seconds / 60); const s = seconds % 60;
    $('timerValue').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    const percent = state.test ? seconds / state.test.durationSeconds * 100 : 100;
    $('timerProgress').style.width = `${percent}%`;
    const warning = seconds <= 60;
    $('timerValue').classList.toggle('warning', warning);
    $('timerProgress').classList.toggle('warning', warning);
    const pulse = document.querySelector('.timer-pulse');
    if (pulse) { pulse.style.background = warning ? '#d8894f' : '#79c69d'; pulse.style.boxShadow = warning ? '0 0 0 4px #f8e5d7' : '0 0 0 4px #e0f4e9'; }
  }
  async function submitTest(auto = false) {
    if (!state.test || !state.started || state.submitted || state.submitting) return;
    const answered = state.test.questions.filter(q=>state.answers[q.id] !== undefined && state.answers[q.id] !== null).length;
    if (!auto && answered < state.test.totalQuestions && !confirm(`Bạn còn ${state.test.totalQuestions-answered} câu chưa trả lời. Vẫn nộp bài?`)) return;
    state.submitting = true;
    stopTimer();
    $('submitBtn').disabled = true;
    $('submitBtn').innerHTML = 'Đang chấm…';
    try {
      const result = await requestJSON('/api/submit', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({testId:state.test.id, answers:state.answers, studentId})
      });
      state.result = result;
      state.submitted = true;
      state.started = false;
      state.submitting = false;
      $('examStatus').className = 'exam-status';
      $('examStatus').innerHTML = '<span></span> Đã chấm bài';
      $('timerHint').textContent = auto ? 'Hết giờ — bài đã được tự động nộp.' : 'Đã nộp bài. Xem giải thích và phân tích lỗ hổng bên dưới.';
      $('questionArea').classList.add('hidden');
      $('resultArea').classList.remove('hidden');
      $('reviewArea').classList.remove('hidden');
      $('submitBtn').disabled = true;
      $('submitBtn').innerHTML = 'Đã nộp bài <span>✓</span>';
      renderResult(result, auto);
      renderReview(result);
      renderAnswerGridAfterSubmit(result);
      const attempt = {
        localId: `${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
        testId:result.testId, title:result.title, score:result.score,
        correctCount:result.correctCount, total:result.total,
        wrongCount:result.wrongCount, skippedCount:result.skippedCount,
        dateISO:new Date().toISOString(), cloudSaved:result.cloudSaved,
        skillStats:result.skillStats, lessonStats:result.lessonStats, weakSpots:result.weakSpots,
        recommendedTests:result.recommendedTests
      };
      saveLocalAttempt(attempt);
      renderDashboard();
      if (result.cloudSaved) setBackendStatus('Backend · đã đồng bộ cloud');
      else setBackendStatus('Backend hoạt động · lịch sử cục bộ');
      $('resultArea').scrollIntoView({behavior:'smooth',block:'start'});
    } catch (error) {
      state.submitting = false;
      $('submitBtn').disabled = false;
      $('submitBtn').innerHTML = 'Thử nộp lại <span>↗</span>';
      toast(`Chưa chấm được bài: ${error.message}. Đáp án vẫn được giữ lại.`);
      setBackendStatus('Lỗi khi chấm bài', true);
    }
  }
  function renderResult(result, auto) {
    const topWeak = result.weakSpots.length;
    const title = result.score >= 9 ? 'Quá tốt, giữ vững nhé!' : result.score >= 7 ? 'Nền tảng khá ổn!' : result.score >= 5 ? 'Đã có nền — mình vá thêm nhé.' : 'Ôn lại nền tảng trước, từng chút một.';
    $('resultArea').innerHTML = `
      <div class="result-hero">
        <div class="score-ring">${Number(result.score).toFixed(1)}<small style="font-size:10px;opacity:.8">/10</small></div>
        <div><h3>${title}</h3><p>${escapeHtml(result.headline)}${auto?' Bài đã tự nộp khi hết giờ.':''}</p>
          <div class="result-counts"><span>✓ ${result.correctCount} đúng</span><span>× ${result.wrongCount} sai</span><span>– ${result.skippedCount} bỏ trống</span><span>${topWeak} nhóm cần xem lại</span></div>
        </div>
      </div>
      <div class="result-subsection"><div class="result-subhead"><h4>Chẩn đoán từ bài vừa làm</h4><span>Backend đã đối chiếu từng câu</span></div>
        ${result.weakSpots.length ? `<div class="diagnosis-list">${result.weakSpots.map(item=>`<article class="diagnosis-card"><div class="diagnosis-card-top"><strong>${escapeHtml(item.skill)}</strong><span class="miss-badge">${item.missed} câu cần ôn${item.skipped ? ` · ${item.skipped} bỏ trống` : ``}</span></div><p><b>${escapeHtml(item.lessonTitle)}</b><br>${escapeHtml(item.repair)}</p></article>`).join('')}</div>` : '<div class="diagnosis-empty"><strong>Chưa phát hiện lỗi trong đề này.</strong><br>Đọc nhanh phần giải thích để củng cố lý do chọn đáp án, rồi thử đề biến thể tiếp theo.</div>'}
      </div>
      <div class="result-subsection"><div class="result-subhead"><h4>Đề nên làm tiếp</h4><span>Ưu tiên nội dung bạn vừa sai</span></div><div class="recommended-row">${result.recommendedTests.map(id=>`<button type="button" class="recommended-test" data-recommended-test="${id}">Đề ${String(id).padStart(2,'0')} <span>→</span></button>`).join('')}</div></div>
      <div class="result-subsection"><div class="result-subhead"><h4>Độ chắc theo từng bài</h4><span>Chỉ tính đề hiện tại</span></div><div class="diagnosis-list">${result.lessonStats.map(row=>`<article class="diagnosis-card"><div class="diagnosis-card-top"><strong>${escapeHtml(row.lessonTitle)}</strong><span class="miss-badge" style="${row.accuracy>=80?'background:#e6f7ec;color:#1a8156':row.accuracy>=50?'background:#fff6df;color:#a57b2a':''}">${row.accuracy}% đúng</span></div><div class="gap-track"><div class="gap-fill" style="width:${row.accuracy}%;background:${row.accuracy>=80?'linear-gradient(90deg,#64bd8d,#a6dfba)':row.accuracy>=50?'linear-gradient(90deg,#d7bd72,#f0d994)':'linear-gradient(90deg,#de9a70,#eac1a2)'}"></div></div><p>${row.correct}/${row.total} câu đúng ở bài này.</p></article>`).join('')}</div></div>
      <p class="small-note" style="font-size:9px;color:#8aa094;margin-top:14px">${escapeHtml(result.cloudNotice || 'Kết quả đã được chấm.')}</p>`;
  }
  function renderReview(result) {
    $('reviewArea').innerHTML = `<div class="review-title"><h3>Đáp án & giải thích từng câu</h3><span>${result.total} câu · xem để vá lỗ hổng</span></div>` + result.review.map(item=>`
      <article class="review-card ${item.isCorrect?'correct-review':'wrong-review'}" id="review-${item.number-1}">
        <div class="review-card-head"><div class="review-result-icon">${item.isCorrect?'✓':item.skipped?'–':'×'}</div><div class="review-question"><div class="question-meta">Câu ${String(item.number).padStart(2,'0')} · ${escapeHtml(item.lessonTitle)}</div>${escapeHtml(item.prompt)}</div><span class="review-pill">${item.isCorrect?'Đúng':item.skipped?'Bỏ trống':'Sai'}</span></div>
        <div class="review-body">
          ${item.choices.map((choice,i)=>`<div class="review-choice ${i===item.correct?'correct-option':''} ${i===item.selected && !item.isCorrect?'selected-wrong':''}"><b>${letters[i]}.</b><span>${escapeHtml(choice)}</span><span class="review-choice-mark">${i===item.correct?'✓':i===item.selected?'←':''}</span></div>`).join('')}
          <div class="explain-box"><strong>Vì sao đáp án đúng?</strong><p>${escapeHtml(item.explanation)}</p></div>
          ${!item.isCorrect?`<div class="repair-box"><strong>VÁ LỖ HỔNG · ${escapeHtml(item.skill)}:</strong> ${escapeHtml(item.repair)}</div>`:''}
        </div>
      </article>`).join('');
  }
  function renderAnswerGridAfterSubmit(result) {
    $('answerGrid').innerHTML = result.review.map((item,index)=>`<button type="button" class="answer-jump ${item.isCorrect?'review-correct':'review-wrong'}" data-review-jump="${index}" title="Câu ${index+1}: ${item.isCorrect?'Đúng':item.skipped?'Bỏ trống':'Sai'}">${index+1}</button>`).join('');
    $('answerGrid').querySelectorAll('[data-review-jump]').forEach(button=>{
      button.addEventListener('click',()=>{
        const target=$(`review-${button.dataset.reviewJump}`);
        if(target)target.scrollIntoView({behavior:'smooth',block:'start'});
      });
    });
    $('answeredStat').textContent=`${result.correctCount} / ${result.total} đúng`;
    $('remainingStat').textContent=`${result.wrongCount+result.skippedCount} câu cần xem`;
  }
  function renderDashboard() {
    state.attempts = getLocalAttempts();
    const all = mergeAttempts(state.attempts, state.remoteAttempts);
    $('metricAttempted').textContent = all.length;
    const best = all.length ? Math.max(...all.map(item=>Number(item.score)||0)) : null;
    $('metricBest').textContent = best === null ? 'Chưa có điểm' : `Cao nhất ${best.toFixed(1)}/10`;
    renderHistory(all);
    renderCumulativeGaps(all);
  }
  function mergeAttempts(local, remote) {
    const output = [...local];
    for (const row of remote) {
      const time = new Date(row.dateISO || row.created_at || 0).getTime();
      const duplicate = local.some(item => item.testId === (row.testId || row.test_id) && Math.abs(new Date(item.dateISO).getTime()-time)<60000 && Number(item.score)===Number(row.score));
      if (!duplicate) output.push({
        localId:`cloud-${row.id}`, testId:row.test_id || row.testId, score:Number(row.score),
        correctCount:row.correct_count ?? row.correctCount, total:row.total_questions ?? row.total ?? 10,
        dateISO:row.created_at || row.dateISO, skillStats:row.diagnostics?.skillStats || row.skillStats || [],
        weakSpots:row.diagnostics?.weakSpots || row.weakSpots || [], remote:true
      });
    }
    return output.sort((a,b)=>new Date(b.dateISO||0)-new Date(a.dateISO||0));
  }
  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Gần đây';
    return new Intl.DateTimeFormat('vi-VN',{day:'2-digit',month:'2-digit'}).format(date);
  }
  function renderHistory(all) {
    const box = $('historyContent');
    if (!all.length) {
      box.innerHTML='<div class="empty-state"><span>◌</span><strong>Chưa có lượt làm bài</strong><small>Làm đề đầu tiên để bắt đầu theo dõi tiến bộ.</small></div>';
      return;
    }
    const recent=all.slice(0,7).reverse();
    const average=all.reduce((sum,item)=>sum+(Number(item.score)||0),0)/all.length;
    box.innerHTML=`<div class="history-topline"><div><strong>${average.toFixed(1)}<small style="font-size:11px;color:#8da195">/10</small></strong><div style="font-size:9px;color:#80958a">Điểm trung bình</div></div><span>${all.length} lượt đã hoàn thành</span></div><div class="sparkline">${recent.map((item,index)=>{const height=Math.max(8,Math.min(100,(Number(item.score)||0)*10));return `<div class="sparkbar-wrap" title="Đề ${item.testId}: ${Number(item.score).toFixed(1)}/10 · ${formatDate(item.dateISO)}"><div class="sparkbar" style="height:${height}%;animation-delay:${index*45}ms"></div></div>`}).join('')}</div><div class="history-caption"><span>${formatDate(recent[0].dateISO)}</span><span>${formatDate(recent[recent.length-1].dateISO)}</span></div><div style="margin-top:14px;display:grid;gap:8px">${all.slice(0,3).map(item=>`<div style="display:flex;align-items:center;gap:10px;font-size:10px"><span style="min-width:46px;color:#6e8b7b;font-weight:800">Đề ${String(item.testId).padStart(2,'0')}</span><div style="height:5px;background:#edf4ef;border-radius:99px;flex:1;overflow:hidden"><div style="height:100%;width:${Math.max(0,Math.min(100,Number(item.score)*10))}%;background:${item.score>=8?'#65bc8f':item.score>=5?'#d8bb71':'#de9b75'};border-radius:99px"></div></div><strong style="min-width:34px;text-align:right;color:#426f58">${Number(item.score).toFixed(1)}</strong><span style="color:#9aa99f;min-width:34px;text-align:right">${formatDate(item.dateISO)}</span></div>`).join('')}</div>`;
  }
  function renderCumulativeGaps(all) {
    const box = $('cumulativeGaps');
    const map = new Map();
    all.forEach(attempt => (attempt.skillStats || []).forEach(row => {
      if (!map.has(row.skill)) map.set(row.skill,{skill:row.skill,lessonTitle:row.lessonTitle||'',total:0,correct:0,incorrect:0});
      const item=map.get(row.skill); item.total+=Number(row.total)||0; item.correct+=Number(row.correct)||0; item.incorrect+=Number(row.incorrect)||0;
    }));
    const ranked=[...map.values()].filter(item=>item.incorrect>0).map(item=>({...item,accuracy:item.total?Math.round(item.correct/item.total*100):0,wrongRate:item.total?Math.round(item.incorrect/item.total*100):0})).sort((a,b)=>b.wrongRate-a.wrongRate||b.incorrect-a.incorrect).slice(0,4);
    if (!ranked.length) {
      box.innerHTML='<div class="empty-state compact"><span>✳</span><strong>Chưa đủ dữ liệu</strong><small>Sau khi làm bài, hệ thống tổng hợp những kỹ năng bạn hay sai.</small></div>';
      return;
    }
    box.innerHTML=ranked.map(item=>`<div class="gap-item"><div class="gap-head"><strong>${escapeHtml(item.skill)}</strong><span class="gap-percent">${item.accuracy}% đúng</span></div><div class="gap-track"><div class="gap-fill" style="width:${Math.max(4,item.wrongRate)}%"></div></div><div class="gap-summary">${escapeHtml(item.lessonTitle)} · Sai ${item.incorrect}/${item.total} câu đã gặp</div></div>`).join('')+`<div class="gap-summary">Tính lũy kế từ ${all.length} lượt lưu trên thiết bị này${state.remoteAttempts.length?' và các lượt đồng bộ cloud':''}. Làm thêm đề để chẩn đoán chắc hơn.</div>`;
  }

  $('questionArea').addEventListener('change', event => {
    const input=event.target.closest('input[type="radio"]');
    if (!input || !state.started || state.submitted) return;
    state.answers[input.name]=Number(input.value);
    const card=input.closest('.question-card');
    card.querySelectorAll('.answer-choice').forEach(label=>label.classList.toggle('selected',label.querySelector('input').checked));
    state.currentQuestion=Number(card.dataset.questionIndex);
    updateAnswerStats();
  });
  $('answerGrid').addEventListener('click', event => {
    const button=event.target.closest('[data-jump]');
    if (!button) return;
    const index=Number(button.dataset.jump); state.currentQuestion=index;
    const target=$(`question-${index}`);
    if (target) target.scrollIntoView({behavior:'smooth',block:'start'});
    updateAnswerStats();
  });
  $('openTestBtn').addEventListener('click',()=>loadTest(Number($('testSelect').value),{scroll:true}));
  $('testSelect').addEventListener('change',()=>{
    const n=Number($('testSelect').value);
    $('selectedTestName').textContent=`Đề luyện tập ${String(n).padStart(2,'0')}`;
  });
  $('startBtn').addEventListener('click',beginTest);
  $('submitBtn').addEventListener('click',()=>submitTest(false));
  $('resetBtn').addEventListener('click',()=>{
    const next=state.test ? state.test.id%24+1 : 1;
    loadTest(next,{scroll:true});
  });
  $('resultArea').addEventListener('click',event=>{
    const button=event.target.closest('[data-recommended-test]');
    if (!button) return;
    loadTest(Number(button.dataset.recommendedTest),{scroll:true});
  });

  async function loadCloudHistory() {
    try {
      const data=await requestJSON(`/api/history?studentId=${encodeURIComponent(studentId)}`);
      if (data.configured && Array.isArray(data.attempts)) {
        state.remoteAttempts=data.attempts;
        if (data.attempts.length) setBackendStatus('Backend · cloud history connected');
        renderDashboard();
      }
    } catch { /* local history remains available if cloud history is not configured */ }
  }

  fillTestSelector();
  renderDashboard();
  loadTest(1);
  loadCloudHistory();
})();
