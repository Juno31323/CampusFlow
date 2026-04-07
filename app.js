import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const STORAGE_KEYS = {
  demo: 'campusflow_demo_state_v1',
};

const PAGE_META = {
  dashboard: {
    kicker: '대시보드',
    title: '오늘 해야 할 일을 빠르게 확인하세요',
  },
  calendar: {
    kicker: '캘린더',
    title: '과제와 시험, 공지 마감일을 월별로 관리하세요',
  },
  notices: {
    kicker: '공지',
    title: '중요한 공지와 신청 기간을 놓치지 마세요',
  },
  assignments: {
    kicker: '과제',
    title: '마감일과 제출 상태를 과목별로 관리하세요',
  },
  exams: {
    kicker: '시험',
    title: '다가오는 시험 일정과 범위를 정리하세요',
  },
  courses: {
    kicker: '과목',
    title: '시간표의 중심이 되는 과목 정보를 관리하세요',
  },
  settings: {
    kicker: '설정',
    title: '프로필과 서비스 정보를 관리하세요',
  },
};

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const DEPLOY_SUPABASE_CONFIG = {
  url: 'https://vdjlaiyoyhbtyapbakld.supabase.co',
  key: 'sb_publishable_n4HkO6XMHZPoyF9z3lZymQ_iEf0xDZO',
};

const state = {
  view: 'dashboard',
  authTab: 'signin',
  mode: 'guest',
  supabase: null,
  authSubscription: null,
  session: null,
  profile: {},
  courses: [],
  notices: [],
  assignments: [],
  exams: [],
  calendarCursor: startOfMonth(new Date()),
};

const refs = {
  toast: document.getElementById('toast'),
  authScreen: document.getElementById('auth-screen'),
  appShell: document.getElementById('app-shell'),
  authHint: document.getElementById('auth-hint'),
  authForms: {
    signin: document.getElementById('signin-form'),
    signup: document.getElementById('signup-form'),
  },
  authTabs: [...document.querySelectorAll('[data-auth-tab]')],
  navButtons: [...document.querySelectorAll('[data-view]')],
  shortcutButtons: [...document.querySelectorAll('[data-view-shortcut]')],
  pageKicker: document.getElementById('page-kicker'),
  pageTitle: document.getElementById('page-title'),
  viewRoot: document.getElementById('view-root'),
  connectionChip: document.getElementById('connection-chip'),
  userSummary: document.getElementById('user-summary'),
  signOutBtn: document.getElementById('sign-out-btn'),
  enterDemoBtn: document.getElementById('enter-demo-btn'),
};

const demoSeed = {
  profile: {
    student_name: '홍길동',
    school_name: 'CampusFlow University',
    department: '컴퓨터공학과',
  },
  courses: [
    {
      id: crypto.randomUUID(),
      name: '자료구조',
      professor: '김교수',
      room: '공학관 301',
      color: '#4f46e5',
      day_of_week: 1,
      start_time: '09:00',
      end_time: '10:15',
    },
    {
      id: crypto.randomUUID(),
      name: '웹프로그래밍',
      professor: '박교수',
      room: 'IT관 204',
      color: '#0ea5e9',
      day_of_week: 3,
      start_time: '13:00',
      end_time: '14:15',
    },
    {
      id: crypto.randomUUID(),
      name: '운영체제',
      professor: '이교수',
      room: '공학관 210',
      color: '#f97316',
      day_of_week: 5,
      start_time: '11:00',
      end_time: '12:15',
    },
  ],
  notices: [],
  assignments: [],
  exams: [],
};

demoSeed.notices = [
  {
    id: crypto.randomUUID(),
    course_id: demoSeed.courses[1].id,
    title: '프로젝트 제안서 제출 안내',
    body: '팀별 프로젝트 주제와 역할을 정리한 제안서를 LMS에 업로드하세요.',
    category: '수업',
    source_link: 'https://example.com/notice/project',
    is_important: true,
    is_read: false,
    due_at: nextDateAt(2, 18, 0),
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    course_id: null,
    title: '장학금 신청 마감 임박',
    body: '국가장학금 2차 신청은 이번 주 금요일 17시까지입니다.',
    category: '장학금',
    source_link: 'https://example.com/notice/scholarship',
    is_important: true,
    is_read: false,
    due_at: nextDateAt(4, 17, 0),
    created_at: new Date().toISOString(),
  },
];

demoSeed.assignments = [
  {
    id: crypto.randomUUID(),
    course_id: demoSeed.courses[0].id,
    title: '트리 탐색 구현 과제',
    notes: '깃허브 링크와 실행 결과 캡처를 함께 제출',
    due_at: nextDateAt(1, 23, 59),
    status: '진행중',
    priority: '높음',
    submission_link: 'https://example.com/assignment/tree',
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    course_id: demoSeed.courses[1].id,
    title: '랜딩 페이지 와이어프레임',
    notes: '피그마 링크 제출',
    due_at: nextDateAt(5, 18, 0),
    status: '예정',
    priority: '보통',
    submission_link: '',
    created_at: new Date().toISOString(),
  },
];

demoSeed.exams = [
  {
    id: crypto.randomUUID(),
    course_id: demoSeed.courses[2].id,
    title: '운영체제 중간고사',
    exam_at: nextDateAt(9, 14, 0),
    scope: '프로세스, 스레드, 스케줄링',
    location: '공학관 210',
    notes: '객관식 + 단답형',
    created_at: new Date().toISOString(),
  },
];

init();

async function init() {
  bindStaticEvents();
  updateAuthAvailability();

  const config = getSupabaseConfig();
  if (config) {
    try {
      initSupabaseClient(config);
      const {
        data: { session },
      } = await state.supabase.auth.getSession();
      if (session) {
        state.mode = 'supabase';
        state.session = session;
        await hydrateRemoteState();
        showApp();
        return;
      }
    } catch (error) {
      showToast(`Supabase 초기화 오류: ${friendlyError(error)}`);
    }
  }

  showAuth();
}

