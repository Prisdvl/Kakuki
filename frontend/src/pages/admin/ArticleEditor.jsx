import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Select, Switch, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { getArticleDetail, createArticle, updateArticle, getCategories } from "../../api/article";
import { extractList } from "../../api/request";

export default function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [coverFile, setCoverFile] = useState(null);

  useEffect(() => {
    getCategories().then((res) => setCategories(extractList(res)));
  }, []);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getArticleDetail(id).then((res) => {
        const article = res.data;
        form.setFieldsValue({
          title: article.title, content: article.content, summary: article.summary,
          category: article.category?.id, is_top: article.is_top,
        });
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const onFinish = async (values) => {
    setLoading(true);
    const formData = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      formData.append(k, v);
    });
    if (coverFile) formData.append("cover_image", coverFile);
    try {
      if (id) { await updateArticle(id, formData); message.success("更新成功"); }
      else { await createArticle(formData); message.success("发布成功"); }
      navigate("/admin/articles");
    } catch (err) {
      message.error(err.response?.data?.message || "操作失败");
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">{id ? "编辑文章" : "发布文章"}</h2>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
            <Input placeholder="文章标题" size="large" />
          </Form.Item>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={2} placeholder="文章摘要（选填）" />
          </Form.Item>
          <div className="flex gap-4 flex-wrap">
            <Form.Item name="category" label="分类">
              <Select placeholder="选择分类" allowClear style={{ width: 200 }}
                options={categories.map((c) => ({ label: c.name, value: c.id }))} />
            </Form.Item>
            <Form.Item name="is_top" label="置顶" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
          <Form.Item label="封面图">
            <Upload beforeUpload={(file) => { setCoverFile(file); return false; }} maxCount={1}>
              <Button icon={<UploadOutlined />}>选择封面图</Button>
            </Upload>
          </Form.Item>
          <Form.Item name="content" label="内容 (Markdown)" rules={[{ required: true, message: "请输入内容" }]}>
            <Input.TextArea rows={20} placeholder="使用 Markdown 语法编写文章内容..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large">{id ? "更新" : "发布"}</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
