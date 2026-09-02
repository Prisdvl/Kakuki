import { useState, useEffect } from "react";
import { Table, Button, Popconfirm, message } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import { deleteComment } from "../../api/comment";
import request, { extractList } from "../../api/request";

export default function CommentManage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const arts = await request.get("/articles/", { params: { page_size: 100 } });
      const articles = extractList(arts);
      const allComments = [];
      for (const art of articles) {
        const res = await request.get(`/articles/${art.id}/comments/`);
        allComments.push(...extractList(res).map((c) => ({ ...c, article_title: art.title })));
      }
      setData(allComments);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    try { await deleteComment(id); message.success("删除成功"); fetchData(); }
    catch { message.error("删除失败"); }
  };

  const columns = [
    { title: "ID", dataIndex: "id", key: "id", width: 60 },
    { title: "文章", dataIndex: "article_title", key: "article_title", ellipsis: true },
    { title: "用户", dataIndex: "user_name", key: "user_name", width: 100 },
    { title: "内容", dataIndex: "content", key: "content", ellipsis: true },
    { title: "时间", dataIndex: "created_at", key: "created_at", render: (v) => v?.slice(0, 16) },
    {
      title: "操作", key: "action", width: 80,
      render: (_, record) => (
        <Popconfirm title="确认删除？" onConfirm={() => handleDelete(record.id)}>
          <Button type="link" danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">评论管理</h2>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />
    </div>
  );
}