function bindStaticEvents() {
  refs.authTabs.forEach((button) => {
    button.addEventListener('click', () => setAuthTab(button.dataset.authTab));
  });

  refs.enterDemoBtn.addEventListener('click', enterDemoMode);
  refs.signOutBtn.addEventListener('click', handleSignOut);

  refs.navButtons.forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.view));
  });

  refs.shortcutButtons.forEach((button) => {
    button.addEventListener('click', () => setView(button.dataset.viewShortcut));
  });

  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const kind = form.dataset.form;
    if (!kind) return;
    event.preventDefault();

    try {
      if (kind === 'signin') await handleSignIn(form);
      if (kind === 'signup') await handleSignUp(form);
      if (kind === 'course') await handleCourseSubmit(form);
      if (kind === 'notice') await handleNoticeSubmit(form);
      if (kind === 'assignment') await handleAssignmentSubmit(form);
      if (kind === 'exam') await handleExamSubmit(form);
      if (kind === 'profile') await handleProfileSubmit(form);
    } catch (error) {
      showToast(friendlyError(error));
    }
  });

  refs.viewRoot.addEventListener('click', async (event) => {
    const shortcutTarget = event.target.closest('[data-view-shortcut]');
    if (shortcutTarget) {
      setView(shortcutTarget.dataset.viewShortcut);
      return;
    }

    const target = event.target.closest('[data-action]');
    if (!target) return;
    const { action, id, table, status } = target.dataset;

    try {
      if (action === 'toggle-notice-read') {
        const notice = state.notices.find((item) => item.id === id);
        if (notice) await updateRecord('notices', id, { is_read: !notice.is_read });
      }
      if (action === 'toggle-notice-important') {
        const notice = state.notices.find((item) => item.id === id);
        if (notice) await updateRecord('notices', id, { is_important: !notice.is_important });
      }
      if (action === 'assignment-status') {
        await updateRecord('assignments', id, { status });
      }
      if (action === 'delete-record') {
        await deleteRecord(table, id);
      }
      if (action === 'calendar-prev') {
        state.calendarCursor = addMonths(state.calendarCursor, -1);
        renderView();
      }
      if (action === 'calendar-next') {
        state.calendarCursor = addMonths(state.calendarCursor, 1);
        renderView();
      }
      if (action === 'calendar-today') {
        state.calendarCursor = startOfMonth(new Date());
        renderView();
      }
      if (action === 'switch-demo-mode') {
        enterDemoMode();
      }
      if (action === 'clear-demo-data') {
        localStorage.removeItem(STORAGE_KEYS.demo);
        enterDemoMode();
      }
    } catch (error) {
      showToast(friendlyError(error));
    }
  });
}

function setAuthTab(tab) {
  state.authTab = tab;
  refs.authTabs.forEach((button) => button.classList.toggle('active', button.dataset.authTab === tab));
  refs.authForms.signin.classList.toggle('hidden', tab !== 'signin');
  refs.authForms.signup.classList.toggle('hidden', tab !== 'signup');
}

async function handleSignIn(form) {
  if (!state.supabase) {
    showToast('Supabase 연결 정보를 먼저 저장해 주세요.');
    return;
  }

  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  const { error } = await state.supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  showToast('로그인되었습니다.');
  form.reset();
}

async function handleSignUp(form) {
  if (!state.supabase) {
    showToast('Supabase 연결 정보를 먼저 저장해 주세요.');
    return;
  }

  const formData = new FormData(form);
  const full_name = String(formData.get('full_name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  const { data, error } = await state.supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
      },
    },
  });

  if (error) throw error;

  if (!data.session) {
    showToast('회원가입 완료. 이메일 인증이 켜져 있다면 인증 후 로그인해 주세요.');
  } else {
    showToast('회원가입과 로그인이 완료되었습니다.');
  }

  form.reset();
}

function initSupabaseClient(config) {
  if (state.supabase) {
    return state.supabase;
  }

  if (state.authSubscription?.unsubscribe) {
    state.authSubscription.unsubscribe();
    state.authSubscription = null;
  }

  state.supabase = createClient(config.url, config.key, {
    auth: {
      storageKey: `campusflow-auth-${new URL(config.url).hostname}`,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  const { data } = state.supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session;
    if (!session) {
      if (state.mode === 'supabase') showAuth();
      return;
    }

    state.mode = 'supabase';
    try {
      await hydrateRemoteState();
      showApp();
    } catch (error) {
      showToast(`데이터 동기화 오류: ${friendlyError(error)}`);
    }
  });

  state.authSubscription = data?.subscription ?? null;
  return state.supabase;
}

async function hydrateRemoteState() {
  const uid = state.session?.user?.id;
  if (!uid) return;

  const [profileResult, coursesResult, noticesResult, assignmentsResult, examsResult] = await Promise.all([
    state.supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    state.supabase.from('courses').select('*').order('day_of_week', { ascending: true }).order('start_time', { ascending: true }),
    state.supabase.from('notices').select('*').order('created_at', { ascending: false }),
    state.supabase.from('assignments').select('*').order('due_at', { ascending: true }),
    state.supabase.from('exams').select('*').order('exam_at', { ascending: true }),
  ]);

  const errors = [profileResult.error, coursesResult.error, noticesResult.error, assignmentsResult.error, examsResult.error].filter(Boolean);
  if (errors.length) throw errors[0];

  state.profile = profileResult.data || {};
  state.courses = coursesResult.data || [];
  state.notices = noticesResult.data || [];
  state.assignments = assignmentsResult.data || [];
  state.exams = examsResult.data || [];
}

function enterDemoMode() {
  state.mode = 'demo';
  state.session = null;
  loadDemoState();
  showApp();
  showToast('데모 모드로 전환되었습니다.');
}

function loadDemoState() {
  const raw = localStorage.getItem(STORAGE_KEYS.demo);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      state.profile = saved.profile || {};
      state.courses = saved.courses || [];
      state.notices = saved.notices || [];
      state.assignments = saved.assignments || [];
      state.exams = saved.exams || [];
      return;
    } catch (error) {
      console.warn('Failed to parse demo state', error);
    }
  }

  state.profile = structuredClone(demoSeed.profile);
  state.courses = structuredClone(demoSeed.courses);
  state.notices = structuredClone(demoSeed.notices);
  state.assignments = structuredClone(demoSeed.assignments);
  state.exams = structuredClone(demoSeed.exams);
  persistDemoState();
}

