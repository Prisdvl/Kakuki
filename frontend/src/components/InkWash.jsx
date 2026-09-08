// 水墨写意背景：远山剪影 + 墨晕 + 飞白笔触，随深浅模式切换墨色
export default function InkWash() {
  return (
    <div className="ink-wash" aria-hidden="true">
      <svg
        className="ink-svg"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        focusable="false"
      >
        <defs>
          <linearGradient id="inkFar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.14" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="inkMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="inkNear" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.26" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="inkDot1" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="inkDot2" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.14" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </radialGradient>
          <filter id="inkSoft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        {/* 远中近三层山峦剪影 */}
        <g className="ink-mountains">
          <path
            d="M0,620 C180,520 320,600 480,530 C640,460 780,560 940,500 C1100,440 1260,540 1440,470 L1440,900 L0,900 Z"
            fill="url(#inkFar)"
          />
          <path
            d="M0,720 C220,640 420,700 640,620 C860,540 1080,640 1300,580 C1370,560 1410,570 1440,560 L1440,900 L0,900 Z"
            fill="url(#inkMid)"
          />
          <path
            d="M0,810 C180,750 380,800 600,750 C820,700 1020,770 1240,720 C1320,700 1390,710 1440,700 L1440,900 L0,900 Z"
            fill="url(#inkNear)"
          />
        </g>

        {/* 墨晕：留白处的淡墨团 */}
        <g className="ink-blots" filter="url(#inkSoft)">
          <circle cx="170" cy="250" r="130" fill="url(#inkDot1)" />
          <circle cx="1290" cy="330" r="150" fill="url(#inkDot2)" />
          <circle cx="1040" cy="120" r="70" fill="url(#inkDot1)" />
          <circle cx="360" cy="140" r="56" fill="url(#inkDot2)" />
        </g>

        {/* 飞白笔触 */}
        <g className="ink-brush" fill="none" stroke="currentColor" strokeLinecap="round">
          <path d="M-30,140 C180,70 480,190 820,110 C1040,50 1260,140 1480,70" strokeOpacity="0.09" strokeWidth="2.5" />
          <path d="M40,300 C300,230 640,340 980,260 C1160,220 1320,250 1440,210" strokeOpacity="0.06" strokeWidth="1.5" />
          <path d="M820,520 C940,490 1060,500 1180,470" strokeOpacity="0.05" strokeWidth="1.2" />
        </g>
      </svg>
    </div>
  );
}
