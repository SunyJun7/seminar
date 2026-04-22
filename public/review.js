document.getElementById('btnSubmitReview').addEventListener('click', submitReview);

async function submitReview() {
  const name    = document.getElementById('reviewName').value.trim();
  const company = document.getElementById('reviewCompany').value.trim();
  const dept    = document.getElementById('reviewDept').value.trim();
  const phone   = document.getElementById('reviewPhone').value.trim();
  const email   = document.getElementById('reviewEmail').value.trim();

  if (!name)    return highlight('reviewName',    '이름을 입력해 주세요.');
  if (!company) return highlight('reviewCompany', '회사명을 입력해 주세요.');
  if (!dept)    return highlight('reviewDept',    '부서를 입력해 주세요.');
  if (!/^0\d{8,10}$/.test(phone.replace(/-/g, ''))) return highlight('reviewPhone', '올바른 연락처를 입력해 주세요.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))    return highlight('reviewEmail', '올바른 이메일을 입력해 주세요.');

  const btn = document.getElementById('btnSubmitReview');
  btn.disabled    = true;
  btn.textContent = '제출 중...';

  try {
    const res = await fetch('/api/review', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, company, dept, phone, email }),
    });

    if (res.ok) {
      document.getElementById('modalOverlay').style.display = 'flex';
    } else {
      const data = await res.json();
      alert(data.message || '제출 중 오류가 발생했습니다.');
      btn.disabled    = false;
      btn.textContent = '제출하기';
    }
  } catch {
    alert('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    btn.disabled    = false;
    btn.textContent = '제출하기';
  }
}

function highlight(id, msg) {
  const el = document.getElementById(id);
  el.classList.add('error-field');
  el.focus();
  el.addEventListener('input', () => el.classList.remove('error-field'), { once: true });
  alert(msg);
}
