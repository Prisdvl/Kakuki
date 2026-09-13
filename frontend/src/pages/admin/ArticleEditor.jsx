import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Select, Switch, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { getArticleDetail, createArticle, updateArticle, getCategories } from "../../api/article";
import { extractList } from "../../api/request";
import useThemeStore from "../../store/themeStore";

/**
 * 文章/杂谈写作页：@uiw/react-md-editor 富编辑器。
 * 工具栏（加粗/斜体/标题/引用/代码/表格/图片/链接）+ 所见即所得预览，
 * 产出仍是 Markdown —— 与后端存储、前端 react-markdown 渲染契约完全兼容。
 */
export default function ArticleEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isDark = useThemeStore((s) => s.isDark);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [coverFile, setCoverFile] = useState(null);
  const [content, setContent] = useState("");

  useEffect(() => {
    getCategories().then((res) => setCategories(extractList(res)));
  }, []);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getArticleDetail(id).then((res) => {
        const article = res.data;
        form.setFieldsValue({
          title: article.title, summary: article.summary,
          category: article.category?.id, is_top: article.is_top,
        });
        setContent(article.content || "");
      }).finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onFinish = async (values) => {
    if (!content.trim()) { message.error("请输入正文"); return; }
    setLoading(true);
    const formData = new FormData();
    Object.entries(values).forEach(([k, v]) => {
      if (v !== undefined && v !== null) formData.append(k, v);
    });
    formData.append("content", content);
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
      <h2 className="text-2xl font-bold mb-4">{id ? "编辑文章" : "写文章"}</h2>
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
          <Form.Item
            label="正文（富编辑器，工具栏支持标题/加粗/引用/代码块/表格/图片）"
            required
          >
            <div data-color-mode={isDark ? "dark" : "light"}>
              <MDEditor
                value={content}
                onChange={setContent}
                height={480}
                preview="edit"
                textareaProps={{ placeholder: "开始写作…" }}
              />
            </div>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large">{id ? "更新" : "发布"}</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
