const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const pool = require('./db');

const app = express();
const port = 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// ==================== 测试接口 ====================
app.get('/api/hello', (req, res) => {
  res.json({ message: '前后端连通成功！' });
});

// ==================== 用户模块 ====================
// 注册
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    await pool.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, password]);
    res.json({ success: true, message: '注册成功' });
  } catch (err) {
    res.json({ success: false, message: '用户名已存在' });
  }
});

// 登录
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
  rows.length > 0 
    ? res.json({ success: true, user: rows[0] })
    : res.json({ success: false, message: '用户名或密码错误' });
});

// ==================== 简历模块 ====================
// 获取简历列表
app.get('/api/resumes', async (req, res) => {
  const { userId } = req.query;
  const [rows] = await pool.query('SELECT * FROM resumes WHERE user_id = ?', [userId]);
  res.json(rows);
});

// 添加简历
app.post('/api/resumes', upload.single('file'), async (req, res) => {
  const { userId, name, phone, email, education, experience } = req.body;
  const filePath = req.file ? req.file.path : null;
  await pool.query(
    'INSERT INTO resumes (user_id, name, phone, email, education, experience, file_path) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, name, phone, email, education, experience, filePath]
  );
  res.json({ success: true, message: '简历添加成功' });
});

// 删除简历
app.delete('/api/resumes/:id', async (req, res) => {
  await pool.query('DELETE FROM resumes WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ==================== 职位模块 ====================
// 获取职位列表
app.get('/api/jobs', async (req, res) => {
  const { userId, status } = req.query;
  let sql = 'SELECT * FROM jobs WHERE user_id = ?';
  const params = [userId];
  if (status && status !== 'all') {
    sql += ' AND status = ?';
    params.push(status);
  }
  const [rows] = await pool.query(sql, params);
  res.json(rows);
});

// 添加职位
app.post('/api/jobs', async (req, res) => {
  const { userId, company, position, salary, location, link } = req.body;
  await pool.query(
    'INSERT INTO jobs (user_id, company, position, salary, location, link) VALUES (?, ?, ?, ?, ?, ?)',
    [userId, company, position, salary, location, link]
  );
  res.json({ success: true });
});

// 更新职位状态
app.put('/api/jobs/:id', async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE jobs SET status = ? WHERE id = ?', [status, req.params.id]);
  res.json({ success: true });
});

// 删除职位
app.delete('/api/jobs/:id', async (req, res) => {
  await pool.query('DELETE FROM jobs WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// 一键抓取大厂职位（示例：模拟数据，可替换为真实API）
app.get('/api/jobs/crawl', async (req, res) => {
  // 👇 这里可以替换为真实招聘网站的公开API
  const mockJobs = [
    { company: '字节跳动', position: '前端开发工程师', salary: '20-40K', location: '北京', link: 'https://job.bytedance.com' },
    { company: '阿里巴巴', position: 'Java开发工程师', salary: '25-45K', location: '杭州', link: 'https://talent.aliyun.com' },
    { company: '腾讯', position: '产品经理', salary: '18-35K', location: '深圳', link: 'https://careers.tencent.com' }
  ];
  
  const { userId } = req.query;
  for (const job of mockJobs) {
    await pool.query(
      'INSERT INTO jobs (user_id, company, position, salary, location, link) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, job.company, job.position, job.salary, job.location, job.link]
    );
  }
  res.json({ success: true, count: mockJobs.length });
});

// ==================== 投递记录模块 ====================
// 添加投递记录
app.post('/api/applications', async (req, res) => {
  const { userId, jobId, resumeId, note } = req.body;
  await pool.query(
    'INSERT INTO applications (user_id, job_id, resume_id, note) VALUES (?, ?, ?, ?)',
    [userId, jobId, resumeId, note]
  );
  // 自动更新职位状态
  await pool.query('UPDATE jobs SET status = "已投递" WHERE id = ?', [jobId]);
  res.json({ success: true });
});

// 获取投递记录
app.get('/api/applications', async (req, res) => {
  const { userId } = req.query;
  const [rows] = await pool.query(`
    SELECT a.*, j.company, j.position, r.name as resume_name 
    FROM applications a
    LEFT JOIN jobs j ON a.job_id = j.id
    LEFT JOIN resumes r ON a.resume_id = r.id
    WHERE a.user_id = ?
    ORDER BY a.applied_at DESC
  `, [userId]);
  res.json(rows);
});

// ==================== 数据统计模块 ====================
app.get('/api/stats', async (req, res) => {
  const { userId } = req.query;
  
  // 总投递数
  const [total] = await pool.query('SELECT COUNT(*) as count FROM applications WHERE user_id = ?', [userId]);
  
  // 各状态数量
  const [statusStats] = await pool.query('SELECT status, COUNT(*) as count FROM jobs WHERE user_id = ? GROUP BY status', [userId]);
  
  // 每日投递量（近7天）
  const [dailyStats] = await pool.query(`
    SELECT DATE(applied_at) as date, COUNT(*) as count 
    FROM applications 
    WHERE user_id = ? AND applied_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE(applied_at)
  `, [userId]);

  res.json({
    total: total[0].count,
    status: statusStats,
    daily: dailyStats
  });
});

// 启动服务
app.listen(port, () => {
  console.log(`✅ 后端运行在 http://localhost:${port}`);
  console.log(`📁 简历文件存储在 ${path.join(__dirname, 'uploads')}`);
});
