import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Table, Button, Tag, Space, Popconfirm, message } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { getArticles, deleteArticle } from "../../api/article";
import { extractList } from "../../api/request";

export default function ArticleManage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await getArticles({ page_size: 100 });
      setArticles(extractList(res));
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchArticles(); }, []);

  const handleDelete = async (id) => {
    try { await deleteArticle(id); message.success("删除成功"); fetchArticles(); }
    catch { message.error("删除失败"); }
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "标题", dataIndex: "title", key: "title", ellipsis: true,
      render: (text, record) => (
        <Link to={`/article/${record.id}`} className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">{text}</Link>
      ),
    },
    { title: "分类", dataIndex: ["category", "name"], key: "category", render: (v) => v && <Tag>{v}</Tag> },
    { title: "阅读量", dataIndex: "views", key: "views", width: 80 },
    { title: "置顶", dataIndex: "is_top", key: "is_top", width: 60, render: (v) => v && <Tag color="red">是</Tag> },
    { title: "创建时间", dataIndex: "created_at", key: "created_at", render: (v) => v?.slice(0, 10) },
    {
      title: "操作", key: "action", width: 150,
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => navigate(`/admin/articles/${record.id}/edit`)}>编辑</Button>
          <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">文章管理</h2>
        <Link to="/admin/articles/create"><Button type="primary" icon={<PlusOutlined />}>发布文章</Button></Link>
      </div>
      <Table columns={columns} dataSource={articles} rowKey="id" loading={loading} />
    </div>
  );
}
