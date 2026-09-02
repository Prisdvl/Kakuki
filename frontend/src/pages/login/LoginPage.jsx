import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { login } from "../../api/user";
import useUserStore from "../../store/userStore";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { fetchUser } = useUserStore();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await login(values);
      localStorage.setItem("access_token", res.access);
      localStorage.setItem("refresh_token", res.refresh);
      await fetchUser();
      message.success("登录成功");
      navigate("/");
    } catch (err) {
      message.error(err.response?.data?.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-[calc(100vh-6rem)] pt-8 pb-24 px-4 overflow-y-auto">
      <div className="glass mouse-glow mt-4" style={{ borderRadius: 24, padding: '2.5rem', width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>欢迎回来</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: '0.5rem' }}>登录你的 Kakuki 账号</p>
        </div>
        <Form onFinish={onFinish} layout="vertical" autoComplete="off">
          <Form.Item name="username" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              登录
            </Button>
          </Form.Item>
          <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
            还没有账号？<Link to="/register" style={{ color: "var(--accent)", fontWeight: 500 }}>立即注册</Link>
          </div>
        </Form>
      </div>
    </div>
  );
}
