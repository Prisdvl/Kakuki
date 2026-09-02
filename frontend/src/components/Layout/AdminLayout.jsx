import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, FolderOutlined,
  TagsOutlined, CommentOutlined, ArrowLeftOutlined,
  SunOutlined, MoonOutlined,
} from '@ant-design/icons';
import useThemeStore from '../../store/themeStore';
import useUserStore from '../../store/userStore';

const { Header, Sider, Content } = Layout;

export default function AdminLayout() {
  const { isDark, toggleTheme, initTheme } = useThemeStore();
  const { isLoggedIn, user } = useUserStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    if (!isLoggedIn) navigate('/login');
  }, [isLoggedIn]);

  const menuItems = [
    { key: '/admin', icon: <DashboardOutlined />, label: <Link to='/admin'>仪表盘</Link> },
    { key: '/admin/articles', icon: <FileTextOutlined />, label: <Link to='/admin/articles'>文章管理</Link> },
    { key: '/admin/categories', icon: <FolderOutlined />, label: <Link to='/admin/categories'>分类管理</Link> },
    { key: '/admin/tags', icon: <TagsOutlined />, label: <Link to='/admin/tags'>标签管理</Link> },
    { key: '/admin/comments', icon: <CommentOutlined />, label: <Link to='/admin/comments'>评论管理</Link> },
  ];

  return (
    <Layout className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        className='admin-sider'
        theme={isDark ? 'dark' : 'light'}
        style={{
          background: 'var(--glass-bg-strong)',
          borderRight: '1px solid var(--glass-border)',
        }}
      >
        <div className='h-16 flex items-center justify-center font-bold text-lg' style={{ color: 'var(--accent)' }}>
          {collapsed ? 'K' : 'Kakuki Admin'}
        </div>
        <Menu
          mode='inline'
          selectedKeys={[location.pathname]}
          items={menuItems}
          className='border-0'
        />
      </Sider>
      <Layout style={{ background: 'var(--bg-primary)' }}>
        <Header style={{
          background: 'var(--glass-bg-strong)',
          borderBottom: '1px solid var(--glass-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.5rem',
          height: 64,
          lineHeight: '64px',
        }}>
          <Link to='/'><Button type='text' icon={<ArrowLeftOutlined />}>返回前台</Button></Link>
          <div className='flex items-center gap-3'>
            <Button type='text' icon={isDark ? <SunOutlined /> : <MoonOutlined />} onClick={toggleTheme} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{user?.nickname || user?.username}</span>
          </div>
        </Header>
        <Content style={{ padding: '1.5rem', background: 'var(--bg-primary)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
