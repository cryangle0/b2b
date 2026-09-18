const { useState, useEffect } = React;
const { Icon, Photo, go, Btn, Field, Modal, Empty, Money, statusLabel, accountStatus, DataTable, Qty, downloadText, productThumb, filterProducts } = window;

function MallNav({ s, path }) {
  const count = (s.cart || []).reduce((n, c) => n + c.qty, 0);
  const productMenu = s.cms.productMenu || [
    { label: "现货", href: "#/shop/spot" },
    { label: "期货", href: "#/shop/futures" },
    { label: "订货会", href: "#/fair" },
  ];
  const assetMenu = s.cms.assetMenu || [
    { label: "合同", href: "#/contracts" },
    { label: "对账单", href: "#/statements" },
    { label: "企业资料", href: "#/company" },
  ];
  const productOn = path.startsWith("/shop") || path.startsWith("/fair") || path.startsWith("/p/");
  const orderOn = path.startsWith("/orders");
  const assetOn = ["/contracts", "/statements", "/company"].some((p) => path.startsWith(p));
  return (
    <header className="top">
      <a className="logo" href="#/">TAOWO<span>Order</span></a>
      <nav className="nav">
        <div className={"nav-drop" + (productOn ? " active" : "")}>
          <a href="#/shop/spot" className={productOn ? "active" : ""}>产品</a>
          <div className="drop">
            {productMenu.map((m) => <a key={m.href} href={m.href}>{m.label}</a>)}
          </div>
        </div>
        <a className={orderOn ? "active" : ""} href="#/orders">订单</a>
        <div className={"nav-drop" + (assetOn ? " active" : "")}>
          <a href="#/contracts" className={assetOn ? "active" : ""}>资产</a>
          <div className="drop">
            {assetMenu.map((m) => <a key={m.href} href={m.href}>{m.label}</a>)}
          </div>
        </div>
      </nav>
      <div className="tools">
        <button className="iconbtn" onClick={() => go("/heart")} title="心愿单"><Icon name="heart" /></button>
        <button className="iconbtn" onClick={() => go("/bag")} title="购物袋">
          <Icon name="bag" />
          {count > 0 && <span className="badge">{count}</span>}
        </button>
        <button className="who" onClick={() => go("/account")} title="账号">
          <Icon name="user" size={18} />
          <span>{s.session ? s.session.name : "登录"}</span>
        </button>
      </div>
    </header>
  );
}

function MallTab({ path }) {
  const key = path === "/" ? "home" : path.startsWith("/shop") || path.startsWith("/fair") || path.startsWith("/p/") ? "shop" : path.startsWith("/orders") ? "orders" : path.startsWith("/bag") ? "bag" : "me";
  return (
    <nav className="bottom">
      <a className={key === "home" ? "on" : ""} href="#/"><Icon name="home" size={18} />首页</a>
      <a className={key === "shop" ? "on" : ""} href="#/shop/spot"><Icon name="grid" size={18} />产品</a>
      <a className={key === "orders" ? "on" : ""} href="#/orders"><Icon name="grid" size={18} />订单</a>
      <a className={key === "bag" ? "on" : ""} href="#/bag"><Icon name="bag" size={18} />袋</a>
      <a className={key === "me" ? "on" : ""} href="#/account"><Icon name="user" size={18} />我的</a>
    </nav>
  );
}

function productTitle(p) {
  const g = p.gender === "中性" ? "中性" : p.gender + "款";
  return [p.ip, p.brand, g, p.nameZh, p.name].filter(Boolean).join(" ") + (p.colorName ? " - " + p.colorName : "");
}

function Stars({ rating, reviews }) {
  const r = Number(rating || 0);
  const full = Math.round(r);
  return (
    <div className="stars">
      <span aria-hidden="true">{"★★★★★".slice(0, full)}{"☆☆☆☆☆".slice(0, 5 - full)}</span>
      <b>{r.toFixed(1)}</b>
      {reviews ? <em>({reviews})</em> : null}
    </div>
  );
}

function ProductCard({ p, s }) {
  const expired = Taowo.isExpired(p);
  const can = Taowo.canOrder(p);
  const stock = Object.values(p.stock || {}).reduce((n, v) => n + (Number(v) || 0), 0);
  const label = !can ? (expired ? "不可订购" : "暂不可订") : stock <= 0 ? "缺货" : Money(p.price);
  const flag = expired ? "已过期" : p.status === "off" ? "下架" : !can ? "暂不可订" : stock <= 0 ? "缺货" : p.badge || (p.fair ? "订货会" : "");
  const fav = s && s.favorites && s.favorites.includes(p.id);
  return (
    <a className="pcard" href={"#/p/" + p.id}>
      <div className="pcard-pic" style={{ background: p.color || "#e8e8e8" }}>
        <Photo src={productThumb(p)} alt={p.name} color={p.color} />
        {s && (
          <button className={"pcard-heart" + (fav ? " on" : "")} title="收藏" onClick={(e) => { e.preventDefault(); Taowo.toggleFav(p.id); }}>
            <Icon name="heart" size={18} />
          </button>
        )}
      </div>
      <div className="pcard-body">
        <b className={can && stock > 0 ? "pcard-price" : "pcard-price sold"}>{label}</b>
        <span className="pcard-meta">品牌 {p.brand}</span>
        <span className="pcard-meta">IP {p.ip}</span>
        <span className="pcard-meta">大类 {p.cat} · 小类 {p.sub}</span>
        <span className="pcard-meta">波次 {p.wave} · 款号 {p.id}</span>
        {flag ? <span className="pcard-flag">{flag}</span> : null}
      </div>
    </a>
  );
}