function persistDemoState() {
  const payload = {
    profile: state.profile,
    courses: state.courses,
    notices: state.notices,
    assignments: state.assignments,
    exams: state.exams,
  };
  localStorage.setItem(STORAGE_KEYS.demo, JSON.stringify(payload));
}

function showAuth() {
  state.mode = state.mode === 'demo' ? 'demo' : 'guest';
  refs.authScreen.classList.remove('hidden');
  refs.appShell.classList.add('hidden');
  updateAuthAvailability();
}

function showApp() {
  refs.authScreen.classList.add('hidden');
  refs.appShell.classList.remove('hidden');
  renderAll();
}

function renderAll() {
  const meta = PAGE_META[state.view];
  refs.pageKicker.textContent = meta.kicker;
  refs.pageTitle.textContent = meta.title;

  refs.navButtons.forEach((button) => button.classList.toggle('active', button.dataset.view === state.view));

  refs.connectionChip.textContent = state.mode === 'supabase' ? 'Supabase 연결됨' : '데모 모드';
  refs.userSummary.innerHTML = state.mode === 'supabase'
    ? `${escapeHtml(getDisplayName())}<br /><span class="muted">${escapeHtml(state.session?.user?.email || '')}</span>`
    : `${escapeHtml(getDisplayName())}<br /><span class="muted">저장 위치: 브라우저 localStorage</span>`;

  refs.signOutBtn.textContent = state.mode === 'supabase' ? '로그아웃' : '앱 닫기';
  renderView();
}

function setView(view) {
  state.view = view;
  renderAll();
}

function renderView() {
  switch (state.view) {
    case 'dashboard':
      refs.viewRoot.innerHTML = renderDashboard();
      break;
    case 'calendar':
      refs.viewRoot.innerHTML = renderCalendar();
      break;
    case 'notices':
      refs.viewRoot.innerHTML = renderNotices();
      break;
    case 'assignments':
      refs.viewRoot.innerHTML = renderAssignments();
      break;
    case 'exams':
      refs.viewRoot.innerHTML = renderExams();
      break;
    case 'courses':
      refs.viewRoot.innerHTML = renderCourses();
      break;
    case 'settings':
      refs.viewRoot.innerHTML = renderSettings();
      break;
    default:
      refs.viewRoot.innerHTML = renderDashboard();
  }
}

function renderDashboard() {
  const upcomingAssignments = [...state.assignments]
    .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
    .slice(0, 4);
  const importantNotices = [...state.notices]
    .filter((item) => item.is_important || !item.is_read)
    .sort((a, b) => new Date(b.created_at || b.due_at || Date.now()) - new Date(a.created_at || a.due_at || Date.now()))
    .slice(0, 4);
  const upcomingExams = [...state.exams]
    .sort((a, b) => new Date(a.exam_at) - new Date(b.exam_at))
    .slice(0, 4);

  const todaySchedule = getTodaySchedule();
  const assignmentCount = state.assignments.filter((item) => !['제출완료'].includes(item.status)).length;
  const unreadNoticeCount = state.notices.filter((item) => !item.is_read).length;
  const examCount = state.exams.filter((item) => daysUntil(item.exam_at) >= 0).length;

  return `
    <section class="hero-panel">
      <article class="card hero-copy">
        <span class="pill">오늘의 학사 요약</span>
        <h3>${escapeHtml(getDisplayName())}님, 지금 해야 할 일을 먼저 보세요</h3>
        <p>
          CampusFlow는 공지, 과제, 시험, 시간표를 한 번에 보여주는 개인 학사 비서입니다.
          실제 운영 시에는 공지 자동 요약, 일정 추출, 알림 기능까지 붙이기 좋은 구조로 설계했습니다.
        </p>
        <div class="row-actions">
          <button class="button button-primary" data-view-shortcut="assignments" onclick="void(0)">과제 추가</button>
          <button class="button button-secondary" data-view-shortcut="notices" onclick="void(0)">공지 정리</button>
        </div>
      </article>
      <article class="card hero-summary">
        <h3>오늘 일정</h3>
        ${todaySchedule.length ? `<div class="list">${todaySchedule.map(renderScheduleItem).join('')}</div>` : emptyState('오늘 등록된 수업/마감 일정이 없습니다.')}
      </article>
    </section>

    <section class="stat-grid">
      ${renderStatCard('진행 중 과제', assignmentCount, '제출완료가 아닌 항목 기준')}
      ${renderStatCard('읽지 않은 공지', unreadNoticeCount, '중요 공지를 먼저 처리하세요')}
      ${renderStatCard('남은 시험', examCount, '오늘 이후 예정된 시험 수')}
      ${renderStatCard('등록 과목', state.courses.length, '시간표와 모든 데이터의 기준')}
    </section>

    <section class="content-grid">
      <article class="card section-card">
        <div class="toolbar">
          <h3>마감 임박 과제</h3>
          <span class="muted">가장 가까운 4개</span>
        </div>
        ${upcomingAssignments.length ? `<div class="list">${upcomingAssignments.map(renderAssignmentRow).join('')}</div>` : emptyState('아직 등록된 과제가 없습니다.')}
      </article>

      <article class="card section-card">
        <div class="toolbar">
          <h3>중요 공지</h3>
          <span class="muted">읽지 않았거나 중요 표시된 항목</span>
        </div>
        ${importantNotices.length ? `<div class="list">${importantNotices.map(renderNoticeRow).join('')}</div>` : emptyState('확인할 공지가 없습니다.')}
      </article>

      <article class="card section-card">
        <div class="toolbar">
          <h3>다가오는 시험</h3>
          <span class="muted">시험 범위와 장소 정리</span>
        </div>
        ${upcomingExams.length ? `<div class="list">${upcomingExams.map(renderExamRow).join('')}</div>` : emptyState('등록된 시험 일정이 없습니다.')}
      </article>

      <article class="card section-card">
        <div class="toolbar">
          <h3>이번 주 추천 동선</h3>
          <span class="muted">우선순위 요약</span>
        </div>
        <div class="list">
          <div class="list-item">
            <div class="row-title">1. 가장 급한 과제</div>
            <p class="row-body">${upcomingAssignments[0] ? `${escapeHtml(upcomingAssignments[0].title)} — ${formatDateTime(upcomingAssignments[0].due_at)}` : '등록된 과제가 없습니다.'}</p>
          </div>
          <div class="list-item">
            <div class="row-title">2. 확인 필요한 공지</div>
            <p class="row-body">${importantNotices[0] ? `${escapeHtml(importantNotices[0].title)}${importantNotices[0].due_at ? ` — ${formatDateTime(importantNotices[0].due_at)}` : ''}` : '중요 공지가 없습니다.'}</p>
          </div>
          <div class="list-item">
            <div class="row-title">3. 가장 가까운 시험</div>
            <p class="row-body">${upcomingExams[0] ? `${escapeHtml(upcomingExams[0].title)} — D-${daysUntil(upcomingExams[0].exam_at)}` : '등록된 시험이 없습니다.'}</p>
          </div>
        </div>
      </article>
    </section>
  `;
}

