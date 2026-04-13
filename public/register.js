// =============================================================
// ⚠️ 이 파일은 폼 검증 및 API 전송 로직입니다.
//
// ✏️ [수정 가능] REQUIRED_FIELDS 의 label 값
//    → 팝업에 표시되는 항목명을 바꾸고 싶을 때만 수정
//    예: '이름' → '성함' 으로 바꾸면 팝업 문구도 자동으로 바뀜
//
// ⚠️ id 값은 register.html 의 input id 와 반드시 일치해야 합니다.
//    id 를 바꾸면 검증이 동작하지 않으므로 수정하지 마세요.
// =============================================================

// 필수 필드 목록 (위→아래 순서대로 검사됨)
// ✏️ [수정 가능] label 의 텍스트만 변경 가능
const REQUIRED_FIELDS = [
  { id: 'name',          label: '이름',                    type: 'text' },
  { id: 'company',       label: '회사명',                   type: 'text' },
  { id: 'position',      label: '직책',                    type: 'text' },
  { id: 'phone',         label: '연락처',                   type: 'text' },
  { id: 'email',         label: '이메일',                   type: 'text' },
  { id: 'privacy_agree', label: '개인정보 수집 및 이용 동의',  type: 'checkbox' },
];

// =============================================================
// ⚠️ 아래 코드는 수정하지 마세요
// =============================================================

let pendingFocusId = null;

function submitForm() {
  // 모든 필드 error 스타일 초기화
  REQUIRED_FIELDS.forEach(f => {
    const el = document.getElementById(f.id);
    if (el) el.classList.remove('error-field');
  });

  // 위→아래 순서로 첫 번째 미입력 필드 탐색
  for (const field of REQUIRED_FIELDS) {
    const el = document.getElementById(field.id);
    if (!el) continue;

    const isEmpty =
      field.type === 'checkbox' ? !el.checked : el.value.trim() === '';

    if (isEmpty) {
      if (field.type !== 'checkbox') el.classList.add('error-field');
      showModal(`<strong>${field.label}</strong> 항목을 입력해주세요.`, field.id);
      return;
    }
  }

  // 연락처 형식 검사 (하이픈 있어도, 없어도 허용)
  const phoneEl = document.getElementById('phone');
  const phoneRaw = phoneEl.value.trim().replace(/-/g, '');
  if (!/^0\d{8,10}$/.test(phoneRaw)) {
    phoneEl.classList.add('error-field');
    showModal('올바른 <strong>연락처 형식</strong>이 아닙니다.<br><small style="color:#888;">예) 010-1234-5678 또는 01012345678</small>', 'phone');
    return;
  }

  // 이메일 형식 검사
  const emailEl = document.getElementById('email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value.trim())) {
    emailEl.classList.add('error-field');
    showModal('올바른 <strong>이메일 형식</strong>이 아닙니다.<br><small style="color:#888;">예) example@company.com</small>', 'email');
    return;
  }

  // 모든 검증 통과 → 입력 내용 확인 팝업 표시
  showConfirmModal();
}

// 입력 내용 확인 팝업 열기
function showConfirmModal() {
  const interestChecked = Array.from(
    document.querySelectorAll('input[name="interest"]:checked')
  ).map(el => el.value);

  const rows = [
    { label: '이름',    value: document.getElementById('name').value.trim() },
    { label: '회사명',  value: document.getElementById('company').value.trim() },
    { label: '직책',    value: document.getElementById('position').value.trim() },
    { label: '연락처',  value: document.getElementById('phone').value.trim() },
    { label: '이메일',  value: document.getElementById('email').value.trim() },
    { label: '관심분야', value: interestChecked.length ? interestChecked.join(', ') : '-' },
  ];

  document.getElementById('confirmTable').innerHTML = rows.map(r => `
    <div class="confirm-row">
      <span class="confirm-label">${r.label}</span>
      <span class="confirm-value">${escapeHtml(r.value)}</span>
    </div>
  `).join('');

  document.getElementById('confirmOverlay').classList.add('active');
}

// 입력 내용 확인 팝업 닫기 (수정 버튼)
function closeConfirmModal() {
  document.getElementById('confirmOverlay').classList.remove('active');
}

// 확인 버튼 → 실제 API 전송
function confirmSubmit() {
  closeConfirmModal();
  sendToServer();
}

// 서버 API로 신청 데이터 전송
async function sendToServer() {
  // 버튼 비활성화 (중복 클릭 방지)
  const btn = document.querySelector('.btn-primary');
  btn.disabled    = true;
  btn.textContent = '신청 중...';

  // 관심분야 체크된 항목 수집 (쉼표로 구분)
  const interestChecked = Array.from(
    document.querySelectorAll('input[name="interest"]:checked')
  ).map(el => el.value);

  const payload = {
    name:     document.getElementById('name').value.trim(),
    company:  document.getElementById('company').value.trim(),
    position: document.getElementById('position').value.trim(),
    phone:    document.getElementById('phone').value.trim(),
    email:    document.getElementById('email').value.trim(),
    interest: interestChecked.join(', ')
  };

  try {
    const res = await fetch('/api/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    if (res.ok) {
      globalThis.location.href = 'success.html'; // 성공 → 완료 페이지
    } else {
      globalThis.location.href = 'error.html';   // 실패 → 오류 페이지
    }
  } catch {
    globalThis.location.href = 'error.html';     // 네트워크 오류 → 오류 페이지
  }
}

function showModal(message, focusId) {
  pendingFocusId = focusId;
  document.getElementById('modalMsg').innerHTML = message;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');

  if (pendingFocusId) {
    const el = document.getElementById(pendingFocusId);
    if (el) {
      el.focus();
      if (el.type !== 'checkbox' && el.setSelectionRange) {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
    pendingFocusId = null;
  }
}

// HTML 특수문자 이스케이프 (확인 팝업 XSS 방지)
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 입력 시 error 스타일 자동 해제
REQUIRED_FIELDS.forEach(f => {
  const el = document.getElementById(f.id);
  if (!el) return;
  const event = f.type === 'checkbox' ? 'change' : 'input';
  el.addEventListener(event, () => el.classList.remove('error-field'));
});

document.getElementById('btnSubmit').addEventListener('click', submitForm);
document.getElementById('btnModalOk').addEventListener('click', closeModal);
document.getElementById('btnModalEdit').addEventListener('click', closeConfirmModal);
document.getElementById('btnConfirmOk').addEventListener('click', confirmSubmit);

// 모달 외부 클릭 시 닫기
document.getElementById('modalOverlay').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});

document.getElementById('confirmOverlay').addEventListener('click', function (e) {
  if (e.target === this) closeConfirmModal();
});
