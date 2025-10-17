import { BestMCP, Tool, Param } from '../src/index.js';
import { z } from 'zod';

// 用户数据模型
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
}

// 模拟数据存储
const users: Map<string, User> = new Map();
const posts: Map<string, Post> = new Map();
let userIdCounter = 1;
let postIdCounter = 1;

// 用户服务
class UserService {
  @Tool("创建新用户")
  async createUser(
    @Param(z.string().min(2).max(50), "用户名") name: string,
    @Param(z.string().email(), "邮箱地址") email: string
  ): Promise<User> {
    const id = `user_${userIdCounter++}`;
    const user: User = {
      id,
      name,
      email,
      createdAt: new Date().toISOString()
    };

    users.set(id, user);
    console.log(`创建用户: ${name} (${email})`);
    return user;
  }

  @Tool("获取用户信息")
  async getUser(
    @Param(z.string(), "用户ID") userId: string
  ): Promise<User | null> {
    const user = users.get(userId);
    if (!user) {
      throw new Error(`用户 ${userId} 不存在`);
    }
    return user;
  }

  @Tool("搜索用户")
  async searchUsers(
    @Param(z.string().optional(), "搜索关键词") query?: string,
    @Param(z.number().min(1).max(100).default(10), "每页数量") limit: number = 10
  ): Promise<User[]> {
    let allUsers = Array.from(users.values());

    if (query) {
      allUsers = allUsers.filter(user =>
        user.name.toLowerCase().includes(query.toLowerCase()) ||
        user.email.toLowerCase().includes(query.toLowerCase())
      );
    }

    return allUsers.slice(0, limit);
  }

  @Tool("获取所有用户")
  async getAllUsers(): Promise<User[]> {
    return Array.from(users.values());
  }

  @Tool("删除用户")
  async deleteUser(
    @Param(z.string(), "用户ID") userId: string
  ): Promise<{ success: boolean; message: string }> {
    const user = users.get(userId);
    if (!user) {
      return { success: false, message: `用户 ${userId} 不存在` };
    }

    users.delete(userId);
    console.log(`删除用户: ${user.name} (${userId})`);
    return { success: true, message: `用户 ${user.name} 已删除` };
  }
}

// 文章服务
class PostService {
  @Tool("创建新文章")
  async createPost(
    @Param(z.string().min(1).max(200), "文章标题") title: string,
    @Param(z.string().min(10), "文章内容") content: string,
    @Param(z.string(), "作者ID") authorId: string
  ): Promise<Post> {
    // 验证作者是否存在
    const author = users.get(authorId);
    if (!author) {
      throw new Error(`作者 ${authorId} 不存在`);
    }

    const id = `post_${postIdCounter++}`;
    const post: Post = {
      id,
      title,
      content,
      authorId,
      createdAt: new Date().toISOString()
    };

    posts.set(id, post);
    console.log(`创建文章: ${title} (作者: ${author.name})`);
    return post;
  }

  @Tool("获取文章信息")
  async getPost(
    @Param(z.string(), "文章ID") postId: string
  ): Promise<Post | null> {
    const post = posts.get(postId);
    if (!post) {
      throw new Error(`文章 ${postId} 不存在`);
    }
    return post;
  }