function HomeView({ s }) {
  const [i, setI] = useState(0);
  const heroes = s.cms.hero;
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % heroes.length), 5000);
    return () => clearInterval(t);
  }, [heroes.length]);
  const h = heroes[i];
  return (
    <div>
      <div className="home-cats wrap">
        <b>分类</b>
        <nav>
          {(s.cms.categoryNav || [
            { label: "产品", href: "#/shop/spot" },
            { label: "订单", href: "#/orders" },
            { label: "资产", href: "#/contracts" },
          ]).map((c) => {
            const product = c.label === "产品" || /shop|product/i.test(c.href || "");
            if (!product) return <a key={c.label} href={c.href}>{c.label}</a>;
            return (
              <div className="nav-drop" key={c.label}>
                <a href={c.href || "#/shop/spot"}>产品</a>
                <div className="drop">
                  {(s.cms.productMenu || [
                    { label: "现货", href: "#/shop/spot" },
                    { label: "期货", href: "#/shop/futures" },
                    { label: "订货会", href: "#/fair" },
                  ]).map((m) => <a key={m.href} href={m.href}>{m.label}</a>)}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
      <section className="hero">
        <img src={h.img} alt="" onError={(e) => { e.target.style.display = "none"; }} />
        <div className="copy">
          <h1>{h.title}</h1>
          <p>{h.sub}</p>
          <Btn ghost onClick={() => go(h.href.replace("#", ""))} style={{ background: "#fff", color: "#111" }}>进入</Btn>
        </div>
        <div className="hero-dots">{heroes.map((_, n) => <i key={n} className={n === i ? "on" : ""} />)}</div>
      </section>
      <a className="fairband" href={s.cms.banner?.href || "#/fair"}>
        <img src={s.cms.banner?.img || s.images.floor} alt="" />
        <div className="copy">
          <h2>{s.cms.banner?.title || "SS26 订货会专场"}</h2>
          <Btn ghost>{s.cms.banner?.sub || "现场下单"}</Btn>
        </div>
      </a>
      {(s.cms.floors || []).map((floor) => {
        const list = filterProducts(s.products, floor.query || { type: "spot" }).filter((p) => p.status === "live").slice(0, 6);
        return (
          <div className="section wrap" key={floor.id} style={{ paddingBottom: 40 }}>
            <h2>{floor.title}</h2>
            <div className="plp-grid">{list.map((p) => <ProductCard key={p.id} p={p} s={s} />)}</div>
          </div>
        );
      })}
    </div>
  );
}

function ShopView({ s, type, fair, query }) {
  const dict = s.dictionaries;
  const [f, setF] = useState({
    q: query.q || "",
    brand: "", ip: "", cat: "", sub: "", wave: "", season: "", gender: "",
  });
  const [sort, setSort] = useState("hot");
  let list = filterProducts(s.products, { type, fair, ...f });
  if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
  if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
  if (sort === "idlow") list = [...list].sort((a, b) => a.id.localeCompare(b.id));
  if (sort === "idhigh") list = [...list].sort((a, b) => b.id.localeCompare(a.id));
  if (sort === "new") list = [...list].sort((a, b) => (b.badge === "新品") - (a.badge === "新品"));
  const enabled = dict.filters;
  const title = fair ? "订货会" : type === "futures" ? "期货" : "现货";
  const chips = [
    f.brand && ["brand", f.brand],
    f.ip && ["ip", f.ip],
    f.cat && ["cat", f.cat],
    f.sub && ["sub", f.sub],
    f.wave && ["wave", f.wave],
    f.season && ["season", f.season],
    f.gender && ["gender", f.gender],
  ].filter(Boolean);
  function toggle(key, val) {
    setF((x) => ({ ...x, [key]: x[key] === val ? "" : val }));
  }
  function exportTpl() {
    const sizes = Array.from(new Set(list.flatMap((p) => p.sizes)));
    const header = ["图片1", "图片2", "款号", "名称", "波次", ...sizes, "合计"].join(",");
    const rows = list.map((p) => [p.images[0], p.images[1] || p.images[0], p.id, p.name, p.wave, ...sizes.map(() => ""), ""].join(","));
    downloadText("订购表模板-" + (type || "fair") + ".csv", [header, ...rows].join("\n"), "text/csv");
    Taowo.toast("已下载订购表模板，填写数量后上传即可写入购物袋");
  }
  function onUpload(file) {
    if (!file) return;
    if (/\.xlsx?$/i.test(file.name)) {
      Taowo.toast("请另存为 CSV 后上传。浏览器读不了 xlsx。", "err");
      return;
    }
    const r = new FileReader();
    r.onload = () => Taowo.importOrderSheetToCart(String(r.result));
    r.readAsText(file);
  }
  return (
    <div className="plp wrap">
      <aside className="plp-side">
        {chips.length > 0 && (
          <div className="plp-sel">
            <h3>已选</h3>
            <div className="sel-chips">
              {chips.map(([k, v]) => (
                <button key={k} onClick={() => toggle(k, v)}>{v} ×</button>
              ))}
            </div>
          </div>
        )}
        {enabled.includes("品牌") && <FilterGroup open title="品牌" items={dict.brands} value={f.brand} onChange={(v) => toggle("brand", v)} />}
        {enabled.includes("IP") && <FilterGroup open title="系列" items={dict.ips} value={f.ip} onChange={(v) => toggle("ip", v)} />}
        {enabled.includes("大类") && <FilterGroup open title="大类" items={dict.cats} value={f.cat} onChange={(v) => toggle("cat", v)} />}
        {enabled.includes("小类") && <FilterGroup title="小类" items={dict.subs} value={f.sub} onChange={(v) => toggle("sub", v)} />}
        {enabled.includes("波次") && <FilterGroup title="波次" items={dict.waves} value={f.wave} onChange={(v) => toggle("wave", v)} />}
        {enabled.includes("季节") && <FilterGroup title="季节" items={dict.seasons} value={f.season} onChange={(v) => toggle("season", v)} />}
        {enabled.includes("性别") && <FilterGroup title="性别" items={dict.genders} value={f.gender} onChange={(v) => toggle("gender", v)} />}
      </aside>
      <div className="plp-main">
        <div className="plp-head">
          <h1>{title}</h1>
          <label className="btn sm">上传订购表
            <input type="file" accept=".csv,.txt" hidden onChange={(e) => onUpload(e.target.files[0])} />
          </label>
        </div>
        <div className="plp-toolbar">
          <input className="plp-search" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="模糊搜索款号 / 名称 / 品牌" />
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="hot">默认</option>
            <option value="low">价格升序</option>
            <option value="high">价格降序</option>
            <option value="idlow">款号升序</option>
            <option value="idhigh">款号降序</option>
            <option value="new">新品</option>
          </select>
          <Btn sm ghost onClick={exportTpl}>下载订购表</Btn>
          <span className="plp-countbox">{list.length} 款</span>
        </div>
        {list.length ? <div className="plp-grid">{list.map((p) => <ProductCard key={p.id} p={p} s={s} />)}</div> : <Empty title="没有匹配商品" text="清空筛选或换一个关键词。" />}
      </div>
    </div>
  );
}

function FilterGroup({ title, items, value, onChange, open }) {
  return (
    <details className="plp-filter" open={open}>
      <summary><h3>{title}</h3></summary>
      {items.map((it) => (
        <label key={it}><input type="checkbox" checked={value === it} onChange={() => onChange(it)} />{it}</label>
      ))}
    </details>
  );
}

function PdpView({ s, id }) {
  const p = s.products.find((x) => x.id === id);
  const [qty, setQty] = useState({});
  const [img, setImg] = useState(0);
  const [buy, setBuy] = useState(false);
  const [open, setOpen] = useState("desc");
  const [addr, setAddr] = useState(s.addresses.find((a) => a.def)?.line || s.addresses[0]?.line || "");
  if (!p) return <Empty title="商品不存在" text="返回列表" action={<Btn onClick={() => go("/shop/spot")}>现货</Btn>} />;
  const can = Taowo.canOrder(p);
  const expired = Taowo.isExpired(p);
  const bag = {};
  const wish = {};
  p.sizes.forEach((sz) => {
    const n = Number(qty[sz] || 0);
    if (!n) return;
    const st = p.stock[sz] || 0;
    if (st > 0) bag[sz] = Math.min(n, st);
    if (st <= 0) wish[sz] = n;
    else if (n > st) wish[sz] = n - st;
  });
  const bagQty = Object.values(bag).reduce((n, v) => n + v, 0);
  const wishQty = Object.values(wish).reduce((n, v) => n + v, 0);
  function commit() {
    if (bagQty) Taowo.addToBag(p.id, bag);
    Object.entries(wish).forEach(([sz, n]) => Taowo.addWish(p.id, sz, n));
    if (!bagQty && !wishQty) Taowo.toast("请在尺码矩阵填写数量", "err");
  }
  return (
    <div className="pdp-page wrap">
      <div className="crumb">
        <a href="#/shop/spot">产品</a> / <a href={"#/shop/" + (p.type === "futures" ? "futures" : "spot")}>{p.cat}</a> / {p.id}
      </div>
      <div className="pdp">
        <div className="pdp-media stacked">
          <div className="pdp-hero" style={{ background: p.color || "#e8e8e8" }}>
            <Photo src={p.images[img] || p.images[0]} alt={p.name} color={p.color} />
          </div>
          <div className="pdp-thumbs below">
            {p.images.map((src, i) => (
              <button key={i} className={img === i ? "on" : ""} onClick={() => setImg(i)}>
                <Photo src={src} alt="" color={p.color} />
              </button>
            ))}
          </div>
        </div>
        <div className="pdp-buy">
          <h1>{productTitle(p)}</h1>
          <div className="muted">品牌 {p.brand} · IP {p.ip} · {p.cat}/{p.sub} · 波次 {p.wave} · {p.id}</div>
          <div className="stockline">{can ? "有货 — " + p.lead : (expired ? "期货已过期，不可订购" : "当前不可订购")}</div>
          <div className="your-price"><span>经销价</span> {Money(p.price)}</div>
          <div className="muted">建议零售 {Money(p.retail)} · {p.warehouse}</div>
          <div className="size-head"><span>尺码矩阵</span><button className="linkish" onClick={() => Taowo.toast("鞋码 36–45 · 服装 XS–XXL")}>尺码表</button></div>
          <p className="muted">有货尺码写入购物袋；缺货尺码写入心愿单。</p>
          <div className="sizegrid">
            {p.sizes.map((sz) => {
              const st = p.stock[sz] || 0;
              return (
                <div className={"size " + (st <= 0 ? "off" : "")} key={sz}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><b>{sz}</b><span className="muted">{st ? "可订 " + st : "缺货"}</span></div>
                  <input
                    type="text"
                    inputMode="numeric"
                    disabled={st > 0 && (!can || expired)}
                    value={qty[sz] || ""}
                    onChange={(e) => setQty({ ...qty, [sz]: e.target.value.replace(/[^\d]/g, "") })}
                  />
                </div>
              );
            })}
          </div>
          <Btn block disabled={!bagQty && !wishQty} onClick={commit}>
            {bagQty ? "加入购物袋 · " + bagQty + " 件" : ""}{bagQty && wishQty ? "，" : ""}{wishQty ? "心愿单 · " + wishQty + " 件" : ""}{!bagQty && !wishQty ? "填写数量" : ""}
          </Btn>
          <div style={{ marginTop: 10 }}>
            <Btn ghost block disabled={!bagQty} onClick={() => setBuy(true)}>立即下单有货尺码</Btn>
          </div>
          <div className="pdp-assures">授权货盘 · 审核后发货 · 缺货进心愿单</div>
          <div className="row" style={{ marginTop: 12 }}>
            <Btn ghost sm onClick={() => Taowo.toggleFav(p.id)}>{s.favorites.includes(p.id) ? "已收藏" : "收藏"}</Btn>
          </div>
          {buy && (
            <Modal title="提交订购单" onClose={() => setBuy(false)} footer={<Btn block onClick={() => {
              const lines = Object.entries(bag).map(([sz, qn]) => ({ pid: p.id, size: sz, qty: Number(qn), price: p.price }));
              const o = Taowo.submitOrder({ address: addr, lines, type: p.type, remark: "详情页直接下单" });
              if (o) go("/orders/" + o.id);
            }}>确认提交</Btn>}>
              <Field label="地址"><input value={addr} onChange={(e) => setAddr(e.target.value)} /></Field>
              <p className="muted">{bagQty} 件 · {Money(p.price * bagQty)} · 提交后进入审核</p>
            </Modal>
          )}
          <div className="acc">
            <button className={open === "desc" ? "on" : ""} onClick={() => setOpen(open === "desc" ? "" : "desc")}>描述</button>
            {open === "desc" && <p>{p.desc}</p>}
            <button className={open === "detail" ? "on" : ""} onClick={() => setOpen(open === "detail" ? "" : "detail")}>细节</button>
            {open === "detail" && (
              <ul>
                <li>款号 {p.id}</li>
                <li>品牌 {p.brand}</li>
                <li>系列 {p.ip} · {p.series}</li>
                <li>季节 {p.season} · 波次 {p.wave}</li>
                {p.type === "futures" && <li>有效期 {p.validFrom} — {p.validTo}{expired ? "（已过期）" : ""}</li>}
              </ul>
            )}
            <button className={open === "ship" ? "on" : ""} onClick={() => setOpen(open === "ship" ? "" : "ship")}>交期</button>
            {open === "ship" && <p>{p.lead}，仓库 {p.warehouse}。现货与期货将拆单审核。</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function BagView({ s }) {
  const items = s.cart;
  const [addr, setAddr] = useState(s.addresses.find((a) => a.def)?.id || s.addresses[0]?.id);
  const [remark, setRemark] = useState("");
  const selected = items.filter((c) => c.selected !== false);
  const amount = Taowo.lineAmount(selected);
  const promo = Taowo.applyPromo(amount, selected);
  if (!items.length) return <div className="bagpage"><Empty title="购物袋是空的" text="从现货、期货或订货会加入尺码。" action={<Btn onClick={() => go("/shop/spot")}>去订货</Btn>} /></div>;
  return (
    <div className="bagpage">
      <h1 style={{ fontSize: 40, fontWeight: 400, letterSpacing: "-0.04em", marginBottom: 24 }}>袋</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <Btn sm ghost onClick={() => Taowo.selectAllCart(true)}>全选</Btn>
        <Btn sm ghost onClick={() => Taowo.removeSelectedCart()}>删除所选</Btn>
      </div>
      {items.map((c) => {
        const p = Taowo.product(c.pid);
        return (
          <div key={c.pid + c.size} style={{ display: "grid", gridTemplateColumns: "28px 120px 1fr auto", gap: 16, padding: "18px 0", borderBottom: "1px solid var(--line)", alignItems: "center" }}>
            <input type="checkbox" checked={c.selected !== false} onChange={() => Taowo.toggleSelectCart(c.pid, c.size)} />
            <Photo src={productThumb(p)} alt={p?.name} color={p?.color} />
            <div>
              <strong>{p?.name}</strong>
              <div className="muted">SKU {c.pid}-{c.size} · {p?.type === "futures" ? "期货" : "现货"}</div>
              <div style={{ marginTop: 10 }}><Qty value={c.qty} max={Math.max(p?.stock[c.size] || 0, c.qty)} onChange={(v) => Taowo.setCartQty(c.pid, c.size, v)} /></div>
            </div>
            <div className="right" style={{ minWidth: 88 }}>
              <div>{Money(c.price * c.qty)}</div>
              <button className="linkish" onClick={() => Taowo.removeCart(c.pid, c.size)}>删除</button>
            </div>
          </div>
        );
      })}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 40, marginTop: 32 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 12 }}>送货地址</h2>
          {s.addresses.map((a) => (
            <label key={a.id} style={{ display: "block", padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
              <input type="radio" checked={addr === a.id} onChange={() => setAddr(a.id)} /> {a.name} {a.phone}<div className="muted">{a.line}</div>
            </label>
          ))}
          <Field label="备注"><input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="选填" /></Field>
        </div>
        <div>
          <div className="kvs">
            <i>合计</i><b>{Money(amount)}</b>
            <i>优惠</i><b>−{Money(promo.off)}</b>
            <i>应付</i><b>{Money(promo.pay)}</b>
          </div>
          <div className="muted" style={{ margin: "8px 0 16px" }}>{promo.label.join(" · ") || "无活动"}</div>
          {selected.some((c) => Taowo.product(c.pid)?.type === "futures") && selected.some((c) => Taowo.product(c.pid)?.type !== "futures") && (
            <p className="muted">现货与期货将拆成两张订购单分别审核。</p>
          )}
          <Btn block onClick={() => {
            const a = s.addresses.find((x) => x.id === addr);
            const o = Taowo.submitOrder({ address: a?.line, remark });
            if (o) go("/orders/" + o.id);
          }}>提交订购单</Btn>
          <p className="muted" style={{ marginTop: 10 }}>提交后需品牌方审核，审核通过再生效。</p>
        </div>
      </div>
    </div>
  );
}

function ImportView({ s }) {
  const [text, setText] = useState("款号,36,37,38,39,40,41,42,43,44,45\nTW-1001,0,0,0,0,2,=1+1,4,2,0,0\nTW-2001,0,0,0,0,0,3,5,2,0,0");
  const [addr, setAddr] = useState(s.addresses[0]?.line || "");
  const preview = s.importPreview;
  return (
    <div className="wrap" style={{ padding: "40px 0 80px", maxWidth: 980 }}>
      <h1 style={{ fontSize: 36, fontWeight: 400, letterSpacing: "-0.03em" }}>导入订购单</h1>
      <p className="muted" style={{ margin: "8px 0 24px" }}>允许数量与 Excel 公式。导入后先看明细，再改数量、填地址、提交。</p>
      <Field label="CSV / 从 Excel 复制">
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <input type="file" accept=".csv,.txt" onChange={(e) => {
        const f = e.target.files[0];
        if (!f) return;
        const r = new FileReader();
        r.onload = () => setText(String(r.result));
        r.readAsText(f);
      }} />
      <div className="row" style={{ margin: "16px 0" }}>
        <Btn onClick={() => Taowo.parseImport(text)}>解析</Btn>
        <Btn ghost onClick={() => go("/shop/spot")}>先导出模板</Btn>
      </div>
      {preview && (
        <div>
          {preview.errors.length > 0 && <div className="toast" style={{ position: "static", marginBottom: 12, background: "#ba0c2f" }}>{preview.errors.join("；")}</div>}
          <table className="data">
            <thead><tr><th>款号</th><th>尺码</th><th>数量</th><th>公式</th><th>单价</th></tr></thead>
            <tbody>
              {preview.rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.pid}</td><td>{r.size}</td>
                  <td><Qty value={r.qty} onChange={(v) => Taowo.setImportQty(i, v)} /></td>
                  <td className="muted">{r.formula || "—"}</td>
                  <td>{Money(r.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Field label="地址"><input value={addr} onChange={(e) => setAddr(e.target.value)} /></Field>
          <Btn onClick={() => {
            const o = Taowo.submitOrder({ address: addr, lines: preview.rows, remark: "Excel 导入" });
            if (o) go("/orders/" + o.id);
          }}>提交审核</Btn>
        </div>
      )}
    </div>
  );
}

function downloadOrderCsv(orders, name) {
  const header = "单号,类型,状态,款号,尺码,数量,已发,单价,金额,下单时间";
  const body = orders.flatMap((o) => o.lines.map((l) => [o.id, o.type === "futures" ? "期货" : "现货", statusLabel(o.status), l.pid, l.size, l.qty, l.shipped || 0, l.price, l.qty * l.price, o.created].join(",")));
  downloadText(name, [header, ...body].join("\n"), "text/csv");
}

function OrdersView({ s, id }) {
  const mine = s.orders.filter((o) => o.dealerId === s.session.dealerId && o.type !== "erp");
  const [tab, setTab] = useState("all");
  if (id) return <OrderDetail s={s} id={id} />;
  const rows = mine.filter((o) => tab === "all" || o.type === tab);
  return (
    <div className="wrap" style={{ padding: "32px 0 80px" }}>
      <div className="hrow"><div><h1>订单</h1><p>个人订购单，可按单或全部下载</p></div>
        <Btn sm ghost onClick={() => downloadOrderCsv(mine, "我的订购单.csv")}>下载全部订购单</Btn>
      </div>
      <div className="tabs">
        {[["all", "全部"], ["spot", "现货"], ["futures", "期货"], ["ret", "退货"]].map(([k, n]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => {
            if (k === "ret") return go("/returns");
            setTab(k);
          }}>{n}</button>
        ))}
      </div>
      <DataTable
        onRow={(r) => go("/orders/" + r.id)}
        columns={[
          { key: "id", title: "单号" },
          { key: "type", title: "类型", render: (r) => r.type === "futures" ? "期货" : "现货" },
          { key: "status", title: "状态", render: (r) => statusLabel(r.status) },
          { key: "ship", title: "已发 / 未发", render: (r) => {
            const a = r.lines.reduce((n, l) => n + (l.shipped || 0), 0);
            const b = r.lines.reduce((n, l) => n + l.qty, 0);
            return a + " / " + (b - a);
          }},
          { key: "created", title: "下单" },
          { key: "amt", title: "金额", render: (r) => Money(Taowo.lineAmount(r.lines)) },
          { key: "dl", title: "", render: (r) => <button className="linkish" onClick={(e) => { e.stopPropagation(); downloadOrderCsv([r], r.id + ".csv"); }}>下载</button> },
        ]}
        rows={rows}
      />
    </div>
  );
}

function OrderDetail({ s, id }) {
  const o = s.orders.find((x) => x.id === id);
  const [pay, setPay] = useState(false);
  const [channel, setChannel] = useState("微信支付");
  if (!o) return <Empty title="订单不存在" />;
  const shipped = o.lines.reduce((n, l) => n + (l.shipped || 0), 0);
  const qty = o.lines.reduce((n, l) => n + l.qty, 0);
  const ships = s.shipments.filter((x) => x.orderId === o.id);
  function dl(kind) {
    const lines = o.lines.map((l) => [o.id, l.pid, l.size, l.qty, l.shipped || 0, l.price].join(",")).join("\n");
    if (kind === "csv") downloadText(o.id + ".csv", "单号,款号,尺码,数量,已发,单价\n" + lines, "text/csv");
    else window.print();
    Taowo.toast("已生成 " + (kind === "csv" ? "Excel" : "PDF 打印"));
  }
  return (
    <div className="wrap" style={{ padding: "32px 0 80px", maxWidth: 980 }}>
      <div className="hrow">
        <div>
          <h1>{o.id}</h1>
          <p>{statusLabel(o.status)} · {statusLabel(o.payStatus)} · 已发 {shipped} / 未发 {qty - shipped}</p>
        </div>
        <div className="row">
          <Btn sm ghost onClick={() => downloadOrderCsv([o], o.id + ".csv")}>下载订购单</Btn>
          <Btn sm ghost onClick={() => dl("pdf")}>PDF</Btn>
          {o.status === "rejected" && <Btn sm onClick={() => go("/bag")}>回购物袋改后再提</Btn>}
          {o.status !== "pending_review" && o.status !== "rejected" && o.payStatus === "unpaid" && <Btn sm onClick={() => setPay(true)}>支付</Btn>}
          {o.payStatus === "paying" && <span className="muted">渠道回调中</span>}
          {o.status === "pending_review" && <span className="muted">审核通过后可支付</span>}
        </div>
      </div>
      {o.status === "rejected" && (
        <p className="muted" style={{ marginBottom: 16 }}>审核已驳回，明细已退回购物袋。改数量后可重新提交。</p>
      )}
      <div className="kvs" style={{ marginBottom: 20 }}>
        <i>地址</i><b>{o.address}</b>
        <i>备注</i><b>{o.remark || "—"}</b>
        <i>合同</i><b>{o.contractId || "尚未关联"}</b>
      </div>
      <table className="data">
        <thead><tr><th>款</th><th>尺码</th><th>数量</th><th>已发</th><th>单价</th></tr></thead>
        <tbody>
          {o.lines.map((l, i) => {
            const p = Taowo.product(l.pid);
            return <tr key={i}><td>{p?.name} {l.pid}</td><td>{l.size}</td><td>{l.qty}</td><td>{l.shipped || 0}</td><td>{Money(l.price)}</td></tr>;
          })}
        </tbody>
      </table>
      <h2 style={{ margin: "28px 0 12px", fontSize: 20, fontWeight: 500 }}>发货与物流</h2>
      {ships.length ? ships.map((sh) => (
        <div key={sh.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
          <b>{sh.id}</b> · {sh.date} · {sh.express} {sh.tracking}
          <div className="muted">发货日期 {sh.date}</div>
          <div style={{ marginTop: 8 }}>
            {(s.tracks[sh.tracking] || []).map((t, i) => <div key={i} className="muted">{t.t} {t.e}</div>)}
          </div>
        </div>
      )) : <p className="muted">尚未发货</p>}
      <h2 style={{ margin: "28px 0 12px", fontSize: 20, fontWeight: 500 }}>轨迹</h2>
      {o.history.map((h, i) => <div key={i} className="muted">{h.t} · {h.e}</div>)}
      {pay && (
        <Modal title="支付" onClose={() => setPay(false)} footer={<Btn block onClick={() => { Taowo.payOrder(o.id, channel); setPay(false); }}>确认{channel}</Btn>}>
          <div className="chips">
            {(window.innerWidth < 960 ? ["微信支付"] : ["微信支付", "支付宝", "对公转账"]).map((m) => <button className={"chip " + (channel === m ? "on" : "")} key={m} onClick={() => setChannel(m)}>{m}</button>)}
          </div>
          <p className="muted" style={{ marginTop: 12 }}>{window.innerWidth < 960 ? "移动端仅微信支付。" : channel === "对公转账" ? "生成付款识别码，财务认领后回写流水。" : "扫码后渠道回调验签，更新支付与订单状态。"}</p>
          <div style={{ height: 180, marginTop: 16, background: "#f5f5f5", display: "grid", placeItems: "center" }}>{channel} 模拟收款</div>
        </Modal>
      )}
    </div>
  );
}

function AccountView({ s }) {
  const unread = s.notices.filter((n) => !n.read).length;
  const main = s.session.role === "dealer_main";
  const [name, setName] = useState(s.session.name);
  const [password, setPassword] = useState("");
  const items = [
    ["订单中心", "/orders"],
    ["心愿单", "/heart"],
    main ? ["企业管理", "/company"] : null,
    ["合同", "/contracts"],
    ["对账单", "/statements"],
    ["素材库", "/media"],
    ["退货", "/returns"],
    ["导入订购单", "/import"],
    unread ? ["提醒 " + unread, "/notices"] : ["提醒", "/notices"],
  ].filter(Boolean);
  return (
    <div className="wrap" style={{ padding: "40px 0 80px", maxWidth: 720 }}>
      <h1 style={{ fontSize: 36, fontWeight: 400 }}>{s.session.name}</h1>
      <p className="muted">{s.session.org} · {s.session.account}</p>
      <Field label="显示名"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="修改密码"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="留空则不改" /></Field>
      <Btn sm onClick={() => Taowo.updateProfile(password ? { name, password } : { name })}>保存账号</Btn>
      <div style={{ marginTop: 28 }}>
        {items.map(([n, h]) => <a key={h} href={"#" + h} style={{ display: "block", padding: "18px 0", borderBottom: "1px solid var(--line)", fontSize: 18 }}>{n}</a>)}
      </div>
      <div style={{ marginTop: 28 }}><Btn ghost onClick={() => { Taowo.logout(); go("/login"); }}>退出</Btn></div>
    </div>
  );
}

function HeartView({ s }) {
  const favs = s.favorites.map((id) => s.products.find((p) => p.id === id)).filter(Boolean);
  const wishes = (s.wishlist || []).filter((w) => !w.dealerId || w.dealerId === s.session.dealerId);
  return (
    <div className="wrap" style={{ padding: "32px 0 80px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 400, marginBottom: 20 }}>心愿单</h1>
      {wishes.length ? wishes.map((w, i) => {
        const p = Taowo.product(w.pid);
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
            <div>{p?.name} · {w.size} × {w.qty || 1}<div className="muted">{w.note}</div></div>
            <Btn sm ghost onClick={() => go("/p/" + w.pid)}>返回订购</Btn>
          </div>
        );
      }) : <p className="muted">缺货尺码可加入，到货后站内提醒。</p>}
      <h2 style={{ fontSize: 24, margin: "40px 0 12px", fontWeight: 400 }}>收藏</h2>
      <div className="plp-grid">{favs.map((p) => <ProductCard key={p.id} p={p} s={s} />)}</div>
    </div>
  );
}

function CompanyView({ s }) {
  const dealer = s.dealers.find((d) => d.id === s.session.dealerId);
  const subs = s.users.filter((u) => u.dealerId === s.session.dealerId && u.role === "dealer_sub");
  const [form, setForm] = useState({ name: "", account: "" });
  const main = s.session.role === "dealer_main";
  const [cert, setCert] = useState(dealer?.address || "");
  return (
    <div className="wrap" style={{ padding: "40px 0 80px", maxWidth: 860 }}>
      <h1 style={{ fontSize: 36, fontWeight: 400 }}>企业</h1>
      <div className="kvs" style={{ margin: "28px 0 32px" }}>
        <i>档案</i><b>{dealer?.name} · {dealer?.erpId}</b>
        <i>认证</i><b>{dealer?.cert}</b>
        <i>等级</i><b>{dealer?.level}</b>
      </div>
      {main ? (
        <>
          <Field label="认证地址 / 资料"><input value={cert} onChange={(e) => setCert(e.target.value)} /></Field>
          <Btn sm onClick={() => Taowo.saveDealer(dealer.id, { address: cert, cert: "已认证" })}>保存企业信息</Btn>
          <section className="section-block">
            <h2>子账号</h2>
            <DataTable columns={[{ key: "name", title: "姓名" }, { key: "account", title: "账号" }, { key: "status", title: "状态", render: (r) => accountStatus(r.status) }, { key: "op", title: "", render: (r) => <button onClick={(e) => { e.stopPropagation(); Taowo.toggleUser(r.id); }}>{r.status === "active" ? "停用" : "启用"}</button> }]} rows={subs} />
            <div className="form-grid">
              <Field label="姓名"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="账号"><input value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} /></Field>
              <Btn sm onClick={() => Taowo.addSub(form.name, form.account)}>创建子账号</Btn>
            </div>
          </section>
        </>
      ) : <p className="muted">子账号不能管理企业。</p>}
    </div>
  );
}

function SimpleList({ title, rows, columns }) {
  return (
    <div className="wrap" style={{ padding: "32px 0 80px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 400, marginBottom: 20 }}>{title}</h1>
      <DataTable columns={columns} rows={rows} />
    </div>
  );
}

function ReturnView({ s }) {
  const mine = s.orders.filter((o) => o.dealerId === s.session.dealerId && ["active", "partial", "shipped"].includes(o.status));
  const [orderId, setOrderId] = useState(mine[0]?.id || "");
  const [reason, setReason] = useState("尺码不适合");
  const list = s.returns.filter((r) => r.dealerId === s.session.dealerId);
  const o = s.orders.find((x) => x.id === orderId);
  return (
    <div className="wrap" style={{ padding: "32px 0 80px", maxWidth: 860 }}>
      <h1 style={{ fontSize: 36, fontWeight: 400 }}>退货</h1>
      <Field label="原订单">
        <select value={orderId} onChange={(e) => setOrderId(e.target.value)}>{mine.map((x) => <option key={x.id}>{x.id}</option>)}</select>
      </Field>
      <Field label="原因"><input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <Btn onClick={() => Taowo.addReturn({ orderId, reason, lines: o ? [{ pid: o.lines[0].pid, size: o.lines[0].size, qty: 1 }] : [] })}>提交申请</Btn>
      <div style={{ marginTop: 28 }}>
        <DataTable columns={[{ key: "id", title: "退货单" }, { key: "orderId", title: "订单" }, { key: "reason", title: "原因" }, { key: "status", title: "状态", render: (r) => statusLabel(r.status) }]} rows={list} />
      </div>
    </div>
  );
}

function MediaView({ s }) {
  const [year, setYear] = useState("");
  const [pid, setPid] = useState("");
  const rows = s.media.filter((m) => (!year || String(m.year) === year) && (!pid || m.pid.includes(pid)));
  return (
    <div className="wrap" style={{ padding: "32px 0 80px" }}>
      <div className="hrow">
        <div><h1>素材库</h1><p>按款号、年份筛选图片与视频，用于经销商自建详情页</p></div>
        <Btn sm ghost onClick={() => {
          rows.forEach((m) => {
            const a = document.createElement("a");
            a.href = m.src;
            a.download = m.name;
            a.target = "_blank";
            a.click();
          });
          Taowo.toast("已开始下载 " + rows.length + " 个文件");
        }}>批量下载</Btn>
      </div>
      <div className="row">
        <Field label="款号"><input value={pid} onChange={(e) => setPid(e.target.value)} placeholder="TW-1001" /></Field>
        <Field label="年份"><input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" /></Field>
      </div>
      <div className="grid">
        {rows.map((m) => (
          <article className="card" key={m.id}>
            <div className="pic"><img src={m.src} alt="" /></div>
            <div className="meta"><strong>{m.name}</strong><em>{m.pid} · {m.kind} · {m.year}</em></div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ApplyView() {
  const [f, setF] = useState({ company: "", city: "", contact: "", phone: "", license: "", note: "" });
  return (
    <div className="wrap" style={{ padding: "48px 0 80px", maxWidth: 560 }}>
      <h1 style={{ fontSize: 36, fontWeight: 400 }}>入驻</h1>
      <p className="muted" style={{ margin: "8px 0 24px" }}>提交企业资料，平台审核通过后建立经销商档案与账号。</p>
      {["company", "city", "contact", "phone", "license", "note"].map((k) => (
        <Field key={k} label={{ company: "企业名称", city: "城市", contact: "联系人", phone: "手机", license: "信用代码", note: "说明" }[k]}>
          <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        </Field>
      ))}
      <Btn onClick={() => { Taowo.applyDealer(f); go("/login"); }}>提交申请</Btn>
    </div>
  );
}

function LoginView({ portal }) {
  const [account, setAccount] = useState(portal === "ops" ? "admin" : "dealer");
  const [password, setPassword] = useState("123456");
  const img = window.TAOWO_SEED.images.hero;
  useEffect(() => {
    document.documentElement.classList.add("lock");
    document.body.classList.add("lock");
    return () => {
      document.documentElement.classList.remove("lock");
      document.body.classList.remove("lock");
    };
  }, []);
  return (
    <div className="login">
      <div className="login-visual">
        <img src={img} alt="" />
        <div className="cap">{portal === "ops" ? "运营工作台" : "为门店订货，而不是为浏览而浏览。"}</div>
      </div>
      <div className="login-form">
        <div className="box">
          <div className="logo" style={{ marginBottom: 32 }}>TAOWO<span>{portal === "ops" ? "Ops" : "Order"}</span></div>
          <Field label="账号"><input value={account} onChange={(e) => setAccount(e.target.value)} /></Field>
          <Field label="密码"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Btn block onClick={() => {
            const r = Taowo.login(account, password, portal);
            if (!r.ok) return Taowo.toast(r.msg, "err");
            go(portal === "ops" ? "/ops" : "/");
          }}>{portal === "ops" ? "进入后台" : "进入订货台"}</Btn>
          <div className="accounts">
            {portal === "ops" ? (
              <div>
                运营 <button onClick={() => setAccount("admin")}>admin</button> · 审核 <button onClick={() => setAccount("brand")}>brand</button> · 商品 <button onClick={() => setAccount("ops")}>ops</button>
                <div>密码 123456 · <a href="#/login">经销商登录</a></div>
              </div>
            ) : (
              <div>
                主账号 <button onClick={() => setAccount("dealer")}>dealer</button> · 子账号 <button onClick={() => setAccount("sub")}>sub</button>
                <div>密码 123456 · <a href="#/apply">申请入驻</a> · <a href="#/ops-login">运营后台</a></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MallChrome({ s, path, notice, children }) {
  return (
    <div className={"mall-shell" + (notice ? " has-notice" : "")}>
      <div className="chrome">
        {notice}
        <MallNav s={s} path={path} />
      </div>
      {children}
    </div>
  );
}

function MallApp({ s, path, parts, query }) {
  if (path === "/login") return <LoginView portal="mall" />;
  if (path === "/ops-login") return <LoginView portal="ops" />;
  if (path === "/apply") {
    return (
      <MallChrome s={s} path={path}>
        <div className="page"><ApplyView /></div>
      </MallChrome>
    );
  }
  if (!s.session || !String(s.session.role).startsWith("dealer")) {
    return <LoginView portal="mall" />;
  }
  let body = null;
  if (path === "/") body = <HomeView s={s} />;
  else if (path === "/fair") body = <ShopView s={s} fair query={query} />;
  else if (path.startsWith("/shop/futures")) body = <ShopView s={s} type="futures" query={query} />;
  else if (path.startsWith("/shop")) body = <ShopView s={s} type="spot" query={query} />;
  else if (parts[0] === "p") body = <PdpView s={s} id={parts[1]} />;
  else if (path === "/bag") body = <BagView s={s} />;
  else if (path === "/import") body = <ImportView s={s} />;
  else if (parts[0] === "orders") body = <OrdersView s={s} id={parts[1]} />;
  else if (path === "/account") body = <AccountView s={s} />;
  else if (path === "/heart") body = <HeartView s={s} />;
  else if (path === "/company") body = <CompanyView s={s} />;
  else if (path === "/request") body = <HeartView s={s} />;
  else if (path === "/returns") body = <ReturnView s={s} />;
  else if (path === "/media") body = <MediaView s={s} />;
  else if (path === "/contracts") body = <SimpleList title="合同" rows={s.contracts.filter((c) => c.dealerId === s.session.dealerId)} columns={[{ key: "id", title: "编号" }, { key: "title", title: "名称" }, { key: "status", title: "状态" }, { key: "from", title: "起" }, { key: "to", title: "止" }, { key: "file", title: "文件", render: (r) => <button onClick={() => Taowo.toast("下载 " + r.file)}>下载</button> }]} />;
  else if (path === "/statements") body = <SimpleList title="对账单" rows={s.statements.filter((c) => c.dealerId === s.session.dealerId)} columns={[{ key: "id", title: "编号" }, { key: "period", title: "账期" }, { key: "amount", title: "应付", render: (r) => Money(r.amount) }, { key: "paid", title: "已付", render: (r) => Money(r.paid) }, { key: "status", title: "状态" }, { key: "op", title: "", render: (r) => r.status === "待经销商核对" ? <button onClick={() => Taowo.confirmStatement(r.id)}>核对无误</button> : "—"}]} />;
  else if (path === "/notices") body = <SimpleList title="提醒" rows={s.notices} columns={[{ key: "title", title: "内容" }, { key: "time", title: "时间" }, { key: "read", title: "状态", render: (r) => r.read ? "已读" : "未读" }, { key: "go", title: "", render: (r) => <span><a href={r.href} onClick={() => Taowo.markNotice(r.id)}>打开</a> · <button onClick={() => Taowo.markNotice(r.id)}>标已读</button></span> }]} />;
  else body = <Empty title="页面不存在" text={path} />;

  const notice = s.notices.some((n) => !n.read) && path === "/" ? (
    <div className="notice"><span>{s.notices.find((n) => !n.read).title}</span><a href="#/notices">查看</a></div>
  ) : null;

  return (
    <MallChrome s={s} path={path} notice={notice}>
      <div className="page">{body}</div>
      <MallTab path={path} />
    </MallChrome>
  );
}

Object.assign(window, { MallApp, LoginView });
