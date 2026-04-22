// STEP 1 → STEP 2 전환
document.getElementById('btnNext').addEventListener('click', goToStep2);

function goToStep2() {
  const name    = document.getElementById('reviewName').value.trim();
  const company = document.getElementById('reviewCompany').value.trim();
  const dept    = document.getElementById('reviewDept').value.trim();
  const phone   = document.getElementById('reviewPhone').value.trim();
  const email   = document.getElementById('reviewEmail').value.trim();

  if (!name)    return highlight('reviewName',    '이름을 입력해 주세요.');
  if (!company) return highlight('reviewCompany', '회사명을 입력해 주세요.');
  if (!dept)    return highlight('reviewDept',    '부서를 입력해 주세요.');

  const phoneRaw = phone.replace(/-/g, '');
  if (!/^0\d{8,10}$/.test(phoneRaw)) return highlight('reviewPhone', '올바른 연락처를 입력해 주세요.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return highlight('reviewEmail', '올바른 이메일을 입력해 주세요.');

  // 단계 전환
  document.getElementById('step1').classList.remove('active');
  document.getElementById('step2').classList.add('active');
  document.getElementById('dot1').classList.replace('active', 'done');
  document.getElementById('line1').classList.add('done');
  document.getElementById('dot2').classList.add('active');
}

function highlight(id, msg) {
  const el = document.getElementById(id);
  el.classList.add('error-field');
  el.focus();
  el.addEventListener('input', () => el.classList.remove('error-field'), { once: true });
  alert(msg);
}

// STEP 2 제출
document.getElementById('btnSubmitReview').addEventListener('click', submitReview);

async function submitReview() {
  const ratingEl    = document.querySelector('input[name="rating"]:checked');
  const ratingError = document.getElementById('ratingError');
  const content     = document.getElementById('reviewContent').value.trim();

  if (!ratingEl) {
    ratingError.style.display = 'block';
    return;
  }
  ratingError.style.display = 'none';

  if (!content) {
    document.getElementById('reviewContent').focus();
    return;
  }

  const btn = document.getElementById('btnSubmitReview');
  btn.disabled    = true;
  btn.textContent = '제출 중...';

  const payload = {
    name:    document.getElementById('reviewName').value.trim(),
    company: document.getElementById('reviewCompany').value.trim(),
    dept:    document.getElementById('reviewDept').value.trim(),
    phone:   document.getElementById('reviewPhone').value.trim(),
    email:   document.getElementById('reviewEmail').value.trim(),
    rating:  ratingEl.value,
    content,
  };

  try {
    const res = await fetch('/api/review', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    if (res.ok) {
      document.querySelector('.review-card').innerHTML = `
        <div style="text-align:center;padding:20px 0;">
          <div style="font-size:56px;margin-bottom:16px;">🙏</div>
          <h2 style="color:#1a237e;margin-bottom:8px;">감사합니다!</h2>
          <p style="color:#666;">소중한 후기가 등록되었습니다.</p>
        </div>
      `;
    } else {
      const data = await res.json();
      alert(data.message || '제출 중 오류가 발생했습니다.');
      btn.disabled    = false;
      btn.textContent = '후기 제출';
    }
  } catch {
    alert('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    btn.disabled    = false;
    btn.textContent = '후기 제출';
  }
}