function renderCalendar() {
  const cursor = state.calendarCursor;
  const monthLabel = `${cursor.getFullYear()}년 ${cursor.getMonth() + 1}월`;
  const calendarDays = buildCalendarDays(cursor);
  const upcomingEvents = getAllEvents().slice(0, 8);

  return `
    <section class="calendar-shell">
      <article class="card data-card">
        <div class="calendar-header">
          <h3>${monthLabel}</h3>
          <div class="row-actions">
            <button class="button button-secondary" data-action="calendar-prev">이전 달</button>
            <button class="button button-secondary" data-action="calendar-today">이번 달</button>
            <button class="button button-secondary" data-action="calendar-next">다음 달</button>
          </div>
        </div>
        <div class="calendar-grid">
          ${DAY_LABELS.map((label) => `<div class="calendar-weekday">${label}</div>`).join('')}
          ${calendarDays.map(renderCalendarDay).join('')}
        </div>
      </article>

      <article class="card data-card">
        <h3>다가오는 일정</h3>
        <p>과제, 공지 마감일, 시험을 시간순으로 모아봤습니다.</p>
        ${upcomingEvents.length ? `<div class="list">${upcomingEvents.map(renderUpcomingEvent).join('')}</div>` : emptyState('표시할 일정이 없습니다.')}
      </article>
    </section>
  `;
}

function renderNotices() {
  const sorted = [...state.notices].sort((a, b) => {
    if (a.is_important !== b.is_important) return Number(b.is_important) - Number(a.is_important);
    return new Date(b.created_at || b.due_at || 0) - new Date(a.created_at || a.due_at || 0);
  });

  return `
    <section class="content-grid">
      <article class="card data-card">
        <h3>공지 추가</h3>
        <p>학사, 장학금, 수업 공지와 링크를 저장하고 마감일을 함께 관리하세요.</p>
        <form class="inline-form" data-form="notice">
          <div class="form-grid">
            <label>
              <span>제목</span>
              <input name="title" required placeholder="예: 장학금 신청 공지" />
            </label>
            <label>
              <span>카테고리</span>
              <select name="category">
                <option value="학사">학사</option>
                <option value="수업">수업</option>
                <option value="장학금">장학금</option>
                <option value="행사">행사</option>
                <option value="기타">기타</option>
              </select>
            </label>
          </div>
          <div class="form-grid">
            <label>
              <span>과목 연결</span>
              <select name="course_id">
                <option value="">선택 안 함</option>
                ${renderCourseOptions()}
              </select>
            </label>
            <label>
              <span>마감일</span>
              <input type="datetime-local" name="due_at" />
            </label>
          </div>
          <div class="form-grid">
            <label>
              <span>링크</span>
              <input type="url" name="source_link" placeholder="https://..." />
            </label>
            <label>
              <span>중요도</span>
              <select name="is_important">
                <option value="false">일반</option>
                <option value="true">중요</option>
              </select>
            </label>
          </div>
          <label>
            <span>내용</span>
            <textarea name="body" placeholder="공지 핵심 내용을 적어주세요"></textarea>
          </label>
          <div class="form-actions">
            <button type="submit" class="button button-primary">공지 저장</button>
          </div>
        </form>
      </article>

      <article class="card data-card">
        <div class="toolbar">
          <h3>공지 목록</h3>
          <span class="muted">총 ${state.notices.length}개</span>
        </div>
        ${sorted.length ? `<div class="list">${sorted.map(renderNoticeRow).join('')}</div>` : emptyState('등록된 공지가 없습니다.')}
      </article>
    </section>
  `;
}

function renderAssignments() {
  const sorted = [...state.assignments].sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

  return `
    <section class="content-grid">
      <article class="card data-card">
        <h3>과제 추가</h3>
        <p>마감일, 우선순위, 제출 링크를 한 번에 관리할 수 있습니다.</p>
        <form class="inline-form" data-form="assignment">
          <div class="form-grid">
            <label>
              <span>과제명</span>
              <input name="title" required placeholder="예: UI 프로토타입 제출" />
            </label>
            <label>
              <span>과목</span>
              <select name="course_id">
                <option value="">선택 안 함</option>
                ${renderCourseOptions()}
              </select>
            </label>
          </div>
          <div class="form-grid three">
            <label>
              <span>마감일</span>
              <input type="datetime-local" name="due_at" required />
            </label>
            <label>
              <span>상태</span>
              <select name="status">
                <option value="예정">예정</option>
                <option value="진행중">진행중</option>
                <option value="제출완료">제출완료</option>
                <option value="늦음">늦음</option>
              </select>
            </label>
            <label>
              <span>우선순위</span>
              <select name="priority">
                <option value="낮음">낮음</option>
                <option value="보통" selected>보통</option>
                <option value="높음">높음</option>
              </select>
            </label>
          </div>
          <div class="form-grid">
            <label>
              <span>제출 링크</span>
              <input type="url" name="submission_link" placeholder="https://..." />
            </label>
            <label>
              <span>메모</span>
              <input name="notes" placeholder="예: PDF + 코드 압축파일 제출" />
            </label>
          </div>
          <div class="form-actions">
            <button type="submit" class="button button-primary">과제 저장</button>
          </div>
        </form>
      </article>

      <article class="card data-card">
        <div class="toolbar">
          <h3>과제 목록</h3>
          <span class="muted">총 ${state.assignments.length}개</span>
        </div>
        ${sorted.length ? `<div class="list">${sorted.map(renderAssignmentRow).join('')}</div>` : emptyState('등록된 과제가 없습니다.')}
      </article>
    </section>
  `;
}

