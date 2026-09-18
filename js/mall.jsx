const { useState, useEffect } = React;
const { Icon, Photo, go, Btn, Field, Modal, Empty, Money, statusLabel, DataTable, Qty, downloadText, productThumb, filterProducts } = window;

function MallNav({ s, path }) {
  const count = (s.cart || []).reduce((n, c) => n + c.qty, 0);
  const [q, setQ] = useState("");
  const mobile = typeof window !== "undefined" && window.innerWidth < 960;
  const names = (mobile ? s.cms.h5Nav : s.cms.nav) || s.cms.nav || ["现货", "期货", "订货会"];
  const hrefOf = (name) => (/期货/.test(name) ? "/shop/futures" : /订货/.test(name) ? "/fair" : "/shop/spot");
  return (
    <header className="top">
      <a className="logo" href="#/">TAOVO<span>Order</span></a>
      <nav className="nav">
        {names.map((n) => {
          const href = hrefOf(n);
          return <a key={n} className={path.startsWith(href) || (href === "/fair" && path === "/fair") ? "active" : ""} href={"#" + href}>{n}</a>;
        })}
      </nav>
      <div className="tools">
        <form className="searchbox" onSubmit={(e) => { e.preventDefault(); go("/shop/spot?q=" + encodeURIComponent(q)); }}>
          <Icon name="search" size={18} />
          <input placeholder="款号、名称" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <button className="iconbtn" onClick={() => go("/heart")} title="收藏"><Icon name="heart" /></button>
        <button className="iconbtn" onClick={() => go("/bag")} title="购物袋">
          <Icon name="bag" />
          {count > 0 && <span className="badge">{count}</span>}
        </button>
        <button className="iconbtn" onClick={() => go("/account")} title="账号"><Icon name="user" /></button>
      </div>
    </header>
  );
}

function MallTab({ path }) {
  const map = { "/": "home", "/shop": "shop", "/fair": "fair", "/bag": "bag", "/account": "me" };
  const key = path === "/" ? "home" : path.startsWith("/shop") ? "shop" : path.startsWith("/fair") ? "fair" : path.startsWith("/bag") ? "bag" : "me";
  return (
    <nav className="bottom">
      <a className={key === "home" ? "on" : ""} href="#/"><Icon name="home" size={18} />首页</a>
      <a className={key === "shop" ? "on" : ""} href="#/shop/spot"><Icon name="grid" size={18} />订货</a>
      <a className={key === "fair" ? "on" : ""} href="#/fair"><Icon name="grid" size={18} />专场</a>
      <a className={key === "bag" ? "on" : ""} href="#/bag"><Icon name="bag" size={18} />袋</a>
      <a className={key === "me" ? "on" : ""} href="#/account"><Icon name="user" size={18} />我的</a>
    </nav>
  );
}

