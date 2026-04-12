// =============================================================
// 세미나 등록 시스템 - 서버
// =============================================================

const express      = require('express');
const path         = require('path');
const fs           = require('fs');                 // 파일 시스템
const crypto       = require('crypto');             // 타이밍 안전 비교
const helmet       = require('helmet');             // 보안 헤더
const rateLimit    = require('express-rate-limit'); // 요청 횟수 제한
const multer       = require('multer');             // 파일 업로드
const { Pool }     = require('pg');                 // PostgreSQL 연결
const ExcelJS      = require('exceljs');            // Excel 파일 생성

// 업로드 디렉터리 준비
const DOWNLOADS_DIR = path.join(__dirname, 'public', 'downloads');
if (!fs.existsSync(DOWNLOADS_DIR)) fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });

// multer 설정 — PDF만 허용, 파일당 50MB 제한
const upload = multer({
  dest: DOWNLOADS_DIR,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('PDF 파일만 업로드할 수 있습니다.'));
    }
  }
});

const app  = express();
const PORT = process.env.PORT || 3000; // Railway는 PORT 환경변수를 자동 주입

// -------------------------------------------------------------
// DB 연결 설정
// Railway에서 PostgreSQL 서비스를 추가하면 DATABASE_URL 환경변수가
// 자동으로 설정됩니다. 로컬 개발 시에는 .env 파일에 직접 설정하세요.
// -------------------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false } // Railway는 SSL 필수
    : false                          // 로컬 개발 시 SSL 없음
});

// -------------------------------------------------------------
// DB 테이블 초기화
// 서버 시작 시 테이블이 없으면 자동으로 생성합니다.
// 이미 있으면 건드리지 않습니다 (IF NOT EXISTS).
// -------------------------------------------------------------
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS seminar_registrations (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100)  NOT NULL,  -- 이름
      company    VARCHAR(200)  NOT NULL,  -- 회사명
      position   VARCHAR(100)  NOT NULL,  -- 직책
      phone      VARCHAR(50)   NOT NULL,  -- 연락처
      email      VARCHAR(200)  NOT NULL,  -- 이메일
      interest   TEXT,                    -- 관심분야 (선택, 쉼표 구분)
      created_at TIMESTAMP DEFAULT NOW()  -- 신청 일시 (자동 기록)
    )
  `);
  console.log('DB 테이블 준비 완료');
}

app.use(helmet());        // 보안 헤더 (X-Powered-By 제거, CSP, HSTS 등)
app.use(express.json());

// 등록 API: 분당 10회 제한 (스팸/DoS 방지)
const registerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }
});

// 관리자 API: 분당 30회 제한
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
});

// =============================================================
// 관리자 인증 미들웨어 (HTTP Basic Auth)
// 보호 대상: /admin.html, /api/registrations, /api/export
//
// 인증 방식:
//   브라우저가 요청 → 서버가 401 반환 → 브라우저가 ID/PW 팝업 표시
//   → 입력값을 Base64로 인코딩해서 재요청 → 서버가 환경변수와 대조
//
// ID/PW 설정 위치:
//   Railway 대시보드 → 웹 서비스 → Variables 탭에서 ADMIN_ID, ADMIN_PW 설정
// =============================================================
function adminAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Authorization 헤더가 없거나 Basic 방식이 아니면 인증 요구
  if (!authHeader?.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('관리자 인증이 필요합니다.');
  }

  // Base64 디코딩 후 ID:PW 분리
  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
  const colonIdx = decoded.indexOf(':');
  const inputId  = decoded.slice(0, colonIdx);
  const inputPw  = decoded.slice(colonIdx + 1);

  // 환경변수에 저장된 ID/PW와 대조
  const validId = process.env.ADMIN_ID;
  const validPw = process.env.ADMIN_PW;

  // 환경변수 미설정 시 서버 오류 반환 (undefined 비교로 인한 인증 우회 방지)
  if (!validId || !validPw) {
    console.error('환경변수 ADMIN_ID 또는 ADMIN_PW가 설정되지 않았습니다.');
    return res.status(500).send('서버 설정 오류');
  }

  // 타이밍 공격 방지: 문자 길이가 다르면 dummy 버퍼로 맞춰서 항상 일정 시간 비교
  const idBuf    = Buffer.from(inputId);
  const pwBuf    = Buffer.from(inputPw);
  const validIdBuf = Buffer.from(validId);
  const validPwBuf = Buffer.from(validPw);

  const idMatch = idBuf.length === validIdBuf.length &&
    crypto.timingSafeEqual(idBuf, validIdBuf);
  const pwMatch = pwBuf.length === validPwBuf.length &&
    crypto.timingSafeEqual(pwBuf, validPwBuf);

  if (idMatch && pwMatch) {
    next(); // 인증 성공 → 다음 처리로 진행
  } else {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    return res.status(401).send('아이디 또는 비밀번호가 올바르지 않습니다.');
  }
}

// /admin.html 은 인증 후에만 제공 (express.static 보다 먼저 처리)
app.get('/admin.html', adminAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 일반 정적 파일 서빙 (index.html, register.html 등 인증 불필요)
app.use(express.static(path.join(__dirname, 'public')));

// =============================================================
// API 라우트
// =============================================================

// -------------------------------------------------------------
// POST /api/register
// 신청 폼 데이터를 받아 DB에 저장합니다.
// 성공: { success: true }
// 실패: { success: false, message: '...' }
// -------------------------------------------------------------
app.post('/api/register', registerLimiter, async (req, res) => {
  const { name, company, position, phone, email, interest } = req.body;

  // 필수 항목 서버 측 재검증 (프론트 우회 방지)
  if (!name || !company || !position || !phone || !email) {
    return res.status(400).json({ success: false, message: '필수 항목이 누락되었습니다.' });
  }

  // 연락처 형식 검증 (예: 010-1234-5678 / 02-123-4567)
  if (!/^0\d{1,2}-\d{3,4}-\d{4}$/.test(phone)) {
    return res.status(400).json({ success: false, message: '연락처 형식이 올바르지 않습니다.' });
  }

  // 이메일 형식 검증
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: '이메일 형식이 올바르지 않습니다.' });
  }

  try {
    await pool.query(
      `INSERT INTO seminar_registrations (name, company, position, phone, email, interest)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [name, company, position, phone, email, interest || '']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('DB 저장 오류:', err.message);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// -------------------------------------------------------------