function renderExams() {
  const sorted = [...state.exams].sort((a, b) => new Date(a.exam_at) - new Date(b.exam_at));

  return `
    <section class="content-grid">
      <article class="card data-card">
        <h3>시험 일정 추가</h3>
        <p>시험 범위, 장소, 메모를 함께 저장해 시험 주간에 빠르게 확인하세요.</p>
        <form class="inline-form" data-form="exam">
          <div class="form-grid">
            <label>
              <span>시험명</span>
              <input name="title" required placeholder="예: 자료구조 중간고사" />
            </label>
            <label>
              <span>과목</span>
              <select name="course_id">
                <option value="">선택 안 함</option>
                ${renderCourseOptions()}
              </select>
            </label>
          </div>
          <div class="form-grid">
            <label>
              <span>시험 일시</span>
              <input type="datetime-local" name="exam_at" required />
            </label>
            <label>
              <span>장소</span>
              <input name="location" placeholder="예: 공학관 210" />
            </label>
          </div>
          <label>
            <span>시험 범위</span>
            <textarea name="scope" placeholder="예: 1~5주차 / 정렬, 그래프"></textarea>
          </label>
          <label>
            <span>메모</span>
            <input name="notes" placeholder="예: 오픈북 불가" />
          </label>
          <div class="form-actions">
            <button type="submit" class="button button-primary">시험 일정 저장</button>
          </div>
        </form>
      </article>

      <article class="card data-card">
        <div class="toolbar">
          <h3>시험 목록</h3>
          <span class="muted">총 ${state.exams.length}개</span>
        </div>
        ${sorted.length ? `<div class="list">${sorted.map(renderExamRow).join('')}</div>` : emptyState('등록된 시험이 없습니다.')}
      </article>
    </section>
  `;
}

function renderCourses() {
  const sorted = [...state.courses].sort((a, b) => {
    if ((a.day_of_week ?? 9) !== (b.day_of_week ?? 9)) return (a.day_of_week ?? 9) - (b.day_of_week ?? 9);
    return String(a.start_time || '').localeCompare(String(b.start_time || ''));
  });

  return `
    <section class="content-grid">
      <article class="card data-card">
        <h3>과목 추가</h3>
        <p>공지, 과제, 시험을 연결할 기준 과목과 시간표 정보를 등록하세요.</p>
        <form class="inline-form" data-form="course">
          <div class="form-grid">
            <label>
              <span>과목명</span>
              <input name="name" required placeholder="예: 운영체제" />
            </label>
            <label>
              <span>교수명</span>
              <input name="professor" placeholder="예: 이교수" />
            </label>
          </div>
          <div class="form-grid three">
            <label>
              <span>요일</span>
              <select name="day_of_week">
                <option value="">선택 안 함</option>
                <option value="1">월</option>
                <option value="2">화</option>
                <option value="3">수</option>
                <option value="4">목</option>
                <option value="5">금</option>
                <option value="6">토</option>
                <option value="0">일</option>
              </select>
            </label>
            <label>
              <span>시작</span>
              <input type="time" name="start_time" />
            </label>
            <label>
              <span>종료</span>
              <input type="time" name="end_time" />
            </label>
          </div>
          <div class="form-grid">
            <label>
              <span>강의실</span>
              <input name="room" placeholder="예: IT관 204" />
            </label>
            <label>
              <span>색상</span>
              <input type="color" name="color" value="#4f46e5" />
            </label>
          </div>
          <div class="form-actions">
            <button type="submit" class="button button-primary">과목 저장</button>
          </div>
        </form>
      </article>

      <article class="card data-card">
        <div class="toolbar">
          <h3>과목 목록</h3>
          <span class="muted">총 ${state.courses.length}개</span>
        </div>
        ${sorted.length ? `<div class="list">${sorted.map(renderCourseRow).join('')}</div>` : emptyState('등록된 과목이 없습니다.')}
      </article>
    </section>
  `;
}

