// =============================================================
// ⚠️ 이 파일은 폼 검증 로직입니다.
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
  REQUIRED_FIELDS.forEach(f => {
    const el = document.getElementById(f.id);
    if (el) el.classList.remove('error-field');
  });

  for (const field of REQUIRED_FIELDS) {
    const el = document.getElementById(field.id);
    if (!el) continue;

    const isEmpty =
      field.type === 'checkbox' ? !el.checked : el.value.trim() === '';

    if (isEmpty) {
      if (field.type !== 'checkbox') {
        el.classList.add('error-field');
      }
      showModal(`<strong>${field.label}</strong> 항목을 입력해주세요.`, field.id);
      return;
    }
  }

  window.location.href = 'success.html';
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

REQUIRED_FIELDS.forEach(f => {
  const el = document.getElementById(f.id);
  if (!el) return;
  const event = f.type === 'checkbox' ? 'change' : 'input';
  el.addEventListener(event, () => el.classList.remove('error-field'));
});

document.getElementById('modalOverlay').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});
