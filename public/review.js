// PART 1 → PART 2
document.getElementById('btnNext1').addEventListener('click', () => {
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

  document.getElementById('step1').classList.remove('active');
  document.getElementById('step2').classList.add('active');
  document.getElementById('dot1').classList.replace('active', 'done');
  document.getElementById('line1').classList.add('done');
  document.getElementById('dot2').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// PART 2 → PART 1 (이전)
document.getElementById('btnBack2').addEventListener('click', () => {
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step1').classList.add('active');
  document.getElementById('dot2').classList.remove('active');
  document.getElementById('line1').classList.remove('done');
  document.getElementById('dot1').classList.replace('done', 'active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// 제출
document.getElementById('btnSubmitReview').addEventListener('click', async () => {
  const required = ['q1', 'q2', 'q3', 'q4', 'q6', 'q8'];
  let valid = true;
  required.forEach(name => {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    const errEl   = document.getElementById('err-' + name);
    if (!checked) { errEl.style.display = 'block'; valid = false; }
    else          { errEl.style.display = 'none'; }
  });
  if (!valid) return;

  const btn = document.getElementById('btnSubmitReview');
  btn.disabled    = true;
  btn.textContent = '제출 중...';

  const payload = {
    name:    document.getElementById('reviewName').value.trim(),
    company: document.getElementById('reviewCompany').value.trim(),
    dept:    document.getElementById('reviewDept').value.trim(),
    phone:   document.getElementById('reviewPhone').value.trim(),
    email:   document.getElementById('reviewEmail').value.trim(),
    q1: document.querySelector('input[name="q1"]:checked')?.value || '',
    q2: document.querySelector('input[name="q2"]:checked')?.value || '',
    q3: document.querySelector('input[name="q3"]:checked')?.value || '',
    q4: document.querySelector('input[name="q4"]:checked')?.value || '',
    q6: document.querySelector('input[name="q6"]:checked')?.value || '',
    q8: document.querySelector('input[name="q8"]:checked')?.value || '',
    q9: document.getElementById('q9').value.trim(),
  };

  try {
    const res = await fetch('/api/review', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (res.ok) {
      document.querySelector('.review-card').innerHTML = `
        <div style="text-align:center;padding:40px 0;">
          <div style="font-size:56px;margin-bottom:16px;">🙏</div>
          <h2 style="color:#1a237e;margin-bottom:8px;">감사합니다!</h2>
          <p style="color:#666;">소중한 의견이 등록되었습니다.</p>
        </div>
      `;
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
});

function highlight(id, msg) {
  const el = document.getElementById(id);
  el.classList.add('error-field');
  el.focus();
  el.addEventListener('input', () => el.classList.remove('error-field'), { once: true });
  alert(msg);
}