// GET /api/registrations
// 관리자 페이지에서 신청자 목록을 불러올 때 사용합니다.
// 반환: 신청자 배열 (JSON)
// -------------------------------------------------------------
app.get('/api/registrations', adminLimiter, adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM seminar_registrations ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('목록 조회 오류:', err.message);
    res.status(500).json({ error: '목록을 불러오지 못했습니다.' });
  }
});

// -------------------------------------------------------------
// GET /api/export
// 신청자 전체 목록을 Excel 파일로 다운로드합니다.
// 파일명: seminar_registrations.xlsx
// -------------------------------------------------------------
app.get('/api/export', adminLimiter, adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM seminar_registrations ORDER BY created_at ASC'
    );

    const workbook = new ExcelJS.Workbook();
    const sheet    = workbook.addWorksheet('신청자 목록');

    // ✏️ [수정 가능] 컬럼 헤더명 및 너비
    sheet.columns = [
      { header: 'No',     key: 'id',         width: 8  },
      { header: '이름',   key: 'name',        width: 15 },
      { header: '회사명', key: 'company',     width: 25 },
      { header: '직책',   key: 'position',    width: 15 },
      { header: '연락처', key: 'phone',       width: 18 },
      { header: '이메일', key: 'email',       width: 30 },
      { header: '관심분야', key: 'interest',  width: 25 },
      { header: '신청일시', key: 'created_at', width: 22 },
    ];

    // 헤더 행 스타일 (굵게 + 배경색)
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern', pattern: 'solid',
      fgColor: { argb: 'FF1A237E' }
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // 데이터 행 추가
    result.rows.forEach(row => {
      sheet.addRow({
        ...row,
        created_at: new Date(row.created_at).toLocaleString('ko-KR')
      });
    });

    // Excel 파일로 응답
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="seminar_registrations.xlsx"'
    );
    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error('Excel 생성 오류:', err.message);
    res.status(500).json({ error: 'Excel 파일 생성에 실패했습니다.' });
  }
});

// -------------------------------------------------------------
// DELETE /api/registrations/:id
// 신청자 한 명을 DB에서 삭제합니다. (테스트 데이터 정리용)
// -------------------------------------------------------------
app.delete('/api/registrations/:id', adminLimiter, adminAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ success: false, message: '잘못된 ID입니다.' });

  try {
    const result = await pool.query(
      'DELETE FROM seminar_registrations WHERE id = $1', [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: '해당 신청자를 찾을 수 없습니다.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error('신청자 삭제 오류:', err.message);
    res.status(500).json({ success: false, message: '삭제 중 오류가 발생했습니다.' });
  }
});

// -------------------------------------------------------------
// POST /api/upload
// 관리자가 PDF 파일을 서버에 업로드합니다.
// 반환: { success: true, filename: '파일명.pdf' }
// -------------------------------------------------------------
app.post('/api/upload', adminLimiter, adminAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: '파일이 없습니다.' });
    }

    // multer가 임시 파일명으로 저장하므로 원래 이름으로 변경
    const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    const safeName     = path.basename(originalName); // 경로 탐색 방지
    const finalPath    = path.join(DOWNLOADS_DIR, safeName);

    fs.rename(req.file.path, finalPath, (renameErr) => {
      if (renameErr) {
        return res.status(500).json({ success: false, message: '파일 저장에 실패했습니다.' });
      }
      console.log(`파일 업로드: ${safeName}`);
      res.json({ success: true, filename: safeName });
    });
  });
});

// -------------------------------------------------------------
// GET /api/files
// 업로드된 파일 목록을 반환합니다.
// 반환: [{ filename, size, uploadedAt }]
// -------------------------------------------------------------
app.get('/api/files', adminLimiter, adminAuth, (req, res) => {
  fs.readdir(DOWNLOADS_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: '파일 목록을 불러오지 못했습니다.' });

    const list = files
      .filter(f => f !== '.gitkeep')
      .map(f => {
        const stat = fs.statSync(path.join(DOWNLOADS_DIR, f));
        return { filename: f, size: stat.size, uploadedAt: stat.mtime };
      })
      .sort((a, b) => b.uploadedAt - a.uploadedAt);

    res.json(list);
  });
});

// -------------------------------------------------------------
// DELETE /api/files/:filename
// 업로드된 파일을 삭제합니다.
// -------------------------------------------------------------
app.delete('/api/files/:filename', adminLimiter, adminAuth, (req, res) => {
  const safeName = path.basename(req.params.filename); // 경로 탐색 방지
  const filePath = path.join(DOWNLOADS_DIR, safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, message: '파일을 찾을 수 없습니다.' });
  }

  fs.unlink(filePath, (err) => {
    if (err) return res.status(500).json({ success: false, message: '파일 삭제에 실패했습니다.' });
    console.log(`파일 삭제: ${safeName}`);
    res.json({ success: true });
  });
});


// =============================================================
// 서버 시작 (DB 초기화 후 실행)
// =============================================================
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`서버 실행 중: http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('DB 초기화 실패 - DATABASE_URL 환경변수를 확인하세요:', err.message);
    process.exit(1);
  });