  @Tool("搜索文章")
  async searchPosts(
    @Param(z.string().optional(), "搜索关键词") query?: string,
    @Param(z.string().optional(), "作者ID") authorId?: string,
    @Param(z.number().min(1).max(100).default(10), "每页数量") limit: number = 10
  ): Promise<Post[]> {
    let allPosts = Array.from(posts.values());

    if (query) {
      allPosts = allPosts.filter(post =>
        post.title.toLowerCase().includes(query.toLowerCase()) ||
        post.content.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (authorId) {
      allPosts = allPosts.filter(post => post.authorId === authorId);
    }

    return allPosts.slice(0, limit);
  }

  @Tool("获取作者的文章")
  async getPostsByAuthor(
    @Param(z.string(), "作者ID") authorId: string
  ): Promise<Post[]> {
    const author = users.get(authorId);
    if (!author) {
      throw new Error(`作者 ${authorId} 不存在`);
    }

    const authorPosts = Array.from(posts.values())
      .filter(post => post.authorId === authorId);

    return authorPosts;
  }

  @Tool("删除文章")
  async deletePost(
    @Param(z.string(), "文章ID") postId: string
  ): Promise<{ success: boolean; message: string }> {
    const post = posts.get(postId);
    if (!post) {
      return { success: false, message: `文章 ${postId} 不存在` };
    }

    posts.delete(postId);
    console.log(`删除文章: ${post.title} (${postId})`);
    return { success: true, message: `文章 "${post.title}" 已删除` };
  }
}

// 系统服务
class SystemService {
  @Tool("获取服务器状态")
  async getServerStatus(): Promise<{
    status: string;
    uptime: number;
    memory: NodeJS.MemoryUsage;
    timestamp: string;
    userCount: number;
    postCount: number;
  }> {
    return {
      status: 'running',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      userCount: users.size,
      postCount: posts.size
    };
  }

  @Tool("执行健康检查")
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    checks: {
      database: 'ok' | 'error';
      memory: 'ok' | 'warning' | 'error';
      services: 'ok' | 'error';
    };
    timestamp: string;
  }> {
    const memoryUsage = process.memoryUsage();
    const memoryThreshold = 500 * 1024 * 1024; // 500MB

    return {
      status: 'healthy',
      checks: {
        database: 'ok',
        memory: memoryUsage.heapUsed > memoryThreshold ? 'warning' : 'ok',
        services: 'ok'
      },
      timestamp: new Date().toISOString()
    };
  }

  @Tool("清理数据")
  async cleanupData(
    @Param(z.enum(['users', 'posts', 'all']), "清理类型") type: 'users' | 'posts' | 'all'
  ): Promise<{ success: boolean; message: string; deletedCount: number }> {
    let deletedCount = 0;

    switch (type) {
      case 'users':
        deletedCount = users.size;
        users.clear();
        break;
      case 'posts':
        deletedCount = posts.size;
        posts.clear();
        break;
      case 'all':
        deletedCount = users.size + posts.size;
        users.clear();
        posts.clear();
        break;
    }

    console.log(`清理数据: ${type}, 删除 ${deletedCount} 条记录`);

    return {
      success: true,
      message: `成功清理 ${type} 数据`,
      deletedCount
    };
  }
}

// 创建 MCP 服务器实例
const mcp = new BestMCP("blog-service", "1.0.0");

// 注册所有服务
mcp.register(UserService);
mcp.register(PostService);
mcp.register(SystemService);

// 启动 HTTP 服务器
async function startAdvancedHTTPServer() {
  try {
    // 从环境变量读取配置
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '127.0.0.1';

    console.log('🚀 正在启动高级 HTTP MCP 服务器...');
    console.log(`📍 地址: http://${host}:${port}/mcp`);
    console.log(`📊 环境: ${process.env.NODE_ENV || 'development'}`);

    await mcp.run({
      transport: 'http',
      port,
      host
    });

    console.log('\n✅ HTTP MCP 服务器启动成功!');
    console.log('\n📋 可用工具:');

    const toolList = mcp.getToolList();
    toolList.forEach((tool, index) => {
      console.log(`  ${index + 1}. ${tool}`);
    });

    console.log('\n🧪 测试命令:');
    console.log(`# 获取工具列表`);
    console.log(`curl -X POST http://${host}:${port}/mcp \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'`);
    console.log('');
    console.log(`# 创建用户`);
    console.log(`curl -X POST http://${host}:${port}/mcp \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "createUser", "arguments": {"name": "张三", "email": "zhangsan@example.com"}}}'`);
    console.log('');
    console.log(`# 获取服务器状态`);
    console.log(`curl -X POST http://${host}:${port}/mcp \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "getServerStatus", "arguments": {}}}'`);

    console.log('\n📝 示例工作流:');
    console.log('1. 创建用户 -> createUser');
    console.log('2. 创建文章 -> createPost (需要用户ID)');
    console.log('3. 搜索文章 -> searchPosts');
    console.log('4. 查看状态 -> getServerStatus');

    console.log('\n💡 提示: 使用 Ctrl+C 停止服务器');

    // 优雅关闭处理
    process.on('SIGINT', async () => {
      console.log('\n🛑 正在停止服务器...');
      await mcp.stopServer();
      console.log('✅ 服务器已停止');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 收到终止信号，正在停止服务器...');
      await mcp.stopServer();
      console.log('✅ 服务器已停止');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ 启动 HTTP 服务器失败:', error);

    if (error.message.includes('EADDRINUSE')) {
      console.error(`💡 端口 ${process.env.PORT || 3000} 被占用，请尝试其他端口`);
    } else if (error.message.includes('EACCES')) {
      console.error('💡 权限不足，请检查端口权限（1024以下端口需要管理员权限）');
    }

    process.exit(1);
  }
}

// 添加一些初始数据
async function addInitialData() {
  console.log('🌱 添加初始数据...');

  // 创建示例用户
  const user1 = await mcp.executeTool('createUser', {
    name: '张三',
    email: 'zhangsan@example.com'
  });

  const user2 = await mcp.executeTool('createUser', {
    name: '李四',
    email: 'lisi@example.com'
  });

  // 创建示例文章
  await mcp.executeTool('createPost', {
    title: 'BestMCP 使用心得',
    content: 'BestMCP 是一个非常好用的 MCP 服务器框架，支持装饰器语法和类型安全...',
    authorId: user1.id
  });

  await mcp.executeTool('createPost', {
    title: 'HTTP 传输层迁移指南',
    content: '本文介绍如何从 stdio 迁移到 HTTP 传输层，包括配置、客户端集成等...',
    authorId: user2.id
  });

  console.log('✅ 初始数据添加完成');
}

// 启动服务器
if (require.main === module) {
  addInitialData().then(() => {
    startAdvancedHTTPServer();
  });
}

export { UserService, PostService, SystemService };