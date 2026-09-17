import { useEffect, useState } from 'react';
import { Cloud, RefreshCw, MapPin, Pencil } from 'lucide-react';
import { getWeather, readCity, saveCity } from '../../api/weather';

const PRESET_CITIES = ['北京', '上海', '广州', '深圳', '成都', '杭州'];

/** 天气卡（首页可添加组件之一，经 Worker 代理 uapis.cn） */
export default function WeatherCard() {
  const [city, setCity] = useState(readCity);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    getWeather(city)
      .then((res) => {
        if (!alive) return;
        const d = res?.data ?? res;
        if (d && d.weather && d.weather !== '未知') {
          setData(d);
        } else {
          setError('天气数据暂不可用（上游限流）');
        }
      })
      .catch(() => { if (alive) setError('天气服务暂时不可达'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [city]);

  const applyCity = (raw) => {
    const c = (raw || '').trim();
    if (!c) { setEditing(false); return; }
    saveCity(c);
    setCity(c);
    setEditing(false);
  };

  return (
    <div className="ui-card ui-pad ui-flex-col ui-h-full">
      <div className="ui-card-head">
        <h3 className="ui-card-title">
          <Cloud size={18} /> 天气
        </h3>
        <div className="ui-card-actions weather-city-row">
          {editing ? (
            <input
              autoFocus
              className="ui-input ui-input-sm weather-city-input"
              value={draft}
              placeholder="输入城市后回车"
              aria-label="自定义城市"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyCity(draft);
                if (e.key === 'Escape') setEditing(false);
              }}
              onBlur={() => applyCity(draft)}
            />
          ) : (
            <>
              {PRESET_CITIES.map((c) => (
                <button
                  key={c}
                  onClick={() => applyCity(c)}
                  className={`ui-chip ui-chip-plain weather-city-switch ${c === city ? 'is-active' : ''}`}
                >
                  {c}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="ui-empty ui-empty-inline ui-flex-1">
          <span className="ui-empty-text"><RefreshCw size={13} className="spin" /> 加载天气…</span>
        </div>
      ) : error || !data ? (
        <div className="ui-empty ui-empty-inline ui-flex-1">
          <span className="ui-empty-text">{error || '暂无天气数据'}</span>
        </div>
      ) : (
        <div className="ui-flex-1">
          <div className="weather-row">
            <div className="weather-temp">{data.temperature != null ? `${data.temperature}°` : '--'}</div>
            <div className="weather-main">
              <button
                className="weather-city"
                onClick={() => { setDraft(data.city || city); setEditing(true); }}
                title="点击自定义城市"
              >
                <MapPin size={13} /> {data.city || city} <Pencil size={11} />
              </button>
              <span className="weather-desc">{data.weather || '未知'}</span>
            </div>
          </div>
          <div className="weather-detail">
            <span>风向 <b>{data.wind_direction || '—'}</b></span>
            <span>风力 <b>{data.wind_power || '—'}</b></span>
            <span>湿度 <b>{data.humidity != null ? `${data.humidity}%` : '—'}</b></span>
          </div>
          {data.report_time && (
            <div className="weather-set">更新于 {data.report_time}</div>
          )}
        </div>
      )}
    </div>
  );
}