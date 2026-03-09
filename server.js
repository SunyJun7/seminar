// =============================================================
// 세미나 등록 시스템 - 서버
// =============================================================

const express = require('express');
const path    = require('path');
const { Pool } = require('pg');     // PostgreSQL 연결
const ExcelJS  = require('exceljs'); // Excel 파일 생성

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

app.use(express.json());
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
app.post('/api/register', async (req, res) => {
  const { name, company, position, phone, email, interest } = req.body;

  // 필수 항목 서버 측 재검증 (프론트 우회 방지)
  if (!name || !company || !position || !phone || !email) {
    return res.status(400).json({ success: false, message: '필수 항목이 누락되었습니다.' });
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
app.get('/api/registrations', async (req, res) => {
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
app.get('/api/export', async (req, res) => {
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
