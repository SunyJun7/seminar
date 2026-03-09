const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 추후 DB 연동 시 여기에 API 라우트 추가
// app.post('/api/register', async (req, res) => { ... });

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
