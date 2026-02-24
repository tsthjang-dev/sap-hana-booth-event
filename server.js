import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 4010;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.json');
let memoryDB = { teams: [] };

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const BOOTHS = {
  1: [
    { type: 'choice', prompt: 'SAP HANA 인메모리의 핵심 효과는?', hint: '실시간 분석과 관련', options: ['실시간 분석 성능 향상', '디스크 I/O 증가', '백업 불가', '네트워크 지연 증가'], answer: '실시간 분석 성능 향상' },
    { type: 'order', prompt: '프로젝트 시작 순서 정렬', hint: '요구사항이 가장 먼저', items: ['모델링', '요구사항', '테스트', '배포'], answer: ['요구사항', '모델링', '테스트', '배포'] },
    { type: 'order', prompt: 'Calculation View 개발 순서', hint: '소스 연결 → 노드 구성', items: ['활성화', '결과 검증', '노드 구성', '소스 연결'], answer: ['소스 연결', '노드 구성', '활성화', '결과 검증'] }
  ],
  2: [
    { type: 'choice', prompt: 'SAP HANA Cloud 특징은?', hint: '클라우드 유연성', options: ['멀티클라우드 배포 가능', '온프레미스 전용', 'SQL 미지원', '백업 기능 없음'], answer: '멀티클라우드 배포 가능' },
    { type: 'order', prompt: '모니터링 설정 순서', hint: 'KPI 먼저 정의', items: ['알림 임계치', 'KPI 선정', '대시보드', '자동 조치'], answer: ['KPI 선정', '대시보드', '알림 임계치', '자동 조치'] },
    { type: 'order', prompt: '성능 튜닝 순서', hint: '먼저 병목 SQL 찾기', items: ['재측정', '실행계획 분석', '병목 SQL 확인', '모델 수정'], answer: ['병목 SQL 확인', '실행계획 분석', '모델 수정', '재측정'] }
  ],
  3: [
    { type: 'choice', prompt: 'Column Store 장점은?', hint: '압축과 분석', options: ['압축/분석 효율 우수', '쓰기만 빠름', '복제 불가', '트랜잭션 미지원'], answer: '압축/분석 효율 우수' },
    { type: 'order', prompt: '데이터 파이프라인 순서', hint: '추출이 첫 단계', items: ['변환', '적재', '정합성 체크', '원천 추출'], answer: ['원천 추출', '정합성 체크', '변환', '적재'] },
    { type: 'order', prompt: '권한 설정 순서', hint: 'Role 생성부터', items: ['검증', 'Privilege 추가', 'Role 생성', '사용자 할당'], answer: ['Role 생성', 'Privilege 추가', '사용자 할당', '검증'] }
  ],
  4: [
    { type: 'choice', prompt: 'XSA(Advanced)의 장점은?', hint: '앱 개발/배포 방식', options: ['컨테이너 기반 앱 개발', '앱 배포 불가', 'HTTP 미지원', 'SQLScript 불가'], answer: '컨테이너 기반 앱 개발' },
    { type: 'order', prompt: '보안 운영 순서', hint: '정책 수립이 먼저', items: ['정기 감사', '접근 로그 모니터링', '권한 최소화', '계정 정책 수립'], answer: ['계정 정책 수립', '권한 최소화', '접근 로그 모니터링', '정기 감사'] },
    { type: 'order', prompt: '백업 준비 순서', hint: '정의 → 실행 → 리허설', items: ['문서화', '복구 리허설', '백업 정책 정의', '주기 백업 실행'], answer: ['백업 정책 정의', '주기 백업 실행', '복구 리허설', '문서화'] }
  ],
  5: [
    { type: 'choice', prompt: '데이터 가상화 관련 기능은?', hint: 'S로 시작', options: ['Smart Data Access', 'No Data Access', 'Zero Integration', 'Manual Access Only'], answer: 'Smart Data Access' },
    { type: 'order', prompt: '최종 데모 준비 순서', hint: '시나리오 확정이 먼저', items: ['리허설', '피드백 수집', '시나리오 확정', '데모 데이터 점검'], answer: ['시나리오 확정', '데모 데이터 점검', '리허설', '피드백 수집'] },
    { type: 'order', prompt: '행사 후 개선 순서', hint: '피드백 분석부터', items: ['실행 계획', '다음 행사 반영', '개선 우선순위', '피드백 분류'], answer: ['피드백 분류', '개선 우선순위', '실행 계획', '다음 행사 반영'] }
  ]
};

function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) return memoryDB;
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    memoryDB = db;
    return db;
  } catch {
    return memoryDB;
  }
}
function saveDB(db) {
  memoryDB = db;
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch {
    // serverless/read-only 환경에서는 메모리 모드로 동작
  }
}
const keyOf = (v) => String(v || '').trim().toLowerCase();
const now = () => new Date().toISOString();
function durationSec(startedAt, completedAt) { return Math.max(0, Math.floor((new Date(completedAt) - new Date(startedAt)) / 1000)); }
function ensureTeamShape(t) {
  if (!t.booths) {
    t.booths = {};
    for (let b = 1; b <= 5; b++) t.booths[b] = { solved: [false, false, false], passed: false, passedAt: null };
  }
  if (!Array.isArray(t.members)) t.members = [];
  if (!t.status) t.status = 'active';
  return t;
}
function getTeam(db, teamKey) { return db.teams.find(t => t.teamKey === keyOf(teamKey)); }
function sanitizeQ(q) { const { answer, ...safe } = q; return safe; }
function updateCompletion(team) {
  const allDone = [1,2,3,4,5].every(b => team.booths?.[b]?.passed);
  if (allDone) {
    team.status = 'completed';
    if (!team.completedAt) team.completedAt = now();
  }
}