function renderSettings() {
  return `
    <section class="settings-grid">
      <article class="card section-card">
        <h3>기본 프로필</h3>
        <p>대시보드에 표시할 이름과 학교 정보를 저장합니다.</p>
        <form class="inline-form" data-form="profile">
          <label>
            <span>이름</span>
            <input name="student_name" value="${escapeAttribute(state.profile.student_name || '')}" placeholder="홍길동" />
          </label>
          <label>
            <span>학교</span>
            <input name="school_name" value="${escapeAttribute(state.profile.school_name || '')}" placeholder="예: OO대학교" />
          </label>
          <label>
            <span>학과</span>
            <input name="department" value="${escapeAttribute(state.profile.department || '')}" placeholder="예: 컴퓨터공학과" />
          </label>
          <div class="form-actions">
            <button type="submit" class="button button-primary">프로필 저장</button>
          </div>
        </form>
      </article>

      <article class="card section-card">
        <h3>서비스 연결 상태</h3>
        <p>이 배포본은 CampusFlow Supabase 프로젝트에 미리 연결되어 있습니다. 사용자는 별도의 URL이나 Key 입력 없이 회원가입과 로그인을 할 수 있습니다.</p>
        <div class="list">
          <div class="list-item">프로젝트 URL 고정 연결</div>
          <div class="list-item">Publishable Key만 프론트에 사용</div>
          <div class="list-item">RLS로 사용자별 데이터 분리</div>
        </div>
      </article>

      <article class="card section-card">
        <h3>현재 모드</h3>
        <p>${state.mode === 'supabase' ? 'Supabase와 실제 DB가 연결된 상태입니다.' : '데모 모드로 실행 중이며 데이터는 브라우저에 저장됩니다.'}</p>
        <div class="row-actions">
          <button class="button button-secondary" data-action="switch-demo-mode">데모 모드로 전환</button>
          ${state.mode === 'demo' ? '<button class="button button-ghost" data-action="clear-demo-data">데모 데이터 초기화</button>' : ''}
        </div>
      </article>

      <article class="card section-card">
        <h3>다음 단계 제안</h3>
        <p>현재 버전은 MVP에 맞춘 구조입니다. 다음 단계로는 웹 푸시 알림, 공지 AI 요약, 공지 본문에서 날짜 자동 추출 기능을 붙이기 좋습니다.</p>
        <div class="list">
          <div class="list-item">공지 자동 요약</div>
          <div class="list-item">신청기간 자동 일정화</div>
          <div class="list-item">과목별 필터와 검색</div>
          <div class="list-item">모바일 하단 탭 UI</div>
        </div>
      </article>
    </section>
  `;
}


function renderStatCard(label, value, description) {
  return `
    <article class="card stat-card">
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-number">${escapeHtml(String(value))}</div>
      <p>${escapeHtml(description)}</p>
    </article>
  `;
}

function renderNoticeRow(item) {
  const course = getCourseName(item.course_id);
  return `
    <div class="notice-row">
      <div class="row-header">
        <div>
          <div class="row-title">${escapeHtml(item.title)}</div>
          <div class="row-meta">
            <span class="badge ${item.is_important ? 'important' : ''}">${item.is_important ? '중요' : escapeHtml(item.category || '일반')}</span>
            ${course ? `<span class="badge">${escapeHtml(course)}</span>` : ''}
            ${item.is_read ? '<span class="badge success">읽음</span>' : '<span class="badge warning">미확인</span>'}
            ${item.due_at ? `<span class="badge">${escapeHtml(formatDateTime(item.due_at))}</span>` : ''}
          </div>
        </div>
      </div>
      ${item.body ? `<p class="row-body">${escapeHtml(item.body)}</p>` : ''}
      <div class="row-actions">
        <button class="button button-secondary" data-action="toggle-notice-read" data-id="${item.id}">${item.is_read ? '안읽음으로' : '읽음 처리'}</button>
        <button class="button button-secondary" data-action="toggle-notice-important" data-id="${item.id}">${item.is_important ? '중요 해제' : '중요 표시'}</button>
        ${item.source_link ? `<a class="button button-ghost link" href="${escapeAttribute(item.source_link)}" target="_blank" rel="noreferrer">원문 보기</a>` : ''}
        <button class="button button-ghost" data-action="delete-record" data-table="notices" data-id="${item.id}">삭제</button>
      </div>
    </div>
  `;
}

function renderAssignmentRow(item) {
  const course = getCourseName(item.course_id);
  const statusClass = item.status === '제출완료' ? 'success' : item.status === '늦음' ? 'important' : 'warning';
  const priorityClass = item.priority === '높음' ? 'important' : item.priority === '낮음' ? 'success' : '';
  return `
    <div class="assignment-row">
      <div class="row-header">
        <div>
          <div class="row-title">${escapeHtml(item.title)}</div>
          <div class="row-meta">
            ${course ? `<span class="badge">${escapeHtml(course)}</span>` : ''}
            <span class="badge ${statusClass}">${escapeHtml(item.status)}</span>
            <span class="badge ${priorityClass}">${escapeHtml(item.priority)}</span>
            <span class="badge">${escapeHtml(formatDateTime(item.due_at))}</span>
            <span class="badge">D-${escapeHtml(String(daysUntil(item.due_at)))}</span>
          </div>
        </div>
      </div>
      ${item.notes ? `<p class="row-body">${escapeHtml(item.notes)}</p>` : ''}
      <div class="row-actions">
        <button class="button button-secondary" data-action="assignment-status" data-id="${item.id}" data-status="예정">예정</button>
        <button class="button button-secondary" data-action="assignment-status" data-id="${item.id}" data-status="진행중">진행중</button>
        <button class="button button-secondary" data-action="assignment-status" data-id="${item.id}" data-status="제출완료">제출완료</button>
        ${item.submission_link ? `<a class="button button-ghost link" href="${escapeAttribute(item.submission_link)}" target="_blank" rel="noreferrer">제출 링크</a>` : ''}
        <button class="button button-ghost" data-action="delete-record" data-table="assignments" data-id="${item.id}">삭제</button>
      </div>
    </div>
  `;
}

function renderExamRow(item) {
  const course = getCourseName(item.course_id);
  return `
    <div class="exam-row">
      <div class="row-header">
        <div>
          <div class="row-title">${escapeHtml(item.title)}</div>
          <div class="row-meta">
            ${course ? `<span class="badge">${escapeHtml(course)}</span>` : ''}
            <span class="badge important">D-${escapeHtml(String(daysUntil(item.exam_at)))}</span>
            <span class="badge">${escapeHtml(formatDateTime(item.exam_at))}</span>
            ${item.location ? `<span class="badge">${escapeHtml(item.location)}</span>` : ''}
          </div>
        </div>
      </div>
      ${item.scope ? `<p class="row-body">시험 범위: ${escapeHtml(item.scope)}</p>` : ''}
      ${item.notes ? `<p class="row-body">메모: ${escapeHtml(item.notes)}</p>` : ''}
      <div class="row-actions">
        <button class="button button-ghost" data-action="delete-record" data-table="exams" data-id="${item.id}">삭제</button>
      </div>
    </div>
  `;
}

