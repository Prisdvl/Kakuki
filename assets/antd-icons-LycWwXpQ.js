import{g as z,aC as A,u as q,aD as H,aE as I,aF as s,aG as h,aH as F,q as j,aI as y,aJ as o,aA as B,aK as G,aL as Q,aM as J,aN as K,aO as W,aP as V,aQ as X,aR as Y,aS as Z,aT as ee,aU as ne,aV as re,aW as ae,aX as te,aY as oe,aZ as ie,a_ as le,a$ as ce,b0 as ue,b1 as de,b2 as se,b3 as fe,b4 as me,b5 as ve,b6 as Oe,b7 as Ce,b8 as Re,b9 as $e,ba as we,bb as be,bc as Ee,bd as Ie,be as ye,bf as ge,bg as Te,bh as pe,bi as he,bj as Fe,bk as xe,bl as ke,bm as De,bn as Se,bo as Le,bp as Pe,bq as Ne,br as _e,bs as Me,bt as Ue,bu as ze,bv as Ae,bw as qe,bx as He,by as je,bz as Be}from"./vendor-BZ7PoWCt.js";import{r,R as g}from"./react-CxaB__7I.js";var x=r.createContext({});function Ge(a){return a.replace(/-(.)/g,function(e,n){return n.toUpperCase()})}function Qe(a,e){H(a,"[@ant-design/icons] ".concat(e))}function T(a){return I(a)==="object"&&typeof a.name=="string"&&typeof a.theme=="string"&&(I(a.icon)==="object"||typeof a.icon=="function")}function p(){var a=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};return Object.keys(a).reduce(function(e,n){var i=a[n];switch(n){case"class":e.className=i,delete e.class;break;default:delete e[n],e[Ge(n)]=i}return e},{})}function b(a,e,n){return n?g.createElement(a.tag,s(s({key:e},p(a.attrs)),n),(a.children||[]).map(function(i,l){return b(i,"".concat(e,"-").concat(a.tag,"-").concat(l))})):g.createElement(a.tag,s({key:e},p(a.attrs)),(a.children||[]).map(function(i,l){return b(i,"".concat(e,"-").concat(a.tag,"-").concat(l))}))}function k(a){return z(a)[0]}function D(a){return a?Array.isArray(a)?a:[a]:[]}var Je=`
.anticon {
  display: inline-flex;
  align-items: center;
  color: inherit;
  font-style: normal;
  line-height: 0;
  text-align: center;
  text-transform: none;
  vertical-align: -0.125em;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.anticon > * {
  line-height: 1;
}

.anticon svg {
  display: inline-block;
}

.anticon::before {
  display: none;
}

.anticon .anticon-icon {
  display: block;
}

.anticon[tabindex] {
  cursor: pointer;
}

.anticon-spin::before,
.anticon-spin {
  display: inline-block;
  -webkit-animation: loadingCircle 1s infinite linear;
  animation: loadingCircle 1s infinite linear;
}

@-webkit-keyframes loadingCircle {
  100% {
    -webkit-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}

@keyframes loadingCircle {
  100% {
    -webkit-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}
`,Ke=function(e){var n=r.useContext(x),i=n.csp,l=n.prefixCls,d=n.layer,c=Je;l&&(c=c.replace(/anticon/g,l)),d&&(c="@layer ".concat(d,` {
`).concat(c,`
}`)),r.useEffect(function(){var f=e.current,O=A(f);q(c,"@ant-design-icons",{prepend:!d,csp:i,attachTo:O})},[])},We=["icon","className","onClick","style","primaryColor","secondaryColor"],C={primaryColor:"#333",secondaryColor:"#E6E6E6",calculated:!1};function Ve(a){var e=a.primaryColor,n=a.secondaryColor;C.primaryColor=e,C.secondaryColor=n||k(e),C.calculated=!!n}function Xe(){return s({},C)}var v=function(e){var n=e.icon,i=e.className,l=e.onClick,d=e.style,c=e.primaryColor,f=e.secondaryColor,O=h(e,We),R=r.useRef(),m=C;if(c&&(m={primaryColor:c,secondaryColor:f||k(c)}),Ke(R),Qe(T(n),"icon should be icon definiton, but got ".concat(n)),!T(n))return null;var u=n;return u&&typeof u.icon=="function"&&(u=s(s({},u),{},{icon:u.icon(m.primaryColor,m.secondaryColor)})),b(u.icon,"svg-".concat(u.name),s(s({className:i,onClick:l,style:d,"data-icon":u.name,width:"1em",height:"1em",fill:"currentColor","aria-hidden":"true"},O),{},{ref:R}))};v.displayName="IconReact";v.getTwoToneColors=Xe;v.setTwoToneColors=Ve;function S(a){var e=D(a),n=F(e,2),i=n[0],l=n[1];return v.setTwoToneColors({primaryColor:i,secondaryColor:l})}function Ye(){var a=v.getTwoToneColors();return a.calculated?[a.primaryColor,a.secondaryColor]:a.primaryColor}var Ze=["className","icon","spin","rotate","tabIndex","onClick","twoToneColor"];S(B.primary);var t=r.forwardRef(function(a,e){var n=a.className,i=a.icon,l=a.spin,d=a.rotate,c=a.tabIndex,f=a.onClick,O=a.twoToneColor,R=h(a,Ze),m=r.useContext(x),u=m.prefixCls,$=u===void 0?"anticon":u,L=m.rootClassName,P=j(L,$,y(y({},"".concat($,"-").concat(i.name),!!i.name),"".concat($,"-spin"),!!l||i.name==="loading"),n),w=c;w===void 0&&f&&(w=-1);var N=d?{msTransform:"rotate(".concat(d,"deg)"),transform:"rotate(".concat(d,"deg)")}:void 0,_=D(O),E=F(_,2),M=E[0],U=E[1];return r.createElement("span",o({role:"img","aria-label":i.name},R,{ref:e,tabIndex:w,onClick:f,className:P}),r.createElement(v,{icon:i,primaryColor:M,secondaryColor:U,style:N}))});t.displayName="AntdIcon";t.getTwoToneColor=Ye;t.setTwoToneColor=S;var en=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:G}))},ar=r.forwardRef(en),nn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Q}))},tr=r.forwardRef(nn),rn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:J}))},or=r.forwardRef(rn),an=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:K}))},ir=r.forwardRef(an),tn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:W}))},lr=r.forwardRef(tn),on=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:V}))},cr=r.forwardRef(on),ln=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:X}))},ur=r.forwardRef(ln),cn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Y}))},dr=r.forwardRef(cn),un=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Z}))},sr=r.forwardRef(un),dn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:ee}))},fr=r.forwardRef(dn),sn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:ne}))},mr=r.forwardRef(sn),fn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:re}))},vr=r.forwardRef(fn),mn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:ae}))},Or=r.forwardRef(mn),vn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:te}))},Cr=r.forwardRef(vn),On=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:oe}))},Rr=r.forwardRef(On),Cn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:ie}))},$r=r.forwardRef(Cn),Rn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:le}))},wr=r.forwardRef(Rn),$n=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:ce}))},br=r.forwardRef($n),wn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:ue}))},Er=r.forwardRef(wn),bn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:de}))},Ir=r.forwardRef(bn),En=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:se}))},yr=r.forwardRef(En),In=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:fe}))},gr=r.forwardRef(In),yn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:me}))},Tr=r.forwardRef(yn),gn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:ve}))},pr=r.forwardRef(gn),Tn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Oe}))},hr=r.forwardRef(Tn),pn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Ce}))},Fr=r.forwardRef(pn),hn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Re}))},xr=r.forwardRef(hn),Fn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:$e}))},kr=r.forwardRef(Fn),xn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:we}))},Dr=r.forwardRef(xn),kn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:be}))},Sr=r.forwardRef(kn),Dn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Ee}))},Lr=r.forwardRef(Dn),Sn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Ie}))},Pr=r.forwardRef(Sn),Ln=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:ye}))},Nr=r.forwardRef(Ln),Pn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:ge}))},_r=r.forwardRef(Pn),Nn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Te}))},Mr=r.forwardRef(Nn),_n=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:pe}))},Ur=r.forwardRef(_n),Mn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:he}))},zr=r.forwardRef(Mn),Un=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Fe}))},Ar=r.forwardRef(Un),zn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:xe}))},qr=r.forwardRef(zn),An=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:ke}))},Hr=r.forwardRef(An),qn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:De}))},jr=r.forwardRef(qn),Hn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Se}))},Br=r.forwardRef(Hn),jn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Le}))},Gr=r.forwardRef(jn),Bn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Pe}))},Qr=r.forwardRef(Bn),Gn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Ne}))},Jr=r.forwardRef(Gn),Qn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:_e}))},Kr=r.forwardRef(Qn),Jn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Me}))},Wr=r.forwardRef(Jn),Kn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Ue}))},Vr=r.forwardRef(Kn),Wn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:ze}))},Xr=r.forwardRef(Wn),Vn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Ae}))},Yr=r.forwardRef(Vn),Xn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:qe}))},Zr=r.forwardRef(Xn),Yn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:He}))},ea=r.forwardRef(Yn),Zn=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:je}))},na=r.forwardRef(Zn),er=function(e,n){return r.createElement(t,o({},e,{ref:n,icon:Be}))},ra=r.forwardRef(er);export{Pr as $,Ur as A,Mr as B,Nr as C,_r as D,yr as E,Sr as F,Dr as G,ra as H,x as I,Gr as J,Kr as K,qr as L,Jr as M,zr as N,Xr as O,Vr as P,jr as Q,or as R,Rr as S,Hr as T,Wr as U,Zr as V,Qr as W,Yr as X,ea as Y,Br as Z,Ar as _,cr as a,na as a0,ir as b,tr as c,ar as d,lr as e,dr as f,fr as g,sr as h,vr as i,mr as j,ur as k,Or as l,Cr as m,$r as n,wr as o,br as p,Er as q,Ir as r,gr as s,xr as t,kr as u,Fr as v,hr as w,Tr as x,pr as y,Lr as z};