app.post('/api/team/start', (req, res) => {
  const { teamName, members } = req.body || {};
  if (!teamName || !Array.isArray(members) || members.length < 1 || members.length > 3) {
    return res.status(400).json({ error: '팀명/팀원(1~3명) 확인 필요' });
  }
  const db = loadDB();
  if (getTeam(db, teamName)) return res.status(409).json({ error: '중복 팀명입니다. 다른 팀명을 입력하세요.' });

  const team = ensureTeamShape({
    teamKey: keyOf(teamName),
    teamName: String(teamName).trim(),
    members,
    startedAt: now(),
    status: 'active',
    completedAt: null,
    feedback: null,
    attempts: []
  });
  db.teams.push(team);
  saveDB(db);
  res.json({ ok: true, team });
});

app.get('/api/teams', (_req, res) => {
  const db = loadDB();
  const teams = db.teams.map(ensureTeamShape).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  res.json({ teams });
});

app.get('/api/ranking', (_req, res) => {
  const db = loadDB();
  const ranking = db.teams.map(ensureTeamShape)
    .filter(t => t.status === 'completed' && t.completedAt)
    .map(t => ({ teamName: t.teamName, members: t.members, durationSec: durationSec(t.startedAt, t.completedAt), completedAt: t.completedAt }))
    .sort((a, b) => a.durationSec - b.durationSec || new Date(a.completedAt) - new Date(b.completedAt));
  res.json({ ranking });
});

app.get('/api/booth/:boothNo/state/:teamKey', (req, res) => {
  const boothNo = Number(req.params.boothNo);
  const questions = BOOTHS[boothNo];
  if (!questions) return res.status(404).json({ error: '부스 없음' });

  const db = loadDB();
  const team = getTeam(db, req.params.teamKey);
  if (!team) return res.status(404).json({ error: '팀 없음' });
  ensureTeamShape(team);

  const solved = team.booths[boothNo].solved;
  const nextIndex = solved.findIndex(v => !v);
  const idx = nextIndex === -1 ? 2 : nextIndex;

  res.json({
    boothNo,
    team: { teamName: team.teamName, teamKey: team.teamKey, members: team.members },
    solved,
    passed: team.booths[boothNo].passed,
    currentQuestionIndex: idx,
    question: sanitizeQ(questions[idx])
  });
});

app.post('/api/booth/:boothNo/answer', (req, res) => {
  const boothNo = Number(req.params.boothNo);
  const questions = BOOTHS[boothNo];
  if (!questions) return res.status(404).json({ error: '부스 없음' });

  const { teamKey, questionIndex, choice, order } = req.body || {};
  const idx = Number(questionIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx > 2) return res.status(400).json({ error: '문항 인덱스 오류' });

  const db = loadDB();
  const team = getTeam(db, teamKey);
  if (!team) return res.status(404).json({ error: '팀 없음' });
  ensureTeamShape(team);

  const q = questions[idx];
  let ok = false;
  if (q.type === 'choice') ok = String(choice || '').trim() === q.answer;
  if (q.type === 'order') ok = JSON.stringify(order || []) === JSON.stringify(q.answer);

  team.attempts.push({ at: now(), boothNo, questionIndex: idx, ok, submitted: q.type === 'choice' ? choice : order });
  if (ok) team.booths[boothNo].solved[idx] = true;

  if (team.booths[boothNo].solved.every(Boolean)) {
    team.booths[boothNo].passed = true;
    if (!team.booths[boothNo].passedAt) team.booths[boothNo].passedAt = now();
  }
  updateCompletion(team);
  saveDB(db);

  if (!ok) return res.status(400).json({ ok: false, error: '오답입니다. 다시 시도하세요.' });
  res.json({ ok: true, booth: team.booths[boothNo], status: team.status });
});

app.post('/api/team/:teamKey/feedback', (req, res) => {
  const db = loadDB();
  const team = getTeam(db, req.params.teamKey);
  if (!team) return res.status(404).json({ error: '팀 없음' });
  const { rating, eventFeedback, teamWish } = req.body || {};
  team.feedback = { rating: rating || '', eventFeedback: eventFeedback || '', teamWish: teamWish || '', at: now() };
  saveDB(db);
  res.json({ ok: true });
});

app.get('/api/admin/summary', (_req, res) => {
  const db = loadDB();
  const teams = db.teams.map(ensureTeamShape).sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
  const feedbacks = teams.filter(t => t.feedback).map(t => ({ teamName: t.teamName, ...t.feedback }));
  res.json({ teams, feedbacks });
});

if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => console.log(`event-booth-app running on http://localhost:${PORT}`));
}

export default app;