function renderCourseRow(item) {
  return `
    <div class="course-row">
      <div class="row-header">
        <div>
          <div class="row-title">${escapeHtml(item.name)}</div>
          <div class="row-meta">
            ${item.professor ? `<span class="badge">${escapeHtml(item.professor)}</span>` : ''}
            ${item.room ? `<span class="badge">${escapeHtml(item.room)}</span>` : ''}
            ${item.day_of_week !== null && item.day_of_week !== undefined && item.day_of_week !== '' ? `<span class="badge">${DAY_LABELS[Number(item.day_of_week)]} ${escapeHtml(item.start_time || '')}${item.end_time ? ` - ${escapeHtml(item.end_time)}` : ''}</span>` : ''}
          </div>
        </div>
        <div class="badge" style="background:${escapeAttribute(withAlpha(item.color || '#4f46e5', 0.14))};color:${escapeAttribute(item.color || '#4f46e5')};">색상</div>
      </div>
      <div class="row-actions">
        <button class="button button-ghost" data-action="delete-record" data-table="courses" data-id="${item.id}">삭제</button>
      </div>
    </div>
  `;
}

function renderScheduleItem(item) {
  return `
    <div class="list-item">
      <div class="item-title-row">
        <div class="item-title">${escapeHtml(item.title)}</div>
        <span class="badge ${item.kind === '시험' ? 'important' : item.kind === '과제' ? 'warning' : ''}">${escapeHtml(item.kind)}</span>
      </div>
      <div class="item-meta">
        <span class="badge">${escapeHtml(item.time)}</span>
        ${item.course ? `<span class="badge">${escapeHtml(item.course)}</span>` : ''}
      </div>
    </div>
  `;
}

function renderUpcomingEvent(item) {
  return `
    <div class="list-item">
      <div class="item-title-row">
        <div class="item-title">${escapeHtml(item.title)}</div>
        <span class="badge ${item.type}">${escapeHtml(item.typeLabel)}</span>
      </div>
      <div class="item-meta">
        <span class="badge">${escapeHtml(formatDateTime(item.date))}</span>
        ${item.course ? `<span class="badge">${escapeHtml(item.course)}</span>` : ''}
      </div>
    </div>
  `;
}

function renderCalendarDay(day) {
  const classNames = ['day-card'];
  if (!day.inCurrentMonth) classNames.push('muted-day');
  if (isSameDate(day.date, new Date())) classNames.push('today');

  return `
    <div class="${classNames.join(' ')}">
      <div class="day-number">${day.date.getDate()}</div>
      <div class="day-events">
        ${day.events.slice(0, 3).map((event) => `<div class="event-pill ${event.type}">${escapeHtml(event.label)}</div>`).join('')}
        ${day.events.length > 3 ? `<div class="event-pill">+${day.events.length - 3}개 더</div>` : ''}
      </div>
    </div>
  `;
}

function emptyState(message) {
  return `<div class="empty-state">${escapeHtml(message)}</div>`;
}

async function handleCourseSubmit(form) {
  const formData = new FormData(form);
  const payload = {
    name: String(formData.get('name') || '').trim(),
    professor: optionalString(formData.get('professor')),
    room: optionalString(formData.get('room')),
    color: optionalString(formData.get('color')) || '#4f46e5',
    day_of_week: nullableNumber(formData.get('day_of_week')),
    start_time: optionalString(formData.get('start_time')),
    end_time: optionalString(formData.get('end_time')),
  };
  await insertRecord('courses', payload);
  form.reset();
  form.querySelector('input[name="color"]').value = '#4f46e5';
}

async function handleNoticeSubmit(form) {
  const formData = new FormData(form);
  const payload = {
    title: String(formData.get('title') || '').trim(),
    course_id: optionalString(formData.get('course_id')),
    category: optionalString(formData.get('category')) || '일반',
    due_at: toIsoOrNull(formData.get('due_at')),
    source_link: optionalString(formData.get('source_link')),
    is_important: String(formData.get('is_important')) === 'true',
    is_read: false,
    body: optionalString(formData.get('body')),
  };
  await insertRecord('notices', payload);
  form.reset();
}

async function handleAssignmentSubmit(form) {
  const formData = new FormData(form);
  const payload = {
    title: String(formData.get('title') || '').trim(),
    course_id: optionalString(formData.get('course_id')),
    due_at: toIsoOrNull(formData.get('due_at')),
    status: optionalString(formData.get('status')) || '예정',
    priority: optionalString(formData.get('priority')) || '보통',
    submission_link: optionalString(formData.get('submission_link')),
    notes: optionalString(formData.get('notes')),
  };
  await insertRecord('assignments', payload);
  form.reset();
}

async function handleExamSubmit(form) {
  const formData = new FormData(form);
  const payload = {
    title: String(formData.get('title') || '').trim(),
    course_id: optionalString(formData.get('course_id')),
    exam_at: toIsoOrNull(formData.get('exam_at')),
    location: optionalString(formData.get('location')),
    scope: optionalString(formData.get('scope')),
    notes: optionalString(formData.get('notes')),
  };
  await insertRecord('exams', payload);
  form.reset();
}

async function handleProfileSubmit(form) {
  const formData = new FormData(form);
  const payload = {
    student_name: optionalString(formData.get('student_name')),
    school_name: optionalString(formData.get('school_name')),
    department: optionalString(formData.get('department')),
  };

  if (state.mode === 'supabase') {
    const uid = state.session?.user?.id;
    if (!uid) throw new Error('로그인 상태가 아닙니다.');
    const { error } = await state.supabase.from('profiles').upsert({ id: uid, ...payload }, { onConflict: 'id' });
    if (error) throw error;
    await hydrateRemoteState();
  } else {
    state.profile = { ...state.profile, ...payload };
    persistDemoState();
  }

  renderAll();
  showToast('프로필이 저장되었습니다.');
}

async function insertRecord(table, payload) {
  if (state.mode === 'supabase') {
    const uid = state.session?.user?.id;
    if (!uid) throw new Error('로그인 상태가 아닙니다.');

    const record = {
      ...payload,
      user_id: uid,
    };

    const { error } = await state.supabase.from(table).insert(record);
    if (error) throw error;
    await hydrateRemoteState();
  } else {
    const record = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      ...payload,
    };
    state[table] = [record, ...state[table]];
    persistDemoState();
  }

  renderAll();
  showToast('저장되었습니다.');
}

