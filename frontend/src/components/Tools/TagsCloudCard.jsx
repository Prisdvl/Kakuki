import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tags } from 'lucide-react';
import { getCategories } from '../../api/article';
import { extractList } from '../../api/request';

/** 标签 / 分类云（首页可添加组件之一） */
export default function TagsCloudCard() {
  const [categories, setCategories] = useState([]);
  useEffect(() => {
    getCategories()
      .then((res) => setCategories(extractList(res)))
      .catch(() => setCategories([]));
  }, []);

  return (
    <div className="ui-card ui-pad ui-flex-col ui-h-full">
      <div className="ui-card-head">
        <h3 className="ui-card-title">
          <Tags size={18} /> 分类云
        </h3>
      </div>
      {categories.length === 0 ? (
        <div className="ui-empty ui-empty-inline ui-flex-1">
          <span className="ui-empty-text">暂无分类</span>
        </div>
      ) : (
        <div className="tag-cloud-container ui-flex-1">
          {categories.map((c) => (
            <Link key={c.id} to="/archive" className="ui-chip ui-chip-plain">
              {c.name}
              <span className="ui-chip-count">{c.article_count ?? 0}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}