# 세미나 시스템 사용 가이드

## 1. 환경 변수 설정

### 로컬 개발
프로젝트 루트에 `.env` 파일 생성 후 아래 값 입력:

```
DATABASE_URL=postgresql://유저명:비밀번호@호스트:포트/DB명
NODE_ENV=development

ADMIN_ID=관리자_아이디
ADMIN_PW=관리자_비밀번호

SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=발신자@yourdomain.com
SMTP_PASS=메일_비밀번호

SITE_URL=http://localhost:3000
```

### Railway 배포
Railway 대시보드 → 웹 서비스 → **Variables** 탭에서 위 항목을 동일하게 입력.
`SITE_URL`은 Railway가 발급한 실제 도메인으로 변경:
```
SITE_URL=https://your-app.railway.app
```

---

## 2. 이메일 SMTP 설정

### 자체 도메인 메일 (cafe24, 가비아 등)
호스팅 업체 메일 설정 페이지에서 SMTP 정보를 확인 후 입력합니다.

| 환경변수 | 예시 |
|----------|------|
| SMTP_HOST | mail.yourdomain.com |
| SMTP_PORT | 587 (일반) 또는 465 (SSL) |
| SMTP_USER | info@yourdomain.com |
| SMTP_PASS | 메일 계정 비밀번호 |

**cafe24 기준:**
- SMTP_HOST: `mail.카페24도메인.com`
- SMTP_PORT: `587`

**가비아 기준:**
- SMTP_HOST: `smtp.gabia.com`
- SMTP_PORT: `587`

### Gmail 사용 시
일반 계정 비밀번호가 아닌 **앱 비밀번호** 필요:

1. [Google 계정](https://myaccount.google.com) → 보안
2. **2단계 인증** 활성화 (필수)
3. 보안 → **앱 비밀번호** → 앱: 메일, 기기: 기타 → 생성
4. 발급된 16자리를 `SMTP_PASS`에 입력

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  (16자리 앱 비밀번호)
```

---

## 3. 세미나 자료(PDF) 업로드

관리자 페이지(`/admin.html`) 상단의 **📂 세미나 자료 관리** 섹션에서:

1. **⬆️ PDF 업로드** 버튼 클릭 → PDF 파일 선택
2. 업로드 완료 후 파일 목록에 표시됨
3. 필요 없는 파일은 **삭제** 버튼으로 제거

> ⚠️ **Railway 주의사항**: Railway는 서버를 재배포하면 업로드된 파일이 초기화됩니다.
> 세미나 자료는 **이메일 발송 전에 업로드**하고, 재배포 없이 그대로 사용하세요.
> 만약 재배포가 필요하다면 파일을 다시 업로드해야 합니다.

---

## 4. 이메일 본문에 다운로드 링크 추가

`server.js`의 `downloadLinks` 배열을 수정합니다 (약 285번째 줄):

```js
const downloadLinks = [
  { label: '세미나 발표자료', file: '발표자료.pdf' },
  { label: '참고 자료',       file: '참고자료.pdf' },
];
```

- `label`: 이메일에 표시되는 링크 텍스트
- `file`: 업로드한 파일명 (정확히 일치해야 함)

---

## 5. 감사 이메일 발송

1. 세미나 자료를 관리자 페이지에서 먼저 업로드
2. `server.js`의 `downloadLinks`에 파일명 입력 후 재배포 (또는 로컬이면 서버 재시작)
3. 관리자 페이지 → **📧 감사 이메일 발송** 버튼 클릭
4. 확인 팝업에서 OK → 전체 신청자에게 일괄 발송
5. 발송 결과(성공/실패 건수) 화면에 표시됨

---

## 6. 이메일 내용 수정

`server.js`의 `subject`와 `html` 변수를 수정합니다 (약 300번째 줄):

```js
const subject = '[SmartGate] 세미나 참석 감사드립니다';  // 제목
const html = `
  <h2>참석해 주셔서 감사합니다!</h2>
  <p>본문 내용...</p>
  ...
`;
```
