import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, Form, Input, Button, Select, Switch, Upload, message } from "antd";
import { UploadOutlined, PlusOutlined } from "@ant-design/icons";
import MDEditor from "@uiw/react-md-editor";
import "@uiw/react-md-editor/markdown-editor.css";
import { getArticleDetail, createArticle, updateArticle, getCategories } from "../../api/article";
import { extractList } from "../../api/request";
import request from "../../api/request";
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
  const [coverFile, setCoverFile] = useState(null);
  const [content, setContent] = useState("");
  const [categories, setCategories] = useState([]);
  const [catSearch, setCatSearch] = useState("");

  // 分类：初始为空（不预置），写文章时输入新名称直接创建
  useEffect(() => {
    getCategories().then((res) => setCategories(extractList(res))).catch(() => {});
  }, []);

  /** 输入了新分类名 → 创建并选中（随手添加，无需先跑去后台建） */
  const handleCreateCategory = async (name) => {
    try {
      const res = await request.post("/categories/manage/", { name, description: "" });
      const created = res?.data ?? res;
      if (created?.id) {
        setCategories((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created]));
        form.setFieldValue("category", created.id);
        message.success(`已创建分类「${name}」`);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || "创建分类失败");
    } finally {
      setCatSearch("");
    }
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      getArticleDetail(id).then((res) => {
        const article = res.data;
        form.setFieldsValue({
          title: article.title, summary: article.summary,
          is_top: article.is_top,
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
    <div className="max-w-4xl mx-auto admin-page">
      <h2 className="admin-page-title">{id ? "编辑文章" : "写文章"}</h2>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: "请输入标题" }]}>
            <Input placeholder="文章标题" size="large" />
          </Form.Item>
          <Form.Item name="summary" label="摘要">
            <Input.TextArea rows={2} placeholder="文章摘要（选填）" />
          </Form.Item>
          <div className="flex gap-4 flex-wrap">
            <Form.Item name="category" label="分类（初始为空，输入新名称直接创建）">
              <Select
                showSearch
                allowClear
                placeholder="输入分类名，回车创建并选中…"
                style={{ width: 300 }}
                options={categories.map((c) => ({ label: c.name, value: c.id }))}
                onSearch={(v) => setCatSearch(v)}
                onSelect={() => setCatSearch("")}
                onClear={() => setCatSearch("")}
                filterOption={(input, option) =>
                  String(option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                }
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    {catSearch.trim() &&
                      !categories.some((c) => c.name === catSearch.trim()) && (
                        <div
                          className="category-create-option"
                          onMouseDown={(e) => { e.preventDefault(); handleCreateCategory(catSearch.trim()); }}
                        >
                          <PlusOutlined /> 新建分类「{catSearch.trim()}」
                        </div>
                      )}
                  </>
                )}
              />
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
