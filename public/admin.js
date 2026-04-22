let registrations = [];

// ===== 탭 전환 =====
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ===== 신청자 목록 =====
async function loadRegistrations() {
  try {
    const res   = await fetch('/api/registrations');
    const data  = await res.json();
    const tbody = document.getElementById('tableBody');
    const countEl = document.getElementById('countText');

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-state">아직 신청자가 없습니다.</td></tr>`;
      countEl.textContent = '총 0명';
      return;
    }

    registrations = data;
    countEl.textContent = `총 ${data.length}명`;
    tbody.innerHTML = data.map((row, i) => `
      <tr>
        <td class="no">${i + 1}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.company)}</td>
        <td>${escapeHtml(row.position)}</td>
        <td>${escapeHtml(row.phone)}</td>
        <td>${escapeHtml(row.email)}</td>
        <td>${escapeHtml(row.interest || '-')}</td>
        <td>${new Date(row.created_at).toLocaleString('ko-KR')}</td>
        <td><button class="btn-row-delete" data-id="${row.id}">삭제</button></td>
      </tr>
    `).join('');

    tbody.addEventListener('click', e => {
      const btn = e.target.closest('.btn-row-delete');
      if (btn) deleteRegistration(btn.dataset.id);
    });
  } catch {
    document.getElementById('tableBody').innerHTML =
      `<tr><td colspan="9" class="empty-state">데이터를 불러오지 못했습니다.</td></tr>`;
  }
}

