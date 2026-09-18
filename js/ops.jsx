const { useState } = React;
const { Icon, go, Btn, Field, Modal, Empty, Money, statusLabel, DataTable, downloadText, LoginView } = window;

function opsAllowed(role, href) {
  if (role === "ops_admin") return true;
  if (role === "brand_reviewer") return ["/ops", "/ops/review", "/ops/reports", "/ops/logs", "/ops/erp-orders", "/ops/pay"].includes(href);
  if (role === "ops_merch") return ["/ops", "/ops/cms", "/ops/home", "/ops/master", "/ops/products", "/ops/stock", "/ops/images", "/ops/batch", "/ops/media", "/ops/logs", "/ops/dict"].includes(href);
  return true;
}

function OpsNav({ path, role }) {
  const groups = [
    ["工作台", [["/ops", "今日"], ["/ops/logs", "日志"]]],
    ["装修", [["/ops/cms", "PC / H5 装修"], ["/ops/home", "首页与专场"]]],
    ["经销商", [["/ops/dealers", "档案 / ERP"], ["/ops/apply", "入驻审核"], ["/ops/accounts", "账号绑定"]]],
    ["商品", [["/ops/master", "主数据"], ["/ops/products", "现货 / 期货"], ["/ops/stock", "仓库库存"], ["/ops/images", "图片导入"], ["/ops/batch", "可订状态"], ["/ops/media", "素材库"]]],
    ["订货履约", [["/ops/review", "订购单审核"], ["/ops/erp-orders", "ERP 原单"], ["/ops/ship", "发货交付"], ["/ops/requests", "求购"], ["/ops/returns", "退货"]]],
    ["财务", [["/ops/pay", "支付流水"], ["/ops/contracts", "合同"], ["/ops/statements", "对账单"]]],
    ["经营", [["/ops/campaigns", "营销活动"], ["/ops/reports", "订购分布"]]],
    ["开放", [["/ops/api", "接口与同步"]]],
    ["系统", [["/ops/org", "组织用户"], ["/ops/roles", "角色权限"], ["/ops/dict", "基础字典"]]],
  ];
  return (
    <aside className="side">
      <a className="logo" href="#/ops">TAOWO<span>Ops</span></a>
      {groups.map(([g, items]) => {
        const vis = items.filter(([h]) => opsAllowed(role, h));
        if (!vis.length) return null;
        return (
          <div key={g}>
            <div className="g">{g}</div>
            {vis.map(([h, n]) => <a key={h} className={path === h ? "active" : ""} href={"#" + h}>{n}</a>)}
          </div>
        );
      })}
      <div style={{ margin: "28px 12px" }}>
        <a href="#/ops-login" onClick={() => Taowo.logout()}>退出</a>
      </div>
    </aside>
  );
}

function OpsToday({ s }) {
  const pending = s.orders.filter((o) => o.status === "pending_review");
  const apps = s.applications.filter((a) => a.status === "pending");
  const rets = s.returns.filter((r) => r.status === "pending");
  return (
    <div>
      <div className="hrow"><div><h1>今日</h1><p>{s.session.name} · {s.session.org}</p></div><Btn sm ghost onClick={() => Taowo.reset()}>重置演示</Btn></div>
      <div className="statrow">
        <div className="stat"><b>{pending.length}</b><span>待审核订购单</span></div>
        <div className="stat"><b>{apps.length}</b><span>入驻申请</span></div>
        <div className="stat"><b>{s.products.filter((p) => p.status === "live").length}</b><span>在售商品</span></div>
        <div className="stat"><b>{rets.length}</b><span>待审退货</span></div>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 12 }}>待审核</h2>
      <DataTable onRow={(r) => go("/ops/review")} columns={[{ key: "id", title: "单号" }, { key: "dealerId", title: "经销商" }, { key: "created", title: "提交" }, { key: "amt", title: "金额", render: (r) => Money(Taowo.lineAmount(r.lines)) }]} rows={pending} />
    </div>
  );
}

function CmsView({ s }) {
  const [nav, setNav] = useState(s.cms.nav.join(" / "));
  const [title, setTitle] = useState(s.cms.hero[0].title);
  const [sub, setSub] = useState(s.cms.hero[0].sub);
  const [device, setDevice] = useState("PC");
  return (
    <div>
      <div className="hrow"><div><h1>装修 · {device}</h1><p>PC 与 H5 共用模块，可分别预览后发布</p></div>
        <div className="row">
          <Btn sm ghost onClick={() => {
            const next = device === "PC" ? "H5" : "PC";
            setDevice(next);
            setNav(((next === "H5" ? s.cms.h5Nav : s.cms.nav) || s.cms.nav).join(" / "));
          }}>切到 {device === "PC" ? "H5" : "PC"}</Btn>
          <Btn sm ghost onClick={() => go("/")}>预览商城</Btn>
          <Btn sm onClick={() => {
            const hero = s.cms.hero.slice();
            hero[0] = { ...hero[0], title, sub };
            const parts = nav.split(/[\/,，]/).map((x) => x.trim()).filter(Boolean);
            Taowo.saveCms(device === "H5" ? { h5Nav: parts, hero } : { nav: parts, hero });
          }}>发布</Btn>
        </div>
      </div>
      <Field label={device + " 导航"}><input value={nav} onChange={(e) => setNav(e.target.value)} /></Field>
      <Field label="首屏标题"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
      <Field label="首屏说明"><input value={sub} onChange={(e) => setSub(e.target.value)} /></Field>
      <p className="muted">PC / H5 导航可分别发布；商城顶栏读取生效配置。H5 为响应式，订货会现场可用手机下单。</p>
    </div>
  );
}

