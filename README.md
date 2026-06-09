# 海投助手 - 全栈职位追踪管理平台

一个轻量级的全栈 Web 应用，帮助求职者**批量管理投递的职位信息**，追踪申请状态（待投递 / 已投递 / 面试 / 拒绝 / 录用），告别混乱的 Excel 表格。

## 在线演示
> 部署后替换为你的线上地址，例如：http://your-server.com

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue3 + Element Plus | 组合式 API + CDN 引入，无需构建工具 |
| 后端 | Node.js + Express | RESTful API，轻量级 Web 框架 |
| 数据库 | MySQL | 关系型数据库，连接池管理 |
| 工具 | Postman / Git / Axios | 接口调试、版本控制、数据请求 |

##  功能列表

-  **添加职位**：输入公司、职位、链接，一键加入追踪列表
-  **状态流转**：待投递 → 已投递 → 面试 → 拒绝 / 录用，下拉框快速切换
-  **列表查看**：表格展示所有职位，按时间倒序排列
-  **删除职位**：移除不再需要的记录
-  **全栈实战**：前后端分离设计，独立完成 API 设计、数据库操作与前端交互

##登录mysql,创建数据库
CREATE DATABASE haitou_helper;
USE haitou_helper;

CREATE TABLE jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company VARCHAR(100) NOT NULL,
  position VARCHAR(100) NOT NULL,
  link TEXT,
  status VARCHAR(20) DEFAULT '待投递',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
##修改连接配置
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '你的密码',
  database: 'haitou_helper',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
##安装依赖
npm install
#启动项目
node app.js