async function deleteRegistration(id) {
  if (!confirm('이 신청자를 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/registrations/${id}`, { method: 'DELETE' });
    if (res.ok) await loadRegistrations();
    else alert('삭제에 실패했습니다.');
  } catch { alert('오류가 발생했습니다.'); }
}

// ===== 설문 목록 =====
function normalizePhone(phone) {
  return String(phone || '').replace(/-/g, '').trim();
}

async function loadReviews() {
  try {
    const [reviewRes, regRes] = await Promise.all([
      fetch('/api/reviews'),
      fetch('/api/registrations'),
    ]);
    const list = await reviewRes.json();
    const regs = await regRes.json();
    const el   = document.getElementById('reviewList');
    const countEl = document.getElementById('reviewCountText');

    // 사전등록자 키 셋 (이름 + 정규화된 연락처)
    const regSet = new Set(
      (Array.isArray(regs) ? regs : []).map(r => `${r.name}__${normalizePhone(r.phone)}`)
    );

    if (!Array.isArray(list) || list.length === 0) {
      el.innerHTML = '<tr><td colspan="9" class="empty-state">아직 설문 응답이 없습니다.</td></tr>';
      countEl.textContent = '총 0명';
      return;
    }

    countEl.textContent = `총 ${list.length}명`;
    el.innerHTML = list.map((r, i) => {
      const isReg = regSet.has(`${r.name}__${normalizePhone(r.phone)}`);
      return `
        <tr>
          <td class="no">${i + 1}</td>
          <td style="text-align:center;font-size:16px;">${isReg ? '✅' : ''}</td>
          <td>${escapeHtml(r.name)}</td>
          <td>${escapeHtml(r.company)}</td>
          <td>${escapeHtml(r.dept)}</td>
          <td>${escapeHtml(r.phone)}</td>
          <td>${escapeHtml(r.email)}</td>
          <td>${new Date(r.created_at).toLocaleString('ko-KR')}</td>
          <td><button class="btn-row-delete" data-id="${r.id}">삭제</button></td>
        </tr>
      `;
    }).join('');

    el.addEventListener('click', e => {
      const btn = e.target.closest('.btn-row-delete');
      if (btn) deleteReview(btn.dataset.id);
    });
  } catch {
    document.getElementById('reviewList').innerHTML =
      '<tr><td colspan="9" class="empty-state">데이터를 불러오지 못했습니다.</td></tr>';
  }
}

async function deleteReview(id) {
  if (!confirm('이 설문 항목을 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/api/reviews/${id}`, { method: 'DELETE' });
    if (res.ok) await loadReviews();
    else alert('삭제에 실패했습니다.');
  } catch { alert('오류가 발생했습니다.'); }
}

// ===== 이메일 전체 복사 =====
document.getElementById('btnCopyEmails').addEventListener('click', () => {
  if (registrations.length === 0) { alert('신청자가 없습니다.'); return; }
  const emails = registrations.map(r => r.email).join(', ');
  navigator.clipboard.writeText(emails).then(() => {
    const btn = document.getElementById('btnCopyEmails');
    btn.textContent = '✅ 복사됨!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '📋 이메일 전체 복사'; btn.classList.remove('copied'); }, 2000);
  });
});

// ===== 파일 업로드/목록 =====
async function loadFiles() {
  try {
    const res  = await fetch('/api/files');
    const list = await res.json();
    const el   = document.getElementById('fileList');

    if (!Array.isArray(list) || list.length === 0) {
      el.innerHTML = '<span style="font-size:13px;color:#aaa;">업로드된 파일이 없습니다.</span>';
      return;
    }

    el.innerHTML = list.map(f => `
      <div class="file-item">
        <span>
          <span class="file-name">📄 ${escapeHtml(f.filename)}</span>
          <span class="file-meta">${(f.size / 1024).toFixed(0)} KB</span>
        </span>
        <span style="display:flex;gap:6px;">
          <button class="btn-copylink" data-filename="${escapeHtml(f.filename)}">🔗 링크 복사</button>
          <button class="btn-delete" data-filename="${escapeHtml(f.filename)}">삭제</button>
        </span>
      </div>
    `).join('');

    el.addEventListener('click', e => {
      const delBtn  = e.target.closest('.btn-delete');
      const copyBtn = e.target.closest('.btn-copylink');
      if (delBtn)  deleteFile(delBtn.dataset.filename);
      if (copyBtn) copyFileLink(copyBtn);
    });
  } catch {
    document.getElementById('fileList').innerHTML =
      '<span style="font-size:13px;color:#c62828;">파일 목록을 불러오지 못했습니다.</span>';
  }
}

async function uploadFile() {
  const input = document.getElementById('fileInput');
  const file  = input.files[0];
  if (!file) return;

  const btn = document.getElementById('btnUpload');
  const msg = document.getElementById('uploadMsg');
  btn.disabled    = true;
  msg.textContent = '업로드 중...';
  msg.className   = 'upload-msg';

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res  = await fetch('/api/upload', { method: 'POST', body: formData });
    const data = await res.json();
    if (res.ok && data.success) {
      msg.className   = 'upload-msg success';
      msg.textContent = `업로드 완료: ${data.filename}`;
      await loadFiles();
    } else {
      msg.className   = 'upload-msg error';
      msg.textContent = `오류: ${data.message}`;
    }
  } catch {
    msg.className   = 'upload-msg error';
    msg.textContent = '업로드 중 오류가 발생했습니다.';
  }
  btn.disabled = false;
  input.value  = '';
}

function copyFileLink(btn) {
  const url = `${location.origin}/downloads/${encodeURIComponent(btn.dataset.filename)}`;
  navigator.clipboard.writeText(url).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✅ 복사됨!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });
}

async function deleteFile(filename) {
  if (!confirm(`"${filename}" 파일을 삭제하시겠습니까?`)) return;
  try {
    const res = await fetch(`/api/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (res.ok) await loadFiles();
    else alert('파일 삭제에 실패했습니다.');
  } catch { alert('오류가 발생했습니다.'); }
}

document.getElementById('btnUpload').addEventListener('click', () => document.getElementById('fileInput').click());
document.getElementById('fileInput').addEventListener('change', uploadFile);

// ===== XSS 방지 =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

loadRegistrations();
loadFiles();
loadReviews();
