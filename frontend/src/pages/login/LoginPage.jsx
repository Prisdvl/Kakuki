import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
    <div className="login-page">
      <div className="ui-card ui-pad-lg login-card">
        <div className="login-head">
          <h2 className="login-title">欢迎回来</h2>
          <p className="login-sub">登录你的 Kakuki 账号</p>
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
          <div className="login-note">
            本站不开放注册，仅站长账号可登录
          </div>
        </Form>
      </div>
    </div>
  );
}