function ProductCard({ p }) {
  const expired = Taovo.isExpired(p);
  const can = Taovo.canOrder(p);
  const stock = Object.values(p.stock || {}).reduce((n, v) => n + (Number(v) || 0), 0);
  const label = !can ? (expired ? "不可订购" : "暂不可订") : stock <= 0 ? "缺货" : Money(p.price);
  return (
    <a className="card" href={"#/p/" + p.id}>
      <div className="pic">
        <Photo src={productThumb(p)} alt={p.name} color={p.color} />
        {p.fair && <span className="tag">订货会</span>}
        {expired && <span className="tag">已过期</span>}
        {p.status === "off" && <span className="tag">下架</span>}
        {can && stock <= 0 && <span className="tag">缺货</span>}
      </div>
      <div className="meta">
        <strong>{p.name}</strong>
        <em>{p.nameZh} · {p.wave} 波 · {p.type === "futures" ? "期货" : "现货"}{stock > 0 ? " · 可订 " + stock : ""}</em>
        <b className={can && stock > 0 ? "" : "sold"}>{label}</b>
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
  const spot = s.products.filter((p) => p.type === "spot" && p.status === "live");
  const fair = s.products.filter((p) => p.fair);
  return (
    <div>
      <section className="hero">
        <img src={h.img} alt="" onError={(e) => { e.target.style.display = "none"; }} />
        <div className="copy">
          <h1>{h.title}</h1>
          <p>{h.sub}</p>
          <Btn ghost onClick={() => go(h.href.replace("#", ""))} style={{ background: "#fff", color: "#111" }}>进入</Btn>
        </div>
        <div className="hero-dots">{heroes.map((_, n) => <i key={n} className={n === i ? "on" : ""} />)}</div>
      </section>
      <div className="section wrap">
        <h2>分类</h2>
        <div className="cats">
          {[
            { t: "现货", img: s.images.runner, href: "/shop/spot" },
            { t: "期货", img: s.images.trail, href: "/shop/futures" },
            { t: "订货会", img: s.images.fair, href: "/fair" },
          ].map((c) => (
            <a className="cat" key={c.t} href={"#" + c.href}><Photo src={c.img} alt={c.t} color="#111" /><b>{c.t}</b></a>
          ))}
        </div>
      </div>
      <a className="fairband" href="#/fair">
        <img src={s.images.floor} alt="" />
        <div className="copy">
          <h2>SS26 订货会专场</h2>
          <Btn ghost>现场下单</Btn>
        </div>
      </a>
      <div className="section wrap">
        <h2>现货速发</h2>
        <div className="grid">{spot.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </div>
      <div className="section wrap" style={{ paddingBottom: 80 }}>
        <h2>订货会商品</h2>
        <div className="grid">{fair.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </div>
    </div>
  );
}

function ShopView({ s, type, fair, query }) {
  const dict = s.dictionaries;
  const [f, setF] = useState({
    q: query.q || "",
    brand: "", ip: "", cat: "", sub: "", wave: "", season: "", gender: "",
  });
  const list = filterProducts(s.products, { type, fair, ...f });
  const enabled = dict.filters;
  function toggle(key, val) {
    setF((x) => ({ ...x, [key]: x[key] === val ? "" : val }));
  }
  function exportTpl() {
    const sizes = Array.from(new Set(list.flatMap((p) => p.sizes)));
    const header = ["图片1", "图片2", "款号", "名称", "波次", ...sizes, "合计"].join(",");
    const rows = list.map((p) => [p.images[0], p.images[1] || p.images[0], p.id, p.name, p.wave, ...sizes.map(() => ""), ""].join(","));
    downloadText("订购模板-" + (type || "fair") + ".csv", [header, ...rows].join("\n"), "text/csv");
    Taovo.toast("已导出含图片链接、波次、尺码列的模板");
  }
  return (
    <div className="wrap split">
      <aside className="filters">
        <Field label="款号 / 名称">
          <input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="TW-1001" />
        </Field>
        {enabled.includes("品牌") && <FilterGroup open title="品牌" items={dict.brands} value={f.brand} onChange={(v) => toggle("brand", v)} />}
        {enabled.includes("IP") && <FilterGroup title="IP" items={dict.ips} value={f.ip} onChange={(v) => toggle("ip", v)} />}
        {enabled.includes("大类") && <FilterGroup open title="大类" items={dict.cats} value={f.cat} onChange={(v) => toggle("cat", v)} />}
        {enabled.includes("小类") && <FilterGroup title="小类" items={dict.subs} value={f.sub} onChange={(v) => toggle("sub", v)} />}
        {enabled.includes("波次") && <FilterGroup title="波次" items={dict.waves} value={f.wave} onChange={(v) => toggle("wave", v)} />}
        {enabled.includes("季节") && <FilterGroup title="季节" items={dict.seasons} value={f.season} onChange={(v) => toggle("season", v)} />}
        {enabled.includes("性别") && <FilterGroup title="性别" items={dict.genders} value={f.gender} onChange={(v) => toggle("gender", v)} />}
        <div className="row" style={{ marginTop: 16 }}>
          <Btn sm ghost onClick={exportTpl}>导出订购模板</Btn>
          <Btn sm ghost onClick={() => go("/import")}>导入 Excel</Btn>
        </div>
      </aside>
      <div>
        <div className="hrow">
          <div>
            <h1>{fair ? "订货会" : type === "futures" ? "期货" : "现货"}</h1>
            <p>{list.length} 款 · 库存状态按可订量显示</p>
          </div>
        </div>
        {list.length ? <div className="grid">{list.map((p) => <ProductCard key={p.id} p={p} />)}</div> : <Empty title="没有匹配商品" text="清空筛选，或发起求购。" action={<Btn ghost onClick={() => go("/request")}>求购</Btn>} />}
      </div>
    </div>
  );
}

function FilterGroup({ title, items, value, onChange, open }) {
  return (
    <details open={open}>
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
  const [addr, setAddr] = useState(s.addresses.find((a) => a.def)?.line || s.addresses[0]?.line || "");
  if (!p) return <Empty title="商品不存在" text="返回列表" action={<Btn onClick={() => go("/shop/spot")}>现货</Btn>} />;
  const can = Taovo.canOrder(p);
  const expired = Taovo.isExpired(p);
  const total = Object.values(qty).reduce((n, v) => n + (Number(v) || 0), 0);
  return (
    <div className="pdp">
      <div className="pdp-gallery">
        {p.images.map((src, i) => <Photo key={i} src={src} alt={p.name} color={p.color} />)}
      </div>
      <div className="pdp-buy">
        <div className="eyebrow">{p.brand} · {p.ip} · {p.season} · {p.wave} 波</div>
        <h1>{p.name}</h1>
        <div className="muted">{p.nameZh} · {p.id}</div>
        <div className="price">{Money(p.price)} <span className="muted">建议零售 {Money(p.retail)}</span></div>
        <div className="kvs">
          <i>交期</i><b>{p.lead}</b>
          <i>仓库</i><b>{p.warehouse}</b>
          {p.type === "futures" && <><i>有效期</i><b>{p.validFrom} — {p.validTo}{expired ? "（已过期）" : ""}</b></>}
        </div>
        <hr className="line" />
        <div className="muted" style={{ marginBottom: 8 }}>同一款可同时填写多个尺码</div>
        <div className="sizegrid">
          {p.sizes.map((sz) => {
            const st = p.stock[sz] || 0;
            return (
              <div className={"size " + (st <= 0 ? "off" : "")} key={sz}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><b>{sz}</b><span className="muted">{st ? "可订 " + st : "缺货"}</span></div>
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={!can || st <= 0}
                  value={qty[sz] || ""}
                  placeholder=""
                  onChange={(e) => setQty({ ...qty, [sz]: e.target.value.replace(/[^\d]/g, "") })}
                />
              </div>
            );
          })}
        </div>
        <div className="row">
          <Btn block disabled={!can || !total} onClick={() => Taovo.addToBag(p.id, qty)}>加入购物袋 · {total} 件</Btn>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <Btn ghost block disabled={!can || !total} onClick={() => setBuy(true)}>立即下单</Btn>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <Btn ghost sm onClick={() => Taovo.toggleFav(p.id)}>{s.favorites.includes(p.id) ? "已收藏" : "收藏"}</Btn>
          <Btn ghost sm onClick={() => Taovo.addWish(p.id, p.sizes.find((sz) => (p.stock[sz] || 0) <= 0) || p.sizes[0])}>缺货心愿单</Btn>
          <Btn ghost sm onClick={() => go("/request")}>求购</Btn>
        </div>
        {buy && (
          <Modal title="提交订购单" onClose={() => setBuy(false)} footer={<Btn block onClick={() => {
            const lines = Object.entries(qty).filter(([, v]) => Number(v) > 0).map(([size, qn]) => ({ pid: p.id, size, qty: Number(qn), price: p.price }));
            const o = Taovo.submitOrder({ address: addr, lines, type: p.type, remark: "详情页直接下单" });
            if (o) go("/orders/" + o.id);
          }}>确认提交</Btn>}>
            <Field label="地址"><input value={addr} onChange={(e) => setAddr(e.target.value)} /></Field>
            <p className="muted">{total} 件 · {Money(p.price * total)} · 提交后进入审核</p>
          </Modal>
        )}
        <p style={{ marginTop: 28, color: "#555", lineHeight: 1.6 }}>{p.desc}</p>
      </div>
    </div>
  );
}

function BagView({ s }) {
  const items = s.cart;
  const [addr, setAddr] = useState(s.addresses.find((a) => a.def)?.id || s.addresses[0]?.id);
  const [remark, setRemark] = useState("");
  const selected = items.filter((c) => c.selected !== false);
  const amount = Taovo.lineAmount(selected);
  const promo = Taovo.applyPromo(amount, selected);
  if (!items.length) return <div className="bagpage"><Empty title="购物袋是空的" text="从现货、期货或订货会加入尺码。" action={<Btn onClick={() => go("/shop/spot")}>去订货</Btn>} /></div>;
  return (
    <div className="bagpage">
      <h1 style={{ fontSize: 40, fontWeight: 400, letterSpacing: "-0.04em", marginBottom: 24 }}>袋</h1>
      <div className="row" style={{ marginBottom: 12 }}>
        <Btn sm ghost onClick={() => Taovo.selectAllCart(true)}>全选</Btn>
        <Btn sm ghost onClick={() => Taovo.removeSelectedCart()}>删除所选</Btn>
      </div>
      {items.map((c) => {
        const p = Taovo.product(c.pid);
        return (
          <div key={c.pid + c.size} style={{ display: "grid", gridTemplateColumns: "28px 120px 1fr auto", gap: 16, padding: "18px 0", borderBottom: "1px solid var(--line)", alignItems: "center" }}>
            <input type="checkbox" checked={c.selected !== false} onChange={() => Taovo.toggleSelectCart(c.pid, c.size)} />
            <Photo src={productThumb(p)} alt={p?.name} color={p?.color} />
            <div>
              <strong>{p?.name}</strong>
              <div className="muted">{c.pid} · {c.size} · {p?.type === "futures" ? "期货" : "现货"}</div>
              <div style={{ marginTop: 10 }}><Qty value={c.qty} max={p?.stock[c.size] || c.qty} onChange={(v) => Taovo.setCartQty(c.pid, c.size, v)} /></div>
            </div>
            <div className="right nowrap">
              <div>{Money(c.price * c.qty)}</div>
              <button className="iconbtn nowrap" onClick={() => Taovo.removeCart(c.pid, c.size)}>删除</button>
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
          {selected.some((c) => Taovo.product(c.pid)?.type === "futures") && selected.some((c) => Taovo.product(c.pid)?.type !== "futures") && (
            <p className="muted">现货与期货将拆成两张订购单分别审核。</p>
          )}
          <Btn block onClick={() => {
            const a = s.addresses.find((x) => x.id === addr);
            const o = Taovo.submitOrder({ address: a?.line, remark });
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
        <Btn onClick={() => Taovo.parseImport(text)}>解析</Btn>
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
                  <td><Qty value={r.qty} onChange={(v) => Taovo.setImportQty(i, v)} /></td>
                  <td className="muted">{r.formula || "—"}</td>
                  <td>{Money(r.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Field label="地址"><input value={addr} onChange={(e) => setAddr(e.target.value)} /></Field>
          <Btn onClick={() => {
            const o = Taovo.submitOrder({ address: addr, lines: preview.rows, remark: "Excel 导入" });
            if (o) go("/orders/" + o.id);
          }}>提交审核</Btn>
        </div>
      )}
    </div>
  );
}

function OrdersView({ s, id }) {
  const mine = s.orders.filter((o) => o.dealerId === s.session.dealerId && o.type !== "erp");
  const [tab, setTab] = useState("all");
  if (id) return <OrderDetail s={s} id={id} />;
  const rows = mine.filter((o) => tab === "all" || o.type === tab || (tab === "request" && false));
  return (
    <div className="wrap" style={{ padding: "32px 0 80px" }}>
      <div className="hrow"><div><h1>订单</h1><p>现货、预售、求购、退货与交付进度</p></div></div>
      <div className="tabs">
        {[["all", "全部"], ["spot", "现货"], ["futures", "预售"], ["req", "求购"], ["ret", "退货"]].map(([k, n]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => {
            if (k === "req") return go("/request");
            if (k === "ret") return go("/returns");
            setTab(k);
          }}>{n}</button>
        ))}
      </div>
      <DataTable
        onRow={(r) => go("/orders/" + r.id)}
        columns={[
          { key: "id", title: "单号" },
          { key: "type", title: "类型", render: (r) => r.type === "futures" ? "预售" : "现货" },
          { key: "status", title: "状态", render: (r) => statusLabel(r.status) },
          { key: "ship", title: "已发 / 未发", render: (r) => {
            const a = r.lines.reduce((n, l) => n + (l.shipped || 0), 0);
            const b = r.lines.reduce((n, l) => n + l.qty, 0);
            return a + " / " + (b - a);
          }},
          { key: "created", title: "下单" },
          { key: "amt", title: "金额", render: (r) => Money(Taovo.lineAmount(r.lines)) },
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
    Taovo.toast("已生成 " + (kind === "csv" ? "Excel" : "PDF 打印"));
  }
  return (
    <div className="wrap" style={{ padding: "32px 0 80px", maxWidth: 980 }}>
      <div className="hrow">
        <div>
          <h1>{o.id}</h1>
          <p>{statusLabel(o.status)} · {statusLabel(o.payStatus)} · 已发 {shipped} / 未发 {qty - shipped}</p>
        </div>
        <div className="row">
          <Btn sm ghost onClick={() => dl("csv")}>Excel</Btn>
          <Btn sm ghost onClick={() => dl("pdf")}>PDF</Btn>
          {o.status !== "pending_review" && o.payStatus === "unpaid" && <Btn sm onClick={() => setPay(true)}>支付</Btn>}
          {o.payStatus === "paying" && <span className="muted">渠道回调中</span>}
          {o.status === "pending_review" && <span className="muted">审核通过后可支付</span>}
        </div>
      </div>
      <div className="kvs" style={{ marginBottom: 20 }}>
        <i>地址</i><b>{o.address}</b>
        <i>备注</i><b>{o.remark || "—"}</b>
        <i>合同</i><b>{o.contractId || "尚未关联"}</b>
      </div>
      <table className="data">
        <thead><tr><th>款</th><th>尺码</th><th>数量</th><th>已发</th><th>单价</th></tr></thead>
        <tbody>
          {o.lines.map((l, i) => {
            const p = Taovo.product(l.pid);
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
        <Modal title="支付" onClose={() => setPay(false)} footer={<Btn block onClick={() => { Taovo.payOrder(o.id, channel); setPay(false); }}>确认{channel}</Btn>}>
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
    ["收藏 / 心愿单", "/heart"],
    main ? ["企业管理", "/company"] : null,
    ["合同", "/contracts"],
    ["对账单", "/statements"],
    ["素材库", "/media"],
    ["求购", "/request"],
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
      <Btn sm onClick={() => Taovo.updateProfile(password ? { name, password } : { name })}>保存账号</Btn>
      <div style={{ marginTop: 28 }}>
        {items.map(([n, h]) => <a key={h} href={"#" + h} style={{ display: "block", padding: "18px 0", borderBottom: "1px solid var(--line)", fontSize: 18 }}>{n}</a>)}
      </div>
      <div style={{ marginTop: 28 }}><Btn ghost onClick={() => { Taovo.logout(); go("/login"); }}>退出</Btn></div>
    </div>
  );
}

function HeartView({ s }) {
  const favs = s.favorites.map((id) => s.products.find((p) => p.id === id)).filter(Boolean);
  return (
    <div className="wrap" style={{ padding: "32px 0 80px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 400, marginBottom: 20 }}>收藏</h1>
      <div className="grid">{favs.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      <h2 style={{ fontSize: 24, margin: "40px 0 12px", fontWeight: 400 }}>心愿单</h2>
      {s.wishlist.length ? s.wishlist.map((w, i) => {
        const p = Taovo.product(w.pid);
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
            <div>{p?.name} · {w.size}<div className="muted">{w.note}</div></div>
            <Btn sm ghost onClick={() => go("/p/" + w.pid)}>返回订购</Btn>
          </div>
        );
      }) : <p className="muted">缺货尺码可加入，到货后站内提醒。</p>}
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
    <div className="wrap" style={{ padding: "32px 0 80px", maxWidth: 860 }}>
      <h1 style={{ fontSize: 36, fontWeight: 400 }}>企业</h1>
      <div className="kvs" style={{ margin: "20px 0" }}>
        <i>档案</i><b>{dealer?.name} · {dealer?.erpId}</b>
        <i>认证</i><b>{dealer?.cert}</b>
        <i>等级</i><b>{dealer?.level}</b>
      </div>
      {main ? (
        <>
          <Field label="认证地址 / 资料"><input value={cert} onChange={(e) => setCert(e.target.value)} /></Field>
          <Btn sm onClick={() => Taovo.saveDealer(dealer.id, { address: cert, cert: "已认证" })}>保存企业信息</Btn>
          <h2 style={{ fontSize: 22, margin: "32px 0 12px", fontWeight: 400 }}>子账号</h2>
          <DataTable columns={[{ key: "name", title: "姓名" }, { key: "account", title: "账号" }, { key: "status", title: "状态", render: (r) => statusLabel(r.status) }, { key: "op", title: "", render: (r) => <button onClick={(e) => { e.stopPropagation(); Taovo.toggleUser(r.id); }}>{r.status === "active" ? "停用" : "启用"}</button> }]} rows={subs} />
          <div className="row" style={{ marginTop: 16 }}>
            <Field label="姓名"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="账号"><input value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} /></Field>
          </div>
          <Btn sm onClick={() => Taovo.addSub(form.name, form.account)}>创建子账号</Btn>
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

function RequestView({ s }) {
  const [form, setForm] = useState({ title: "", detail: "" });
  const mine = s.requests.filter((r) => r.dealerId === s.session.dealerId);
  return (
    <div className="wrap" style={{ padding: "32px 0 80px", maxWidth: 800 }}>
      <h1 style={{ fontSize: 36, fontWeight: 400 }}>求购</h1>
      <Field label="缺少或未上架的商品"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
      <Field label="说明"><textarea value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} /></Field>
      <Btn onClick={() => Taovo.addRequest(form)}>提交求购单</Btn>
      <div style={{ marginTop: 32 }}>
        <DataTable columns={[{ key: "id", title: "单号" }, { key: "title", title: "需求" }, { key: "status", title: "状态", render: (r) => statusLabel(r.status) }, { key: "reply", title: "回写" }]} rows={mine} />
      </div>
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
      <Btn onClick={() => Taovo.addReturn({ orderId, reason, lines: o ? [{ pid: o.lines[0].pid, size: o.lines[0].size, qty: 1 }] : [] })}>提交申请</Btn>
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
          Taovo.toast("已开始下载 " + rows.length + " 个文件");
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
      <Btn onClick={() => { Taovo.applyDealer(f); go("/login"); }}>提交申请</Btn>
    </div>
  );
}

function LoginView({ portal }) {
  const [account, setAccount] = useState(portal === "ops" ? "admin" : "dealer");
  const [password, setPassword] = useState("123456");
  const img = window.TAOVO_SEED.images.hero;
  return (
    <div className="login">
      <div className="login-visual">
        <img src={img} alt="" />
        <div className="cap">{portal === "ops" ? "运营工作台" : "为门店订货，而不是为浏览而浏览。"}</div>
      </div>
      <div className="login-form">
        <div className="box">
          <div className="logo" style={{ marginBottom: 32 }}>TAOVO<span>{portal === "ops" ? "Ops" : "Order"}</span></div>
          <Field label="账号"><input value={account} onChange={(e) => setAccount(e.target.value)} /></Field>
          <Field label="密码"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Btn block onClick={() => {
            const r = Taovo.login(account, password, portal);
            if (!r.ok) return Taovo.toast(r.msg, "err");
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

function MallApp({ s, path, parts, query }) {
  if (path === "/login") return <LoginView portal="mall" />;
  if (path === "/ops-login") return <LoginView portal="ops" />;
  if (path === "/apply") return <div><MallNav s={s} path={path} /><ApplyView /></div>;
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
  else if (path === "/request") body = <RequestView s={s} />;
  else if (path === "/returns") body = <ReturnView s={s} />;
  else if (path === "/media") body = <MediaView s={s} />;
  else if (path === "/contracts") body = <SimpleList title="合同" rows={s.contracts.filter((c) => c.dealerId === s.session.dealerId)} columns={[{ key: "id", title: "编号" }, { key: "title", title: "名称" }, { key: "status", title: "状态" }, { key: "from", title: "起" }, { key: "to", title: "止" }, { key: "file", title: "文件", render: (r) => <button onClick={() => Taovo.toast("下载 " + r.file)}>下载</button> }]} />;
  else if (path === "/statements") body = <SimpleList title="对账单" rows={s.statements.filter((c) => c.dealerId === s.session.dealerId)} columns={[{ key: "id", title: "编号" }, { key: "period", title: "账期" }, { key: "amount", title: "应付", render: (r) => Money(r.amount) }, { key: "paid", title: "已付", render: (r) => Money(r.paid) }, { key: "status", title: "状态" }, { key: "op", title: "", render: (r) => r.status === "待经销商核对" ? <button onClick={() => Taovo.confirmStatement(r.id)}>核对无误</button> : "—"}]} />;
  else if (path === "/notices") body = <SimpleList title="提醒" rows={s.notices} columns={[{ key: "title", title: "内容" }, { key: "time", title: "时间" }, { key: "read", title: "状态", render: (r) => r.read ? "已读" : "未读" }, { key: "go", title: "", render: (r) => <span><a href={r.href} onClick={() => Taovo.markNotice(r.id)}>打开</a> · <button onClick={() => Taovo.markNotice(r.id)}>标已读</button></span> }]} />;
  else body = <Empty title="页面不存在" text={path} />;

  return (
    <div>
      {s.notices.some((n) => !n.read) && path === "/" && (
        <div className="notice"><span>{s.notices.find((n) => !n.read).title}</span><a href="#/notices">查看</a></div>
      )}
      <MallNav s={s} path={path} />
      <div className="page">{body}</div>
      <MallTab path={path} />
    </div>
  );
}

Object.assign(window, { MallApp, LoginView });