async function updateRecord(table, id, patch) {
  if (state.mode === 'supabase') {
    const { error } = await state.supabase.from(table).update(patch).eq('id', id);
    if (error) throw error;
    await hydrateRemoteState();
  } else {
    state[table] = state[table].map((item) => (item.id === id ? { ...item, ...patch } : item));
    persistDemoState();
  }

  renderAll();
  showToast('변경사항이 저장되었습니다.');
}

async function deleteRecord(table, id) {
  if (!confirm('이 항목을 삭제할까요?')) return;

  if (state.mode === 'supabase') {
    const { error } = await state.supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    await hydrateRemoteState();
  } else {
    state[table] = state[table].filter((item) => item.id !== id);
    persistDemoState();
  }

  renderAll();
  showToast('삭제되었습니다.');
}

async function handleSignOut() {
  if (state.mode === 'supabase' && state.supabase) {
    const { error } = await state.supabase.auth.signOut();
    if (error) throw error;
    state.session = null;
    showToast('로그아웃되었습니다.');
    showAuth();
    return;
  }

  refs.appShell.classList.add('hidden');
  refs.authScreen.classList.remove('hidden');
  showToast('데모 화면을 닫았습니다.');
}

function getSupabaseConfig() {
  if (!DEPLOY_SUPABASE_CONFIG.url || !DEPLOY_SUPABASE_CONFIG.key || DEPLOY_SUPABASE_CONFIG.key.includes('PASTE_YOUR_PUBLISHABLE_KEY_HERE')) {
    return null;
  }

  return {
    url: DEPLOY_SUPABASE_CONFIG.url,
    key: DEPLOY_SUPABASE_CONFIG.key,
  };
}

function updateAuthAvailability() {
  const hasConfig = Boolean(getSupabaseConfig());
  refs.authHint.textContent = hasConfig
    ? '회원가입 또는 로그인 후 바로 CampusFlow를 사용할 수 있습니다.'
    : 'app.js 상단의 DEPLOY_SUPABASE_CONFIG에 Project URL과 Publishable Key를 입력한 뒤 다시 배포하세요.';
}


function getTodaySchedule() {
  const now = new Date();
  const todayDow = now.getDay();
  const courseItems = state.courses
    .filter((course) => Number(course.day_of_week) === todayDow)
    .map((course) => ({
      title: course.name,
      kind: '수업',
      course: course.room || course.professor || '',
      time: `${course.start_time || '--:--'}${course.end_time ? ` - ${course.end_time}` : ''}`,
      date: now,
    }));

  const dueItems = getAllEvents().filter((item) => isSameDate(new Date(item.date), now)).map((item) => ({
    title: item.title,
    kind: item.typeLabel,
    course: item.course || '',
    time: formatTime(item.date),
    date: item.date,
  }));

  return [...courseItems, ...dueItems].sort((a, b) => String(a.time).localeCompare(String(b.time)));
}

function getAllEvents() {
  const noticeEvents = state.notices
    .filter((item) => item.due_at)
    .map((item) => ({
      date: item.due_at,
      title: item.title,
      label: `공지 · ${item.title}`,
      type: 'notice',
      typeLabel: '공지',
      course: getCourseName(item.course_id),
    }));

  const assignmentEvents = state.assignments.map((item) => ({
    date: item.due_at,
    title: item.title,
    label: `과제 · ${item.title}`,
    type: 'assignment',
    typeLabel: '과제',
    course: getCourseName(item.course_id),
  }));

  const examEvents = state.exams.map((item) => ({
    date: item.exam_at,
    title: item.title,
    label: `시험 · ${item.title}`,
    type: 'exam',
    typeLabel: '시험',
    course: getCourseName(item.course_id),
  }));

  return [...noticeEvents, ...assignmentEvents, ...examEvents]
    .filter((item) => item.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}

function buildCalendarDays(cursor) {
  const firstDay = startOfMonth(cursor);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const events = getAllEvents().filter((item) => isSameDate(new Date(item.date), date));

    return {
      date,
      inCurrentMonth: date.getMonth() === cursor.getMonth(),
      events,
    };
  });
}

function renderCourseOptions() {
  return state.courses
    .map((course) => `<option value="${escapeAttribute(course.id)}">${escapeHtml(course.name)}</option>`)
    .join('');
}

function getCourseName(courseId) {
  if (!courseId) return '';
  return state.courses.find((course) => course.id === courseId)?.name || '';
}

function getDisplayName() {
  return state.profile.student_name || state.session?.user?.user_metadata?.full_name || state.session?.user?.email?.split('@')[0] || '학생';
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    refs.toast.hidden = true;
  }, 2600);
}

function friendlyError(error) {
  const message = error?.message || String(error);
  if (message.includes('relation') && message.includes('does not exist')) {
    return 'Supabase 테이블이 아직 없습니다. 함께 제공한 supabase_schema.sql을 먼저 실행해 주세요.';
  }
  if (message.includes('Invalid API key')) {
    return 'Publishable Key가 올바르지 않습니다.';
  }
  return message;
}

function optionalString(value) {
  const text = String(value || '').trim();
  return text ? text : null;
}

function nullableNumber(value) {
  const text = String(value || '').trim();
  if (!text) return null;
  return Number(text);
}

function toIsoOrNull(value) {
  const text = String(value || '').trim();
  return text ? new Date(text).toISOString() : null;
}

function formatDateTime(value) {
  const date = new Date(value);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatTime(value) {
  const date = new Date(value);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function daysUntil(value) {
  const target = new Date(value);
  const now = new Date();
  const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = targetDay - nowDay;
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function isSameDate(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function nextDateAt(days, hour, minute) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function withAlpha(hex, alpha) {
  const cleaned = hex.replace('#', '');
  const normalized = cleaned.length === 3 ? cleaned.split('').map((char) => char + char).join('') : cleaned;
  const int = parseInt(normalized, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