function DealersView({ s }) {
  const [q, setQ] = useState("");
  const rows = s.dealers.filter((d) => !q || (d.name + d.id + d.erpId).includes(q));
  return (
    <div>
      <div className="hrow"><div><h1>经销商档案</h1><p>同步 ERP 档案，查询企业资料与状态</p></div>
        <Btn sm onClick={() => Taowo.runSync("ERP 经销商档案")}>从 ERP 同步</Btn>
      </div>
      <Field label="查询"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="名称 / 档案号 / ERP" /></Field>
      <DataTable columns={[
        { key: "id", title: "档案" }, { key: "name", title: "企业" }, { key: "city", title: "城市" },
        { key: "level", title: "等级" }, { key: "status", title: "状态" }, { key: "erpId", title: "ERP" }, { key: "synced", title: "同步" },
      ]} rows={rows} />
    </div>
  );
}

function ApplyOps({ s }) {
  const [note, setNote] = useState("");
  return (
    <div>
      <div className="hrow"><div><h1>入驻审核</h1><p>准入、驳回或要求补充资料</p></div></div>
      {s.applications.map((a) => (
        <div key={a.id} style={{ padding: "18px 0", borderBottom: "1px solid var(--line)" }}>
          <b>{a.company}</b> · {a.city} · {a.contact} {a.phone}
          <div className="muted">{a.id} · {statusLabel(a.status)} · {a.time}</div>
          <p>{a.note}</p>
          {a.status === "pending" || a.status === "need_info" ? (
            <div className="row" style={{ marginTop: 8 }}>
              <Btn sm onClick={() => Taowo.reviewApply(a.id, "approved")}>准入</Btn>
              <Btn sm ghost onClick={() => Taowo.reviewApply(a.id, "need_info", note || "请补充资料")}>补资料</Btn>
              <Btn sm danger onClick={() => Taowo.reviewApply(a.id, "rejected", note)}>驳回</Btn>
              <input placeholder="审核意见" value={note} onChange={(e) => setNote(e.target.value)} style={{ border: 0, borderBottom: "1px solid #111", minWidth: 200 }} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function AccountsOps({ s }) {
  const [dealerId, setDealerId] = useState(s.dealers[0]?.id);
  const [account, setAccount] = useState("");
  const [name, setName] = useState("");
  const [tab, setTab] = useState("main");
  const users = s.users.filter((u) => u.dealerId && (tab === "main" ? u.role === "dealer_main" : u.role === "dealer_sub"));
  return (
    <div>
      <div className="hrow"><div><h1>经销商账号</h1><p>主账号绑定档案；平台也可查看并创建企业子账号</p></div></div>
      <div className="tabs">
        <button className={tab === "main" ? "on" : ""} onClick={() => setTab("main")}>主账号</button>
        <button className={tab === "sub" ? "on" : ""} onClick={() => setTab("sub")}>子账号</button>
      </div>
      <DataTable columns={[{ key: "account", title: "账号" }, { key: "name", title: "姓名" }, { key: "role", title: "角色" }, { key: "dealerId", title: "档案" }, { key: "status", title: "状态", render: (r) => statusLabel(r.status) }, { key: "op", title: "", render: (r) => <button onClick={() => Taowo.resetPassword(r.id)}>重置密码</button> }]} rows={users} />
      <div className="row" style={{ marginTop: 20, alignItems: "end" }}>
        <Field label="档案">
          <select value={dealerId} onChange={(e) => setDealerId(e.target.value)}>{s.dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        </Field>
        <Field label="姓名"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="账号"><input value={account} onChange={(e) => setAccount(e.target.value)} /></Field>
        <Btn sm onClick={() => tab === "sub" ? Taowo.bindSub(dealerId, name, account) : Taowo.bindAccount(dealerId, account, name)}>{tab === "sub" ? "创建子账号" : "创建并绑定"}</Btn>
      </div>
    </div>
  );
}

function MasterView({ s }) {
  const dict = s.dictionaries;
  const keys = [["brands", "品牌"], ["ips", "IP"], ["cats", "大类"], ["subs", "小类"], ["series", "系列"], ["seasons", "季节"], ["genders", "性别"], ["waves", "波次"], ["leads", "交期"], ["specs", "规格"]];
  return (
    <div>
      <div className="hrow"><div><h1>商品主数据</h1><p>品牌、属性、规格、分类、系列、交期、季节、性别、波次</p></div></div>
      {keys.map(([k, n]) => (
        <Field key={k} label={n}>
          <input defaultValue={(dict[k] || []).join("、")} onBlur={(e) => Taowo.saveDict(k, e.target.value.split(/[、,，]/).map((x) => x.trim()).filter(Boolean))} />
        </Field>
      ))}
    </div>
  );
}

function ProductsOps({ s }) {
  const [tab, setTab] = useState("spot");
  const [edit, setEdit] = useState(null);
  const [csv, setCsv] = useState("款号,名称,年份,季节,品牌,大类,小类,性别,波次,价格,交期,期货有效期\nTW-1003,Studio Fleece,2026,FW26,Studio,服装,上衣,中性,02,248,期货 45 天,2026-12-31");
  const [validTo, setValidTo] = useState("2026-12-31");
  const [fromId, setFromId] = useState(s.products.find((p) => p.type === "spot")?.id || "");
  const rows = s.products.filter((p) => p.type === (tab === "futures" ? "futures" : "spot"));
  return (
    <div>
      <div className="hrow">
        <div><h1>商品</h1><p>现货同步 / Excel 导入；期货必须落在已有现货范围内，配置交期与有效期</p></div>
        <div className="row">
          <Btn sm ghost onClick={() => Taowo.runSync("ERP 现货商品")}>ERP 同步</Btn>
          <Btn sm ghost onClick={() => {
            const header = "款号,名称,年份,季节,品牌,大类,小类,性别,波次,价格,交期,期货有效期";
            const rows = s.products.map((p) => [p.id, p.name, p.year, p.season, p.brand, p.cat, p.sub, p.gender, p.wave, p.price, p.lead, p.validTo || ""].join(","));
            downloadText("商品导入模板.csv", [header, ...rows].join("\n"), "text/csv");
          }}>导出模板</Btn>
        </div>
      </div>
      <details style={{ marginBottom: 16 }}>
        <summary>Excel / CSV 批量导入（含款号、年份、季节、品牌、大类、小类、性别、波次、价格、交期、期货有效期）</summary>
        <Field label="粘贴或上传">
          <textarea value={csv} onChange={(e) => setCsv(e.target.value)} />
        </Field>
        <input type="file" accept=".csv,.txt" onChange={(e) => {
          const f = e.target.files[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => setCsv(String(r.result));
          r.readAsText(f);
        }} />
        <Btn sm onClick={() => Taowo.importProducts(csv)}>导入商品</Btn>
        <div className="row" style={{ marginTop: 12, alignItems: "end" }}>
          <Field label="从现货创建预售">
            <select value={fromId} onChange={(e) => setFromId(e.target.value)}>{s.products.filter((p) => p.type === "spot").map((p) => <option key={p.id} value={p.id}>{p.id} {p.name}</option>)}</select>
          </Field>
          <Field label="有效期至"><input value={validTo} onChange={(e) => setValidTo(e.target.value)} /></Field>
          <Btn sm onClick={() => Taowo.createFuturesFromSpot(fromId, validTo, "期货 45 天")}>生成预售</Btn>
        </div>
      </details>
      <div className="tabs">
        <button className={tab === "spot" ? "on" : ""} onClick={() => setTab("spot")}>现货</button>
        <button className={tab === "futures" ? "on" : ""} onClick={() => setTab("futures")}>预售 / 期货</button>
      </div>
      <DataTable onRow={(r) => setEdit(r)} columns={[
        { key: "id", title: "款号" }, { key: "name", title: "名称" }, { key: "wave", title: "波次" },
        { key: "price", title: "批发价", render: (r) => Money(r.price) },
        { key: "status", title: "状态", render: (r) => (r.orderable && r.status === "live" ? (Taowo.isExpired(r) ? "过期禁购" : "可订") : "不可订") },
        { key: "validTo", title: "有效期", render: (r) => r.validTo || "—" },
      ]} rows={rows} />
      {edit && (
        <Modal title={edit.id} onClose={() => setEdit(null)} footer={<Btn onClick={() => { Taowo.upsertProduct(edit); setEdit(null); }}>保存</Btn>}>
          <Field label="名称"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <Field label="批发价"><input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></Field>
          {edit.type === "futures" && (
            <>
              <Field label="有效期至"><input value={edit.validTo || ""} onChange={(e) => setEdit({ ...edit, validTo: e.target.value })} /></Field>
              <Field label="交期"><input value={edit.lead} onChange={(e) => setEdit({ ...edit, lead: e.target.value })} /></Field>
              <p className="muted">预售商品必须从已同步现货中选取。过期后前台不可加购、不可下单。</p>
            </>
          )}
          <div className="row">
            <Btn sm ghost onClick={() => setEdit({ ...edit, status: "live", orderable: true })}>上架</Btn>
            <Btn sm ghost onClick={() => setEdit({ ...edit, status: "off" })}>下架</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StockOps({ s }) {
  const [text, setText] = useState("TW-1001,42,30\nTW-1005,M,12");
  return (
    <div>
      <div className="hrow"><div><h1>仓库与可订量</h1><p>按款号 + 尺码批量导入，并预留 ERP 周期同步</p></div>
        <Btn sm ghost onClick={() => Taowo.runSync("可订量")}>同步库存</Btn>
      </div>
      <DataTable columns={[{ key: "id", title: "仓库" }, { key: "name", title: "名称" }, { key: "city", title: "城市" }, { key: "skus", title: "SKU" }, { key: "sync", title: "频率" }]} rows={s.warehouses} />
      <Field label="导入 款号,尺码,可订量">
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <Btn sm onClick={() => {
        const rows = text.trim().split(/\n/).map((l) => {
          const [pid, size, qty] = l.split(",");
          return { pid, size, qty };
        });
        Taowo.importStock(rows);
      }}>写入可订量</Btn>
    </div>
  );
}

function ImageOps({ s }) {
  const [result, setResult] = useState([]);
  return (
    <div>
      <div className="hrow"><div><h1>图片匹配</h1><p>批量选择或 ZIP，按文件名自动匹配款号，需含主图 + 细节图</p></div></div>
      <input type="file" multiple accept=".jpg,.jpeg,.png,.zip,image/*" onChange={(e) => {
        const raw = Array.from(e.target.files || []);
        const files = raw.flatMap((f) => {
          if (/\.zip$/i.test(f.name)) {
            Taowo.toast("已解析 ZIP，按命名规则展开主图/细节图");
            return [{ name: "TW-1002_main.jpg" }, { name: "TW-1002_d01.jpg" }];
          }
          return [{ name: f.name, url: URL.createObjectURL(f) }];
        });
        setResult(Taowo.matchImages(files.length ? files : [{ name: "TW-1002_main.jpg" }, { name: "TW-1002_d01.jpg" }, { name: "unknown.png" }]));
      }} />
      <div className="row" style={{ margin: "12px 0" }}>
        <Btn sm ghost onClick={() => setResult(Taowo.matchImages([{ name: "TW-1002_main.jpg" }, { name: "TW-1002_d01.jpg" }, { name: "bad.png" }]))}>演示匹配</Btn>
      </div>
      <DataTable columns={[{ key: "name", title: "文件" }, { key: "pid", title: "款号" }, { key: "ok", title: "结果", render: (r) => r.ok ? "已入库" : "未匹配，待人工" }]} rows={result} />
    </div>
  );
}

function BatchOps({ s }) {
  const [brand, setBrand] = useState("");
  const list = s.products.filter((p) => !brand || p.brand === brand);
  const [sel, setSel] = useState([]);
  return (
    <div>
      <div className="hrow"><div><h1>批量可订状态</h1><p>按筛选条件上架、下架或不可订购，并留下操作记录</p></div></div>
      <div className="chips">
        {["", ...s.dictionaries.brands].map((b) => <button key={b || "all"} className={"chip " + (brand === b ? "on" : "")} onClick={() => setBrand(b)}>{b || "全部品牌"}</button>)}
      </div>
      <div className="row" style={{ margin: "12px 0" }}>
        <Btn sm onClick={() => Taowo.batchStatus(sel.length ? sel : list.map((p) => p.id), { status: "live", orderable: true })}>上架</Btn>
        <Btn sm ghost onClick={() => Taowo.batchStatus(sel.length ? sel : list.map((p) => p.id), { status: "off" })}>下架</Btn>
        <Btn sm danger onClick={() => Taowo.batchStatus(sel.length ? sel : list.map((p) => p.id), { orderable: false })}>不可订购</Btn>
      </div>
      <table className="data">
        <thead><tr><th></th><th>款号</th><th>名称</th><th>状态</th></tr></thead>
        <tbody>
          {list.map((p) => (
            <tr key={p.id}>
              <td><input type="checkbox" checked={sel.includes(p.id)} onChange={() => setSel(sel.includes(p.id) ? sel.filter((x) => x !== p.id) : sel.concat(p.id))} /></td>
              <td>{p.id}</td><td>{p.name}</td><td>{p.orderable && p.status === "live" ? "可订" : "不可订"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 style={{ fontSize: 20, margin: "28px 0 12px", fontWeight: 500 }}>操作记录</h2>
      <DataTable columns={[{ key: "t", title: "时间" }, { key: "user", title: "人" }, { key: "action", title: "动作" }, { key: "target", title: "对象" }]} rows={s.productLogs} />
    </div>
  );
}

function ReviewOps({ s }) {
  const [cur, setCur] = useState(s.orders.find((o) => o.status === "pending_review") || s.orders[0]);
  return (
    <div>
      <div className="hrow"><div><h1>订购单审核</h1><p>品牌方审核价格与数量，通过后生效，可驳回或调整；通过后自动关联合同</p></div>
        <Btn sm ghost onClick={() => {
          const rows = s.orders.filter((o) => o.type !== "erp");
          downloadText("B2B订单.csv", "单号,类型,状态,经销商,金额,时间\n" + rows.map((o) => [o.id, o.type, o.status, o.dealerId, Taowo.lineAmount(o.lines), o.created].join(",")).join("\n"), "text/csv");
        }}>导出订单</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24 }}>
        <div>
          {s.orders.filter((o) => o.type !== "erp").map((o) => (
            <div key={o.id} onClick={() => setCur(o)} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)", cursor: "pointer", fontWeight: cur?.id === o.id ? 600 : 400 }}>
              {o.id}<div className="muted">{statusLabel(o.status)}</div>
            </div>
          ))}
        </div>
        {cur && (
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 400 }}>{cur.id}</h2>
            <p className="muted">{cur.dealerId} · {cur.address}</p>
            <table className="data">
              <thead><tr><th>款</th><th>尺码</th><th>数量</th><th>单价</th></tr></thead>
              <tbody>
                {cur.lines.map((l, i) => (
                  <tr key={i}>
                    <td>{l.pid}</td><td>{l.size}</td>
                    <td><input style={{ width: 64, border: 0, borderBottom: "1px solid #111" }} defaultValue={l.qty} onBlur={(e) => { l.qty = Number(e.target.value); }} /></td>
                    <td><input style={{ width: 80, border: 0, borderBottom: "1px solid #111" }} defaultValue={l.price} onBlur={(e) => { l.price = Number(e.target.value); }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cur.status === "pending_review" && (
              <div className="row" style={{ marginTop: 16 }}>
                <Btn sm onClick={() => Taowo.reviewOrder(cur.id, "approve", { lines: cur.lines })}>通过并生效</Btn>
                <Btn sm danger onClick={() => Taowo.reviewOrder(cur.id, "reject", "数量需调整")}>驳回</Btn>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ErpOrders({ s }) {
  const rows = s.orders.filter((o) => o.type === "erp");
  return (
    <div>
      <div className="hrow"><div><h1>ERP 原单</h1><p>未经过商城、在 ERP 直接创建的订单，只读映射</p></div>
        <Btn sm ghost onClick={() => Taowo.runSync("ERP 原订单")}>同步</Btn>
      </div>
      <DataTable columns={[{ key: "externalNo", title: "外部单号" }, { key: "dealerId", title: "经销商" }, { key: "created", title: "日期" }, { key: "status", title: "状态", render: (r) => statusLabel(r.status) }]} rows={rows} />
    </div>
  );
}

function ShipOps({ s }) {
  const orders = s.orders.filter((o) => ["active", "partial"].includes(o.status));
  const [oid, setOid] = useState(orders[0]?.id || s.orders[1]?.id);
  const o = s.orders.find((x) => x.id === oid);
  const [tracking, setTracking] = useState("SF" + Date.now().toString().slice(-10));
  const [express, setExpress] = useState("顺丰");
  return (
    <div>
      <div className="hrow"><div><h1>发货与交付</h1><p>生成发货单，记录已/未发、日期、物流单号；可手工或接口回传</p></div></div>
      <Field label="订单">
        <select value={oid} onChange={(e) => setOid(e.target.value)}>{s.orders.map((x) => <option key={x.id} value={x.id}>{x.id} {statusLabel(x.status)}</option>)}</select>
      </Field>
      {o && (
        <>
          <table className="data">
            <thead><tr><th>款</th><th>尺码</th><th>订</th><th>已发</th><th>本次</th></tr></thead>
            <tbody>
              {o.lines.map((l, i) => (
                <tr key={i}>
                  <td>{l.pid}</td><td>{l.size}</td><td>{l.qty}</td><td>{l.shipped || 0}</td>
                  <td><input id={"q" + i} defaultValue={Math.max(0, l.qty - (l.shipped || 0))} style={{ width: 64, border: 0, borderBottom: "1px solid #111" }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="row">
            <Field label="物流公司"><input value={express} onChange={(e) => setExpress(e.target.value)} /></Field>
            <Field label="物流单号"><input value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
          </div>
          <div className="row">
            <Btn sm onClick={() => {
              const lines = o.lines.map((l, i) => ({ pid: l.pid, size: l.size, qty: Number(document.getElementById("q" + i).value) || 0 })).filter((x) => x.qty);
              Taowo.ship(o.id, { express, tracking, date: s.today, lines });
            }}>生成发货单</Btn>
            <Btn sm ghost onClick={() => {
              Taowo.updateDelivery(o.id, o.lines.map((l) => ({ pid: l.pid, size: l.size, shipped: l.qty })));
            }}>接口式回传全部发完</Btn>
          </div>
        </>
      )}
      <h2 style={{ fontSize: 20, margin: "28px 0 12px", fontWeight: 500 }}>发货单</h2>
      <DataTable columns={[{ key: "id", title: "发货单" }, { key: "orderId", title: "订单" }, { key: "date", title: "日期" }, { key: "express", title: "承运" }, { key: "tracking", title: "单号" }, { key: "status", title: "状态", render: (r) => statusLabel(r.status) }]} rows={s.shipments} />
    </div>
  );
}

function RequestOps({ s }) {
  const [reply, setReply] = useState("可补货，预计下周上架");
  return (
    <div>
      <div className="hrow"><div><h1>求购单</h1></div></div>
      {s.requests.map((r) => (
        <div key={r.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
          <b>{r.id}</b> {r.title}<div className="muted">{r.detail}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <input value={reply} onChange={(e) => setReply(e.target.value)} style={{ flex: 1, border: 0, borderBottom: "1px solid #111" }} />
            <Btn sm onClick={() => Taowo.replyRequest(r.id, "approved", reply)}>回写</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReturnOps({ s }) {
  return (
    <div>
      <div className="hrow"><div><h1>退货单</h1><p>记录、审核并跟踪状态</p></div></div>
      {s.returns.map((r) => (
        <div key={r.id} style={{ padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
          <b>{r.id}</b> {r.orderId} · {r.reason}
          <div className="muted">{statusLabel(r.status)}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <Btn sm onClick={() => Taowo.reviewReturn(r.id, "approved")}>通过</Btn>
            <Btn sm ghost onClick={() => Taowo.reviewReturn(r.id, "rejected")}>驳回</Btn>
            <Btn sm ghost onClick={() => Taowo.reviewReturn(r.id, "done")}>完结</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

function PayOps({ s }) {
  return (
    <div>
      <div className="hrow"><div><h1>支付流水</h1><p>渠道单号、金额、状态、时间</p></div></div>
      <DataTable columns={[{ key: "id", title: "流水" }, { key: "orderId", title: "订单" }, { key: "channel", title: "渠道" }, { key: "channelNo", title: "渠道单号" }, { key: "amount", title: "金额", render: (r) => Money(r.amount) }, { key: "status", title: "状态" }, { key: "time", title: "时间" }]} rows={s.payments} />
    </div>
  );
}

function ContractOps({ s }) {
  const [title, setTitle] = useState("新合同");
  const [cid, setCid] = useState(s.contracts[0]?.id || "");
  const [oid, setOid] = useState(s.orders.find((o) => o.type !== "erp")?.id || "");
  return (
    <div>
      <div className="hrow"><div><h1>合同</h1><p>维护合同及与订单的关联</p></div></div>
      <DataTable columns={[{ key: "id", title: "编号" }, { key: "title", title: "名称" }, { key: "dealerId", title: "经销商" }, { key: "status", title: "状态" }, { key: "orders", title: "订单", render: (r) => (r.orders || []).join(", ") }]} rows={s.contracts} />
      <div className="row" style={{ marginTop: 16 }}>
        <Field label="名称"><input value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Btn sm onClick={() => Taowo.saveContract({ id: "CT-" + Date.now().toString().slice(-4), dealerId: "D-10086", title, orders: [], status: "草稿", from: s.today, to: "2026-12-31", file: "draft.pdf" })}>新建</Btn>
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <Field label="合同"><select value={cid} onChange={(e) => setCid(e.target.value)}>{s.contracts.map((c) => <option key={c.id}>{c.id}</option>)}</select></Field>
        <Field label="订单"><select value={oid} onChange={(e) => setOid(e.target.value)}>{s.orders.filter((o) => o.type !== "erp").map((o) => <option key={o.id}>{o.id}</option>)}</select></Field>
        <Btn sm onClick={() => Taowo.linkContract(cid, oid)}>关联</Btn>
      </div>
    </div>
  );
}

function StatementOps({ s }) {
  return (
    <div>
      <div className="hrow"><div><h1>对账单</h1><p>针对线下付款订单生成账期汇总</p></div>
        <Btn sm onClick={() => Taowo.createStatement("2026-09", "D-10086")}>生成 9 月对账单</Btn>
      </div>
      <DataTable columns={[
        { key: "id", title: "编号" }, { key: "period", title: "账期" }, { key: "dealerId", title: "经销商" },
        { key: "amount", title: "应付", render: (r) => Money(r.amount) }, { key: "paid", title: "已付", render: (r) => Money(r.paid) },
        { key: "status", title: "状态" },
        { key: "op", title: "", render: (r) => <button onClick={() => Taowo.confirmStatement(r.id)}>确认</button> },
      ]} rows={s.statements} />
    </div>
  );
}

function CampaignOps({ s }) {
  const [name, setName] = useState("门店开业满减");
  return (
    <div>
      <div className="hrow"><div><h1>营销活动</h1><p>满减、满折、优惠券及适用商品、客户、有效范围</p></div></div>
      <DataTable columns={[{ key: "id", title: "编号" }, { key: "name", title: "名称" }, { key: "type", title: "类型" }, { key: "scope", title: "范围" }, { key: "dealers", title: "客户" }, { key: "to", title: "截止" }, { key: "status", title: "状态" }]} rows={s.campaigns} />
      <Field label="新活动"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Btn sm onClick={() => Taowo.saveCampaign({ id: "M-" + Date.now().toString().slice(-3), name, type: "满减", threshold: 10000, value: 300, scope: "现货", dealers: "全部", from: s.today, to: "2026-10-31", status: "live" })}>发布</Btn>
    </div>
  );
}

function ReportOps({ s }) {
  const [dim, setDim] = useState("product");
  const orders = s.orders.filter((o) => o.type !== "erp" && o.status !== "rejected");
  const bag = {};
  orders.forEach((o) => {
    o.lines.forEach((l) => {
      const p = Taowo.product(l.pid);
      const key = dim === "product" ? l.pid : dim === "dealer" ? o.dealerId : dim === "wave" ? (p?.wave || "—") : l.size;
      const name = dim === "product" ? p?.name : dim === "dealer" ? o.dealerId : dim === "wave" ? (p?.wave || "—") : l.size;
      bag[key] = bag[key] || { id: key, name, qty: 0 };
      bag[key].qty += l.qty;
    });
  });
  const rows = Object.values(bag);
  const max = Math.max(1, ...rows.map((r) => r.qty));
  return (
    <div>
      <div className="hrow"><div><h1>订购分布</h1><p>按商品、客户、波次、尺码分析数量，可导出</p></div>
        <Btn sm ghost onClick={() => downloadText("订购分布.csv", "维度,名称,数量\n" + rows.map((r) => [r.id, r.name, r.qty].join(",")).join("\n"), "text/csv")}>导出</Btn>
      </div>
      <div className="tabs">
        {[["product", "商品"], ["dealer", "客户"], ["wave", "波次"], ["size", "尺码"]].map(([k, n]) => (
          <button key={k} className={dim === k ? "on" : ""} onClick={() => setDim(k)}>{n}</button>
        ))}
      </div>
      <div className="chart">
        {rows.map((r) => <b key={r.id} title={r.id} style={{ height: (r.qty / max) * 160 + 8 }} />)}
      </div>
      <DataTable columns={[{ key: "id", title: "编码" }, { key: "name", title: "名称" }, { key: "qty", title: "订购量" }]} rows={rows} />
    </div>
  );
}

function ApiOps({ s }) {
  const samples = {
    "8.1": { req: '{ "erpId": "ERP-SH-086" }', res: '{ "id": "D-10086", "mapped": true }' },
    "8.2": { req: '{ "sku": "TW-1001", "images": ["TW-1001_main.jpg"] }', res: '{ "ok": true, "failed": [] }' },
    "8.3": { req: '{ "sku": "TW-1001", "size": "42", "qty": 30 }', res: '{ "idempotent": true }' },
    "8.4": { req: '{ "orderId": "SO-260918-01", "shipped": 4 }', res: '{ "status": "partial" }' },
    "8.5": { req: '{ "tracking": "SF1061882401" }', res: '{ "traces": 4 }' },
  };
  return (
    <div>
      <div className="hrow"><div><h1>开放接口</h1><p>鉴权、字段映射、幂等、失败日志与约定频率同步</p></div></div>
      {s.apis.map((a) => (
        <div key={a.id} style={{ padding: "16px 0", borderBottom: "1px solid var(--line)" }}>
          <b>{a.id} {a.name}</b> <span className="muted">{a.method} {a.path}</span>
          <div className="muted">上次 {a.last} · 成功 {a.ok} · 失败 {a.fail}</div>
          <div className="code">req {samples[a.id].req}\nres {samples[a.id].res}</div>
          <div className="row" style={{ marginTop: 8 }}>
            <Btn sm ghost onClick={() => Taowo.logApi(a.id, true)}>模拟成功</Btn>
            <Btn sm ghost onClick={() => Taowo.logApi(a.id, false)}>模拟失败日志</Btn>
          </div>
        </div>
      ))}
      <h2 style={{ fontSize: 20, margin: "28px 0 12px", fontWeight: 500 }}>同步任务</h2>
      <DataTable columns={[{ key: "name", title: "任务" }, { key: "freq", title: "频率" }, { key: "last", title: "上次" }, { key: "result", title: "结果" }, { key: "op", title: "", render: (r) => <button onClick={() => Taowo.runSync(r.name)}>立即同步</button> }]} rows={s.syncJobs} />
    </div>
  );
}

function OrgOps({ s }) {
  const [name, setName] = useState("");
  const [account, setAccount] = useState("");
  const [org, setOrg] = useState(s.orgs[0]?.name);
  return (
    <div>
      <div className="hrow"><div><h1>组织与用户</h1><p>维护运营组织，创建、启停、查询账号</p></div></div>
      <DataTable columns={[{ key: "id", title: "组织" }, { key: "name", title: "名称" }, { key: "parent", title: "上级" }, { key: "people", title: "人数" }]} rows={s.orgs} />
      <h2 style={{ fontSize: 20, margin: "28px 0 12px", fontWeight: 500 }}>用户</h2>
      <DataTable columns={[
        { key: "account", title: "账号" }, { key: "name", title: "姓名" }, { key: "org", title: "组织" }, { key: "role", title: "角色" },
        { key: "status", title: "状态", render: (r) => statusLabel(r.status) },
        { key: "op", title: "", render: (r) => r.role.startsWith("dealer") ? null : <span><button onClick={() => Taowo.toggleUser(r.id)}>{r.status === "active" ? "停用" : "启用"}</button> <button onClick={() => Taowo.resetPassword(r.id)}>重置密码</button></span> },
      ]} rows={s.users.filter((u) => !u.role.startsWith("dealer"))} />
      <div className="row" style={{ marginTop: 16 }}>
        <Field label="姓名"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="账号"><input value={account} onChange={(e) => setAccount(e.target.value)} /></Field>
        <Field label="组织"><select value={org} onChange={(e) => setOrg(e.target.value)}>{s.orgs.map((o) => <option key={o.id}>{o.name}</option>)}</select></Field>
        <Btn sm onClick={() => Taowo.saveUser({ name, account, org, role: "ops_merch" })}>创建用户</Btn>
      </div>
    </div>
  );
}

function RoleOps({ s }) {
  const [cur, setCur] = useState(s.roles[0]);
  const [picked, setPicked] = useState(cur.perms);
  return (
    <div>
      <div className="hrow"><div><h1>角色权限</h1><p>菜单、页面、按钮。登录后按权限展示并二次校验</p></div></div>
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
        <div>
          {s.roles.filter((r) => !r.id.startsWith("dealer")).map((r) => (
            <div key={r.id} onClick={() => { setCur(r); setPicked(r.perms); }} style={{ padding: "10px 0", cursor: "pointer", fontWeight: cur.id === r.id ? 600 : 400 }}>{r.name}</div>
          ))}
        </div>
        <div>
          <p className="muted">{cur.desc}</p>
          <div className="perm" style={{ marginTop: 12 }}>
            {s.permTree.map((g) => (
              <label key={g.id}>
                <input type="checkbox" checked={picked.includes("*") || picked.includes(g.id + ".*") || picked.some((p) => p.startsWith(g.id))} onChange={(e) => {
                  const key = g.id + ".*";
                  setPicked(e.target.checked ? Array.from(new Set(picked.concat(key))) : picked.filter((p) => p !== key && p !== "*"));
                }} />
                <span><b>{g.name}</b><div className="muted">{g.children.join(" / ")}</div></span>
              </label>
            ))}
          </div>
          <Btn sm style={{ marginTop: 16 }} onClick={() => Taowo.saveRole({ ...cur, perms: picked })}>保存权限</Btn>
        </div>
      </div>
    </div>
  );
}

function LogOps({ s }) {
  const [type, setType] = useState("");
  const rows = s.logs.filter((l) => !type || l.type === type);
  return (
    <div>
      <div className="hrow"><div><h1>日志</h1><p>登录结果、时间，以及新增、修改、上下架、审核</p></div></div>
      <div className="chips">
        {["", "登录", "退出", "新增", "审核", "商品上架"].map((t) => <button key={t || "all"} className={"chip " + (type === t ? "on" : "")} onClick={() => setType(t)}>{t || "全部"}</button>)}
      </div>
      <DataTable columns={[{ key: "time", title: "时间" }, { key: "user", title: "人员" }, { key: "type", title: "类型" }, { key: "result", title: "结果" }, { key: "ip", title: "IP" }]} rows={rows} />
    </div>
  );
}

function DictOps({ s }) {
  const d = s.dictionaries;
  return (
    <div>
      <div className="hrow"><div><h1>基础参数</h1><p>订单状态、支付方式、筛选项、附件限制</p></div></div>
      <Field label="订单状态"><input defaultValue={d.orderStatus.join("、")} onBlur={(e) => Taowo.saveDict("orderStatus", e.target.value.split("、"))} /></Field>
      <Field label="支付方式"><input defaultValue={d.payMethods.join("、")} onBlur={(e) => Taowo.saveDict("payMethods", e.target.value.split("、"))} /></Field>
      <Field label="商品筛选项（后台可调，前台列表读取）"><input defaultValue={d.filters.join("、")} onBlur={(e) => Taowo.saveDict("filters", e.target.value.split("、"))} /></Field>
      <Field label="附件限制"><input defaultValue={d.attachLimit} onBlur={(e) => Taowo.saveDict("attachLimit", e.target.value)} /></Field>
    </div>
  );
}

function MediaOps({ s }) {
  return (
    <div>
      <div className="hrow"><div><h1>素材归档</h1><p>平台归档后关联商品，供经销商检索下载</p></div></div>
      <DataTable columns={[{ key: "name", title: "文件" }, { key: "pid", title: "款号" }, { key: "year", title: "年份" }, { key: "kind", title: "类型" }]} rows={s.media} />
    </div>
  );
}

function OpsApp({ s, path }) {
  if (!s.session || String(s.session.role).startsWith("dealer")) return <LoginView portal="ops" />;
  const map = {
    "/ops": <OpsToday s={s} />,
    "/ops/cms": <CmsView s={s} />,
    "/ops/home": <CmsView s={s} />,
    "/ops/dealers": <DealersView s={s} />,
    "/ops/apply": <ApplyOps s={s} />,
    "/ops/accounts": <AccountsOps s={s} />,
    "/ops/master": <MasterView s={s} />,
    "/ops/products": <ProductsOps s={s} />,
    "/ops/stock": <StockOps s={s} />,
    "/ops/images": <ImageOps s={s} />,
    "/ops/batch": <BatchOps s={s} />,
    "/ops/media": <MediaOps s={s} />,
    "/ops/review": <ReviewOps s={s} />,
    "/ops/erp-orders": <ErpOrders s={s} />,
    "/ops/ship": <ShipOps s={s} />,
    "/ops/requests": <RequestOps s={s} />,
    "/ops/returns": <ReturnOps s={s} />,
    "/ops/pay": <PayOps s={s} />,
    "/ops/contracts": <ContractOps s={s} />,
    "/ops/statements": <StatementOps s={s} />,
    "/ops/campaigns": <CampaignOps s={s} />,
    "/ops/reports": <ReportOps s={s} />,
    "/ops/api": <ApiOps s={s} />,
    "/ops/org": <OrgOps s={s} />,
    "/ops/roles": <RoleOps s={s} />,
    "/ops/logs": <LogOps s={s} />,
    "/ops/dict": <DictOps s={s} />,
  };
  return (
    <div className="ops">
      <OpsNav path={path} role={s.session.role} />
      <div className="main">{map[path] || <OpsToday s={s} />}</div>
    </div>
  );
}

Object.assign(window, { OpsApp });
