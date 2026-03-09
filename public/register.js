// 필수 필드 목록 (위→아래 순서)
const REQUIRED_FIELDS = [
  { id: 'name',          label: '이름',              type: 'text' },
  { id: 'company',       label: '회사명',             type: 'text' },
  { id: 'position',      label: '직책',              type: 'text' },
  { id: 'phone',         label: '연락처',             type: 'text' },
  { id: 'email',         label: '이메일',             type: 'text' },
  { id: 'privacy_agree', label: '개인정보 수집 및 이용 동의', type: 'checkbox' },
];

let pendingFocusId = null; // 팝업 닫은 후 포커스할 필드 ID

function submitForm() {
  // 모든 필드의 error 스타일 초기화
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
      // 해당 필드에 error 스타일 적용
      if (field.type !== 'checkbox') {
        el.classList.add('error-field');
      }
      // 팝업 표시
      showModal(`<strong>${field.label}</strong> 항목을 입력해주세요.`, field.id);
      return; // 첫 번째 미입력만 처리 후 중단
    }
  }

  // 모든 필수 항목 입력 완료 → 성공 페이지 이동
  window.location.href = 'success.html';
}

function showModal(message, focusId) {
  pendingFocusId = focusId;
  document.getElementById('modalMsg').innerHTML = message;
  document.getElementById('modalOverlay').classList.add('active');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');

  // 팝업 닫힌 후 해당 필드로 커서 이동
  if (pendingFocusId) {
    const el = document.getElementById(pendingFocusId);
    if (el) {
      el.focus();
      // 텍스트 필드면 커서를 끝으로 이동
      if (el.type !== 'checkbox' && el.setSelectionRange) {
        const len = el.value.length;
        el.setSelectionRange(len, len);
      }
    }
    pendingFocusId = null;
  }
}

// 입력 시 error 스타일 자동 해제
REQUIRED_FIELDS.forEach(f => {
  const el = document.getElementById(f.id);
  if (!el) return;
  const event = f.type === 'checkbox' ? 'change' : 'input';
  el.addEventListener(event, () => el.classList.remove('error-field'));
});

// 모달 외부 클릭 시 닫기
document.getElementById('modalOverlay').addEventListener('click', function (e) {
  if (e.target === this) closeModal();
});
