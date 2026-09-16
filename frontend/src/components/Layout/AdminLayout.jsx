import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, FolderOutlined,
  CommentOutlined, ArrowLeftOutlined,
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
      >
        <div className='admin-logo'>
          <img src="/favicon.png" alt="" className="admin-logo-icon" />
          {collapsed ? '' : 'Kakuki Admin'}
        </div>
        <Menu
          mode='inline'
          selectedKeys={[location.pathname]}
          items={menuItems}
          className='border-0'
        />
      </Sider>
      <Layout style={{ background: 'var(--bg-primary)' }}>
        <Header className='admin-header'>
          <Link to='/'><Button type='text' icon={<ArrowLeftOutlined />}>返回前台</Button></Link>
          <div className='flex items-center gap-3'>
            <Button type='text' icon={isDark ? <SunOutlined /> : <MoonOutlined />} onClick={toggleTheme} />
            <span className='admin-header-user'>{user?.nickname || user?.username}</span>
          </div>
        </Header>
        <Content className='admin-content'>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
