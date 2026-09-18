const { useEffect, useMemo, useState } = React;

function Photo({ src, alt, color, className }) {
  const [ok, setOk] = useState(!!src);
  if (!ok) return <div className={"ph " + (className || "")} style={{ background: color || "#111" }}>{alt}</div>;
  return <img className={className} src={src} alt={alt || ""} onError={() => setOk(false)} />;
}

function Icon({ name, size = 22 }) {
  const s = { width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "search") return <svg {...s} viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>;
  if (name === "heart") return <svg {...s} viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20z"/></svg>;
  if (name === "bag") return <svg {...s} viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V7a3 3 0 0 1 6 0v1"/></svg>;
  if (name === "user") return <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2"/><path d="M5 19c1.4-3 3.8-4.5 7-4.5S17.6 16 19 19"/></svg>;
  if (name === "home") return <svg {...s} viewBox="0 0 24 24"><path d="M4 11l8-7 8 7v9H4z"/></svg>;
  if (name === "grid") return <svg {...s} viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/></svg>;
  if (name === "menu") return <svg {...s} viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
  return <svg {...s} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>;
}

function go(path) {
  location.hash = path.startsWith("#") ? path : "#" + path;
}

function useHash() {
  const [h, setH] = useState(location.hash || "#/");
  useEffect(() => {
    const on = () => setH(location.hash || "#/");
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const raw = (h.replace(/^#/, "") || "/");
  const [path, qs] = raw.split("?");
  const query = {};
  if (qs) qs.split("&").forEach((p) => { const [k, v] = p.split("="); query[k] = decodeURIComponent(v || ""); });
  const parts = path.split("/").filter(Boolean);
  return { path: "/" + parts.join("/"), parts, query, raw };
}

function useStore() {
  const [s, setS] = useState(Taowo.get());
  useEffect(() => Taowo.on(() => setS({ ...Taowo.get() })), []);
  return s;
}

function Btn({ children, ghost, sm, block, danger, ...rest }) {
  const cls = ["btn", ghost && "ghost", sm && "sm", block && "block", danger && "danger"].filter(Boolean).join(" ");
  return <button className={cls} {...rest}>{children}</button>;
}

function Field({ label, children }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="hrow"><h1 style={{ fontSize: 24 }}>{title}</h1><button className="iconbtn" onClick={onClose}>×</button></div>
        {children}
        {footer && <div style={{ marginTop: 20 }}>{footer}</div>}
      </div>
    </div>
  );
}

function Empty({ title, text, action }) {
  return <div className="empty"><h3>{title}</h3><p>{text}</p>{action && <div style={{ marginTop: 20 }}>{action}</div>}</div>;
}

function Money(n) {
  return "¥" + Number(n || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusLabel(s) {
  return ({
    pending_review: "待审核",
    active: "已生效",
    partial: "部分发货",
    shipped: "已发货",
    rejected: "已驳回",
    paying: "支付中",
    unpaid: "未支付",
    paid: "已支付",
    pending: "待处理",
    processing: "处理中",
    approved: "已通过",
    need_info: "待补资料",
    live: "在售",
    off: "下架",
    in_transit: "运输中",
    stopped: "停用",
  })[s] || s;
}

function Toasts({ list }) {
  if (!list?.length) return null;
  return <div className="toastwrap">{list.map((t) => <div className={"toast " + (t.kind || "")} key={t.id}>{t.text}</div>)}</div>;
}

function DataTable({ columns, rows, onRow }) {
  if (!rows.length) return <Empty title="没有记录" text="换一个筛选条件，或新建一条。" />;
  return (
    <div style={{ overflow: "auto" }}>
      <table className="data">
        <thead><tr>{columns.map((c) => <th key={c.key} style={{ width: c.width }}>{c.title}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i} onClick={() => onRow && onRow(r)} style={{ cursor: onRow ? "pointer" : "default" }}>
              {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Qty({ value, onChange, max }) {
  return (
    <div className="qty">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}>−</button>
      <input value={value} onChange={(e) => onChange(Math.max(0, Math.min(max ?? 9999, Number(e.target.value) || 0)))} />
      <button type="button" onClick={() => onChange(Math.min(max ?? 9999, value + 1))}>+</button>
    </div>
  );
}

function downloadText(filename, text, mime) {
  const blob = new Blob([text], { type: mime || "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function productThumb(p) {
  return p?.images?.[0] || "";
}

function filterProducts(products, { type, fair, q, brand, ip, cat, sub, wave, season, gender }) {
  return products.filter((p) => {
    if (type && p.type !== type) return false;
    if (fair && !p.fair) return false;
    if (brand && p.brand !== brand) return false;
    if (ip && p.ip !== ip) return false;
    if (cat && p.cat !== cat) return false;
    if (sub && p.sub !== sub) return false;
    if (wave && p.wave !== wave) return false;
    if (season && p.season !== season) return false;
    if (gender && p.gender !== gender) return false;
    if (q) {
      const s = (p.id + p.name + p.nameZh).toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });
}

Object.assign(window, {
  Photo, Icon, go, useHash, useStore, Btn, Field, Modal, Empty, Money, statusLabel, Toasts, DataTable, Qty, downloadText, productThumb, filterProducts,
});
