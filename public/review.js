document.getElementById('btnSubmitReview').addEventListener('click', submitReview);

async function submitReview() {
  const name    = document.getElementById('reviewName').value.trim();
  const content = document.getElementById('reviewContent').value.trim();
  const ratingEl = document.querySelector('input[name="rating"]:checked');
  const ratingError = document.getElementById('ratingError');

  // 별점 검증
  if (!ratingEl) {
    ratingError.style.display = 'block';
    return;
  }
  ratingError.style.display = 'none';

  // 후기 내용 검증
  if (!content) {
    document.getElementById('reviewContent').focus();
    return;
  }

  const btn = document.getElementById('btnSubmitReview');
  btn.disabled    = true;
  btn.textContent = '제출 중...';

  try {
    const res = await fetch('/api/review', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, rating: ratingEl.value, content })
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
