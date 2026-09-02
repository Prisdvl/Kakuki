import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, message } from "antd";
import { UserOutlined, LockOutlined, MailOutlined } from "@ant-design/icons";
import { register } from "../../api/user";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      await register(values);
      message.success("注册成功，请登录");
      navigate("/login");
    } catch (err) {
      message.error(err.response?.data?.message || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start min-h-[calc(100vh-6rem)] pt-8 pb-24 px-4 overflow-y-auto">
      <div className="glass mouse-glow mt-4" style={{ borderRadius: 24, padding: '2.5rem', width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>创建账号</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: '0.5rem' }}>加入 Kakuki，开始创作之旅</p>
        </div>
        <Form onFinish={onFinish} layout="vertical" autoComplete="off">
          <Form.Item name="username" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
          </Form.Item>
          <Form.Item name="email" rules={[{ type: "email", message: "请输入有效邮箱" }]}>
            <Input prefix={<MailOutlined />} placeholder="邮箱（选填）" size="large" />
          </Form.Item>
          <Form.Item name="nickname">
            <Input prefix={<UserOutlined />} placeholder="昵称（选填）" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, min: 6, message: "密码至少6位" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">注册</Button>
          </Form.Item>
          <div style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "0.85rem" }}>
            已有账号？<Link to="/login" style={{ color: "var(--accent)", fontWeight: 500 }}>立即登录</Link>
          </div>
        </Form>
      </div>
    </div>
  );
}
