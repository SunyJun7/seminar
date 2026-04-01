let registrations = [];

// 신청자 목록 불러오기
async function loadRegistrations() {
  try {
    const res  = await fetch('/api/registrations');
    const data = await res.json();
    const tbody = document.getElementById('tableBody');
    const countEl = document.getElementById('countText');

    if (!Array.isArray(data) || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">아직 신청자가 없습니다.</td></tr>`;
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
      </tr>
    `).join('');

  } catch {
    document.getElementById('tableBody').innerHTML =
      `<tr><td colspan="8" class="empty-state">데이터를 불러오지 못했습니다.<br>서버 연결을 확인해 주세요.</td></tr>`;
  }
}

// XSS 방지: 특수문자 이스케이프
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// 업로드된 파일 목록 불러오기
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

    // 이벤트 위임 — 동적 생성 버튼에 인라인 onclick 없이 처리
    el.addEventListener('click', handleFileListClick);
  } catch {
    document.getElementById('fileList').innerHTML =
      '<span style="font-size:13px;color:#c62828;">파일 목록을 불러오지 못했습니다.</span>';
  }
}

// 파일 업로드
async function uploadFile() {
  const input = document.getElementById('fileInput');
  const file  = input.files[0];
  if (!file) return;

  const btn = document.getElementById('btnUpload');
  const msg = document.getElementById('uploadMsg');
  btn.disabled = true;
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

  btn.disabled  = false;
  input.value   = '';
}

// 파일 목록 버튼 이벤트 위임 처리
function handleFileListClick(e) {
  const delBtn  = e.target.closest('.btn-delete');
  const copyBtn = e.target.closest('.btn-copylink');

  if (delBtn)  deleteFile(delBtn.dataset.filename);
  if (copyBtn) copyFileLink(copyBtn);
}

// 파일 다운로드 링크 복사
function copyFileLink(btn) {
  const url = `${location.origin}/downloads/${encodeURIComponent(btn.dataset.filename)}`;
  navigator.clipboard.writeText(url).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✅ 복사됨!';
    setTimeout(() => { btn.textContent = orig; }, 2000);
  });
}

// 파일 삭제
async function deleteFile(filename) {
  if (!confirm(`"${filename}" 파일을 삭제하시겠습니까?`)) return;

  try {
    const res = await fetch(`/api/files/${encodeURIComponent(filename)}`, { method: 'DELETE' });
    if (res.ok) {
      await loadFiles();
    } else {
      alert('파일 삭제에 실패했습니다.');
    }
  } catch {
    alert('오류가 발생했습니다.');
  }
}

// 이메일 전체 복사 (세미콜론 구분 — Outlook/Gmail BCC 바로 붙여넣기 가능)
function copyEmails() {
  if (registrations.length === 0) {
    alert('신청자가 없습니다.');
    return;
  }

  const emails = registrations.map(r => r.email).join(', ');
  navigator.clipboard.writeText(emails).then(() => {
    const btn = document.getElementById('btnCopyEmails');
    btn.textContent = '✅ 복사됨!';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = '📋 이메일 전체 복사';
      btn.classList.remove('copied');
    }, 2000);
  });
}

document.getElementById('btnCopyEmails').addEventListener('click', copyEmails);

document.getElementById('btnUpload').addEventListener('click', () => {
  document.getElementById('fileInput').click();
});
document.getElementById('fileInput').addEventListener('change', uploadFile);

loadRegistrations();
loadFiles();
