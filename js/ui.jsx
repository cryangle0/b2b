const { useEffect, useMemo, useState } = React;

function Photo({ src, alt, color, className }) {
  const [ok, setOk] = useState(!!src);
  useEffect(() => { setOk(!!src); }, [src]);
  if (!src || !ok) return <div className={"ph " + (className || "")} style={{ background: color || "#111" }}>{alt || ""}</div>;
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

function Modal({ title, onClose, children, footer, wide }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className={"sheet" + (wide ? " wide" : "")} onClick={(e) => e.stopPropagation()}>
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
    active: "待发货",
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

function accountStatus(s) {
  return ({ active: "已生效", stopped: "停用", pending: "待审" })[s] || statusLabel(s);
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

function downloadUrl(filename, url) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  a.target = "_blank";
  a.click();
}

function readLocalFile(file, cb, kinds) {
  if (!file) return;
  const ok = !kinds || kinds.test(file.type) || kinds.test(file.name);
  if (!ok) {
    Taowo.toast("文件类型不支持", "err");
    return;
  }
  const r = new FileReader();
  r.onload = () => cb(String(r.result), file.type, file.name);
  r.readAsDataURL(file);
}

function dealerName(s, id) {
  if (!id) return "";
  const d = (s.dealers || []).find((x) => x.id === id);
  return d ? d.name : id;
}

function Pager({ page, total, size, onPage }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (size || 1)));
  if (!total) return null;
  return (
    <div className="pager">
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>上一页</button>
      <span>{page} / {pages} · 共 {total} 条</span>
      <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>下一页</button>
    </div>
  );
}

function GoodsLines({ lines, extra }) {
  return (
    <table className="data">
      <thead><tr><th>图</th><th>款号</th><th>名称</th><th>尺码</th><th>数量</th>{extra ? <th>{extra.title}</th> : null}</tr></thead>
      <tbody>
        {(lines || []).map((l, i) => {
          const p = Taowo.product(l.pid);
          return (
            <tr key={i}>
              <td><div className="goods-thumb"><Photo src={productThumb(p)} alt={p?.name} color={p?.color} /></div></td>
              <td>{l.pid}</td>
              <td>{p?.name || ""}</td>
              <td>{l.size}</td>
              <td>{l.qty}</td>
              {extra ? <td>{extra.render(l)}</td> : null}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function ImagePicker({ value, onChange, media }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="img-pick">
      {value ? <img src={value} alt="" /> : <div className="ph">无图</div>}
      <div className="row">
        <label className="btn sm ghost">本地上传
          <input type="file" accept="image/*" hidden onChange={(e) => {
            readLocalFile(e.target.files[0], (url) => onChange(url), /image\/|png|jpe?g|webp|gif/i);
            e.target.value = "";
          }} />
        </label>
        <Btn sm ghost type="button" onClick={() => setOpen(true)}>图片库</Btn>
        {value ? <Btn sm ghost type="button" onClick={() => onChange("")}>清除</Btn> : null}
      </div>
      {open && (
        <Modal wide title="从图片库选择" onClose={() => setOpen(false)}>
          <div className="media-grid">
            {(media || []).map((m) => (
              <button type="button" key={m.id} className="media-cell" onClick={() => { onChange(m.src); setOpen(false); }}>
                <img src={m.src} alt="" />
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function contractPreview(c, s) {
  if (c?.fileUrl) return c.fileUrl;
  const name = dealerName(s || { dealers: [] }, c?.dealerId);
  const html = "<!doctype html><html><head><meta charset='utf-8'><style>body{font-family:Helvetica,Arial,sans-serif;padding:48px;color:#111;line-height:1.6}h1{font-weight:500}</style></head><body><h1>" +
    (c?.title || "合同") + "</h1><p>经销商 " + name + "</p><p>类型 " + (c?.kind || c?.type || "") + " · 季度 " + (c?.quarter || "") +
    "</p><p>本页为演示合同正文。本地上传后可在线预览原件并下载。</p></body></html>";
  return "data:text/html;charset=utf-8," + encodeURIComponent(html);
}

function productThumb(p) {
  return p?.images?.[0] || "";
}

function groupOrderLines(lines) {
  const map = {};
  (lines || []).forEach((l) => {
    if (!map[l.pid]) map[l.pid] = { pid: l.pid, price: l.price, items: [] };
    map[l.pid].items.push(l);
  });
  return Object.values(map);
}

function qtyOfSize(lines, size) {
  const hit = (lines || []).find((l) => l.size === size);
  return hit ? hit.qty : 0;
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
      const s = (p.id + p.name + p.nameZh + (p.brand || "") + (p.ip || "")).toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    return true;
  });
}

function ProductPickModal({ products, dictionaries, value, onConfirm, onClose, title, onlySpot }) {
  const dict = dictionaries || {};
  const [f, setF] = useState({ q: "", brand: "", ip: "", cat: "", sub: "", wave: "" });
  const [sel, setSel] = useState((value || []).slice());
  let rows = (products || []).filter((p) => p.status === "live");
  if (onlySpot) rows = rows.filter((p) => p.type === "spot");
  rows = filterProducts(rows, f);
  const ids = rows.map((r) => r.id);
  const allOn = ids.length > 0 && ids.every((id) => sel.includes(id));
  return (
    <Modal wide title={title || "选择商品"} onClose={onClose} footer={
      <div className="row">
        <Btn ghost sm onClick={onClose}>取消</Btn>
        <Btn sm onClick={() => onConfirm(sel)}>确认 · {sel.length} 款</Btn>
      </div>
    }>
      <div className="row" style={{ flexWrap: "wrap", marginBottom: 12 }}>
        <Field label="模糊搜"><input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="款号 / 名称" /></Field>
        {[["brand", "品牌", dict.brands], ["ip", "IP", dict.ips], ["cat", "大类", dict.cats], ["sub", "小类", dict.subs], ["wave", "波次", dict.waves]].map(([k, n, opts]) => (
          <Field key={k} label={n}>
            <select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
              <option value="">全部</option>
              {(opts || []).map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
        ))}
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        <Btn sm ghost onClick={() => setSel(allOn ? sel.filter((id) => !ids.includes(id)) : Array.from(new Set(sel.concat(ids))))}>{allOn ? "取消全选" : "全选筛选结果"}</Btn>
        <span className="muted">已选 {sel.length} · 当前 {rows.length} 款</span>
      </div>
      <div className="prod-pick" style={{ maxHeight: 360 }}>
        {rows.map((p) => {
          const on = sel.includes(p.id);
          return (
            <label key={p.id}>
              <input type="checkbox" checked={on} onChange={() => setSel(on ? sel.filter((x) => x !== p.id) : sel.concat(p.id))} />
              <Photo src={productThumb(p)} alt="" color={p.color} />
              <span>{p.id}<br />{p.nameZh || p.name}</span>
            </label>
          );
        })}
      </div>
    </Modal>
  );
}

Object.assign(window, {
  Photo, Icon, go, useHash, useStore, Btn, Field, Modal, Empty, Money, statusLabel, accountStatus, Toasts, DataTable, Qty, downloadText, downloadUrl, readLocalFile, dealerName, Pager, GoodsLines, ImagePicker, contractPreview, ProductPickModal, productThumb, filterProducts, groupOrderLines, qtyOfSize,
});
