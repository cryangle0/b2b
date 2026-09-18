const { useState } = React;
const { Icon, Photo, go, Btn, Field, Modal, Empty, Money, statusLabel, accountStatus, DataTable, downloadText, LoginView, productThumb, groupOrderLines, qtyOfSize } = window;

function opsAllowed(role, href) {
  if (role === "ops_admin") return true;
  if (role === "brand_reviewer") return ["/ops", "/ops/orders", "/ops/reports", "/ops/logs", "/ops/erp-orders", "/ops/pay"].some((h) => href === h || href.startsWith(h + "/"));
  if (role === "ops_merch") return ["/ops", "/ops/cms", "/ops/master", "/ops/products", "/ops/stock", "/ops/images", "/ops/logs", "/ops/dict"].some((h) => href === h || href.startsWith(h + "/"));
  return true;
}

function navOn(path, h) {
  if (h === "/ops") return path === "/ops";
  return path === h || path.startsWith(h + "/");
}

function OpsNav({ path, role }) {
  const groups = [
    ["工作台", [["/ops", "今日"]]],
    ["装修", [["/ops/cms", "页面装修"]]],
    ["经销商", [["/ops/dealers", "档案 / ERP"], ["/ops/apply", "入驻审核"], ["/ops/accounts", "账号绑定"]]],
    ["商品", [["/ops/master", "主数据"], ["/ops/products/spot", "现货"], ["/ops/products/futures", "期货"], ["/ops/stock", "仓库库存"], ["/ops/images", "图片管理"]]],
    ["订货履约", [["/ops/orders", "订购单"], ["/ops/erp-orders", "ERP 原单"], ["/ops/ship", "发货交付"], ["/ops/wish", "心愿单"], ["/ops/returns", "退货"]]],
    ["财务", [["/ops/pay", "支付流水"], ["/ops/contracts", "合同"], ["/ops/statements", "对账单"]]],
    ["经营", [["/ops/campaigns", "营销活动"], ["/ops/reports", "订购分布"]]],
    ["开放", [["/ops/api", "接口与同步"]]],
    ["系统", [["/ops/org", "组织用户"], ["/ops/roles", "角色权限"], ["/ops/logs", "日志"], ["/ops/dict", "基础字典"]]],
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
            {vis.map(([h, n]) => <a key={h} className={navOn(path, h) ? "active" : ""} href={"#" + h}>{n}</a>)}
          </div>
        );
      })}
      <div style={{ margin: "28px 12px" }}>
        <a href="#/ops-login" onClick={() => Taowo.logout()}>退出</a>
      </div>
    </aside>
  );
}

function OpsShell({ s, path, children }) {
  return (
    <div className="ops">
      <OpsNav path={path} role={s.session.role} />
      <div className="main">{children}</div>
    </div>
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
      <DataTable onRow={(r) => go("/ops/orders/" + r.id)} columns={[{ key: "id", title: "单号" }, { key: "dealerId", title: "经销商" }, { key: "created", title: "提交" }, { key: "amt", title: "金额", render: (r) => Money(Taowo.lineAmount(r.lines)) }]} rows={pending} />
    </div>
  );
}

function CmsView({ s }) {
  const cms = s.cms;
  const [device, setDevice] = useState("PC");
  const [nav, setNav] = useState((device === "H5" ? cms.h5Nav : cms.nav).join(" / "));
  const [productMenu, setProductMenu] = useState((cms.productMenu || []).map((x) => x.label + "|" + x.href).join("\n"));
  const [assetMenu, setAssetMenu] = useState((cms.assetMenu || []).map((x) => x.label + "|" + x.href).join("\n"));
  const [catNav, setCatNav] = useState((cms.categoryNav || []).map((x) => x.label + "|" + x.href).join("\n"));
  const [hero, setHero] = useState(cms.hero.map((h) => [h.title, h.sub, h.href, h.img].join("|")).join("\n"));
  const [floors, setFloors] = useState((cms.floors || []).map((f) => f.title + "|" + (f.query?.type || (f.query?.fair ? "fair" : "spot"))).join("\n"));
  const [banner, setBanner] = useState([cms.banner.title, cms.banner.sub, cms.banner.href, cms.banner.img].join("|"));
  function parseLinks(text) {
    return text.split(/\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const [label, href] = l.split("|").map((x) => (x || "").trim());
      return { label, href: href || "#/" };
    });
  }
  function publish() {
    const heroRows = hero.split(/\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const [title, sub, href, img] = l.split("|").map((x) => (x || "").trim());
      return { title, sub, href: href || "#/", img };
    });
    const floorRows = floors.split(/\n/).map((l) => l.trim()).filter(Boolean).map((l, i) => {
      const [title, type] = l.split("|").map((x) => (x || "").trim());
      const query = type === "fair" ? { fair: true } : { type: type || "spot" };
      return { id: "f" + (i + 1), title, query };
    });
    const [bt, bs, bh, bi] = banner.split("|").map((x) => (x || "").trim());
    const parts = nav.split(/[\/,，]/).map((x) => x.trim()).filter(Boolean);
    Taowo.saveCms({
      ...(device === "H5" ? { h5Nav: parts } : { nav: parts }),
      productMenu: parseLinks(productMenu),
      assetMenu: parseLinks(assetMenu),
      categoryNav: parseLinks(catNav),
      hero: heroRows.length ? heroRows : cms.hero,
      floors: floorRows.length ? floorRows : cms.floors,
      banner: { title: bt, sub: bs, href: bh, img: bi },
    });
  }
  return (
    <div>
      <div className="hrow">
        <div><h1>页面装修</h1><p>真实配置：保存后商城顶栏、分类行、首屏与楼层立即读取。PC / H5 导航可分别发布。</p></div>
        <div className="row">
          <Btn sm ghost onClick={() => {
            const next = device === "PC" ? "H5" : "PC";
            setDevice(next);
            setNav(((next === "H5" ? s.cms.h5Nav : s.cms.nav) || s.cms.nav).join(" / "));
          }}>当前 {device} · 切到 {device === "PC" ? "H5" : "PC"}</Btn>
          <Btn sm ghost onClick={() => go("/")}>打开商城预览</Btn>
          <Btn sm onClick={publish}>发布配置</Btn>
        </div>
      </div>
      <Field label={device + " 顶栏导航（用 / 分隔）"}><input value={nav} onChange={(e) => setNav(e.target.value)} /></Field>
      <Field label="产品下拉（每行：名称|#锚点）"><textarea value={productMenu} onChange={(e) => setProductMenu(e.target.value)} rows={4} /></Field>
      <Field label="资产下拉（每行：名称|#锚点）"><textarea value={assetMenu} onChange={(e) => setAssetMenu(e.target.value)} rows={4} /></Field>
      <Field label="首页分类一行（产品 / 订单 / 资产；名称为产品时自动带现货/期货/订货会下拉）"><textarea value={catNav} onChange={(e) => setCatNav(e.target.value)} rows={4} /></Field>
      <Field label="首屏轮播（每行：标题|说明|#链接|图片URL）"><textarea value={hero} onChange={(e) => setHero(e.target.value)} rows={5} /></Field>
      <Field label="首页楼层（每行：标题|spot 或 futures 或 fair）"><textarea value={floors} onChange={(e) => setFloors(e.target.value)} rows={3} /></Field>
      <Field label="专场条（标题|说明|#链接|图片URL）"><input value={banner} onChange={(e) => setBanner(e.target.value)} /></Field>
      <p className="muted">发布后回到商城首页即可看到新文案与导航。H5 为同一套响应式，订货会现场可用手机下单。</p>
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
  return (
    <div>
      <div className="hrow"><div><h1>入驻审核</h1><p>行列表进入详情后通过或驳回</p></div></div>
      <DataTable
        onRow={(r) => go("/ops/apply/" + r.id)}
        columns={[
          { key: "id", title: "单号" },
          { key: "company", title: "企业" },
          { key: "city", title: "城市" },
          { key: "contact", title: "联系人" },
          { key: "phone", title: "电话" },
          { key: "status", title: "状态", render: (r) => statusLabel(r.status) },
          { key: "time", title: "提交时间" },
        ]}
        rows={s.applications}
      />
    </div>
  );
}

function ApplyDetail({ s, id }) {
  const a = s.applications.find((x) => x.id === id);
  const [note, setNote] = useState(a?.note || "");
  if (!a) return <Empty title="申请不存在" action={<Btn onClick={() => go("/ops/apply")}>返回列表</Btn>} />;
  const open = a.status === "pending" || a.status === "need_info";
  return (
    <div>
      <div className="hrow">
        <div><h1>{a.company}</h1><p>{a.id} · {statusLabel(a.status)} · {a.time}</p></div>
        <Btn sm ghost onClick={() => go("/ops/apply")}>返回列表</Btn>
      </div>
      <div className="kvs" style={{ marginBottom: 20 }}>
        <i>城市</i><b>{a.city}</b>
        <i>联系人</i><b>{a.contact} {a.phone}</b>
        <i>信用代码</i><b>{a.license}</b>
        <i>说明</i><b>{a.note || "—"}</b>
      </div>
      {open ? (
        <>
          <Field label="审核意见"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <div className="row">
            <Btn sm onClick={() => { Taowo.reviewApply(a.id, "approved"); go("/ops/apply"); }}>通过</Btn>
            <Btn sm ghost onClick={() => Taowo.reviewApply(a.id, "need_info", note || "请补充资料")}>补资料</Btn>
            <Btn sm danger onClick={() => { Taowo.reviewApply(a.id, "rejected", note); go("/ops/apply"); }}>驳回</Btn>
          </div>
        </>
      ) : <p className="muted">该申请已处理，不可再审。</p>}
    </div>
  );
}

function accountTpl() {
  return [
    "账号,姓名,手机,邮箱,角色,绑定经销商,初始密码",
    "hzdong,何清,13700001012,heqing@taowo.demo,主账号,杭州东望体育,123456",
    "cdlushan,马川,13600001990,,主账号,D-10990,123456",
    "hzsub1,东望仓管,13700001013,,子账号,杭州东望体育,123456",
  ].join("\n");
}

function AccountsOps({ s }) {
  const [report, setReport] = useState(null);
  const rows = s.users.filter((u) => String(u.role).startsWith("dealer") && u.status !== "pending");
  function runImport(text) {
    setReport(Taowo.importDealerAccounts(text));
  }
  return (
    <div>
      <div className="hrow">
        <div><h1>账号绑定</h1><p>已审核通过的经销商账号。可下载模板批量导入；绑定列填档案号或企业名，空着则不绑。</p></div>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <Btn sm ghost onClick={() => { downloadText("经销商账号导入模板.csv", accountTpl(), "text/csv"); Taowo.toast("已下载模板，填写后上传 CSV"); }}>下载导入模板</Btn>
        <label className="btn sm">上传导入
          <input type="file" accept=".csv,.txt" hidden onChange={(e) => {
            const file = e.target.files[0];
            e.target.value = "";
            if (!file) return;
            if (/\.xlsx?$/i.test(file.name)) return Taowo.toast("请另存为 CSV 后上传。浏览器读不了 xlsx。", "err");
            const r = new FileReader();
            r.onload = () => runImport(String(r.result));
            r.readAsText(file);
          }} />
        </label>
      </div>
      <details open style={{ marginBottom: 16 }}>
        <summary>模板说明与预览导入</summary>
        <p className="muted">表头必须有账号、姓名。角色填主账号或子账号。绑定经销商填档案号、企业名或 ERP 号；找不到档案则该行失败，不会半写入。</p>
        <Field label="或粘贴 CSV">
          <textarea defaultValue={accountTpl()} id="acct-import-text" rows={5} />
        </Field>
        <Btn sm onClick={() => runImport(document.getElementById("acct-import-text").value)}>导入粘贴内容</Btn>
      </details>
      {report && (
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>最近导入：新建 {report.created} · 更新 {report.updated} · 失败 {report.failed.length}</h2>
          {report.rows.length > 0 && (
            <DataTable columns={[{ key: "account", title: "账号" }, { key: "name", title: "姓名" }, { key: "action", title: "动作" }, { key: "dealerId", title: "绑定" }, { key: "msg", title: "说明" }]} rows={report.rows} />
          )}
          {report.failed.length > 0 && (
            <DataTable columns={[{ key: "line", title: "行" }, { key: "account", title: "账号" }, { key: "msg", title: "失败原因" }]} rows={report.failed} />
          )}
        </div>
      )}
      <DataTable
        onRow={(r) => go("/ops/accounts/" + r.id)}
        columns={[
          { key: "account", title: "账号" },
          { key: "name", title: "姓名" },
          { key: "phone", title: "手机" },
          { key: "role", title: "角色", render: (r) => r.role === "dealer_sub" ? "子账号" : "主账号" },
          { key: "dealerId", title: "绑定经销商", render: (r) => r.dealerId || "" },
          { key: "status", title: "状态", render: (r) => accountStatus(r.status) },
        ]}
        rows={rows}
      />
    </div>
  );
}

function AccountBindDetail({ s, id }) {
  const u = s.users.find((x) => x.id === id);
  const [q, setQ] = useState("");
  const [pick, setPick] = useState(u?.dealerId || "");
  if (!u) return <Empty title="账号不存在" action={<Btn onClick={() => go("/ops/accounts")}>返回</Btn>} />;
  const bound = s.dealers.find((d) => d.id === u.dealerId);
  const hits = s.dealers.filter((d) => !q || (d.name + d.id + d.short + d.erpId + d.city).toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="hrow">
        <div><h1>{u.account}</h1><p>{u.role === "dealer_sub" ? "子账号" : "主账号"} · {accountStatus(u.status)}</p></div>
        <Btn sm ghost onClick={() => go("/ops/accounts")}>返回列表</Btn>
      </div>
      <div className="kvs" style={{ marginBottom: 20 }}>
        <i>姓名</i><b>{u.name || ""}</b>
        <i>手机</i><b>{u.phone || ""}</b>
        <i>邮箱</i><b>{u.email || ""}</b>
        <i>企业显示名</i><b>{u.org || ""}</b>
        <i>绑定经销商</i><b>{bound ? bound.name + "（" + bound.id + "）" : ""}</b>
        <i>开通时间</i><b>{u.created || ""}</b>
        <i>最近登录</i><b>{u.lastLogin || ""}</b>
      </div>
      <Field label="模糊搜索经销商档案"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="企业名 / 档案号 / 城市 / ERP" /></Field>
      <DataTable
        onRow={(r) => setPick(r.id)}
        columns={[
          { key: "id", title: "档案" },
          { key: "name", title: "企业" },
          { key: "city", title: "城市" },
          { key: "erpId", title: "ERP" },
          { key: "pick", title: "", render: (r) => pick === r.id ? "已选" : "选择" },
        ]}
        rows={hits}
      />
      <div className="row" style={{ marginTop: 16 }}>
        <Btn sm onClick={() => Taowo.bindUserDealer(u.id, pick)}>绑定所选档案</Btn>
        <Btn sm ghost onClick={() => Taowo.resetPassword(u.id)}>重置密码</Btn>
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

function ProductsOps({ s, type }) {
  const futures = type === "futures";
  const [f, setF] = useState({ q: "", brand: "", ip: "", cat: "", sub: "", wave: "", status: "", orderable: "" });
  const [sel, setSel] = useState([]);
  const [edit, setEdit] = useState(null);
  const [csv, setCsv] = useState("款号,名称,年份,季节,品牌,大类,小类,性别,波次,价格,交期,期货有效期\nTW-1003,Studio Fleece,2026,FW26,Studio,服装,上衣,中性,02,248,期货 45 天,2026-12-31");
  const [validTo, setValidTo] = useState("2026-12-31");
  const [fromId, setFromId] = useState(s.products.find((p) => p.type === "spot")?.id || "");
  let rows = s.products.filter((p) => p.type === (futures ? "futures" : "spot"));
  rows = rows.filter((p) => {
    if (f.brand && p.brand !== f.brand) return false;
    if (f.ip && p.ip !== f.ip) return false;
    if (f.cat && p.cat !== f.cat) return false;
    if (f.sub && p.sub !== f.sub) return false;
    if (f.wave && p.wave !== f.wave) return false;
    if (f.status && p.status !== f.status) return false;
    if (f.orderable === "yes" && !p.orderable) return false;
    if (f.orderable === "no" && p.orderable) return false;
    if (f.q) {
      const hay = (p.id + p.name + p.nameZh + p.brand + p.ip).toLowerCase();
      if (!hay.includes(f.q.toLowerCase())) return false;
    }
    return true;
  });
  const cols = [
    { key: "ck", title: "", width: 36, render: (r) => <input type="checkbox" checked={sel.includes(r.id)} onClick={(e) => e.stopPropagation()} onChange={() => setSel(sel.includes(r.id) ? sel.filter((x) => x !== r.id) : sel.concat(r.id))} /> },
    { key: "img", title: "图", render: (r) => <div className="ops-thumb"><Photo src={productThumb(r)} alt={r.name} color={r.color} /></div> },
    { key: "id", title: "款号" },
    { key: "name", title: "名称" },
    { key: "brand", title: "品牌" },
    { key: "ip", title: "IP" },
    { key: "cat", title: "大类" },
    { key: "sub", title: "小类" },
    { key: "wave", title: "波次" },
    { key: "price", title: "批发价", render: (r) => Money(r.price) },
    { key: "status", title: "状态", render: (r) => (r.status === "off" ? "下架" : r.orderable ? (Taowo.isExpired(r) ? "过期禁购" : "可订") : "不可订") },
  ];
  if (futures) cols.splice(cols.length - 1, 0, { key: "validTo", title: "有效期", render: (r) => r.validTo || "—" });
  return (
    <div>
      <div className="hrow">
        <div><h1>{futures ? "期货" : "现货"}</h1><p>{futures ? "交期与有效期；过期前台不可订。" : "现货无有效期。列表支持图片、多维筛选、批量上下架与可订。"}</p></div>
        <div className="row">
          <Btn sm ghost onClick={() => Taowo.runSync("ERP 现货商品")}>ERP 同步</Btn>
          <Btn sm ghost onClick={() => {
            const header = "款号,名称,年份,季节,品牌,大类,小类,性别,波次,价格,交期,期货有效期";
            const body = s.products.map((p) => [p.id, p.name, p.year, p.season, p.brand, p.cat, p.sub, p.gender, p.wave, p.price, p.lead, p.validTo || ""].join(","));
            downloadText("商品导入模板.csv", [header, ...body].join("\n"), "text/csv");
          }}>导出模板</Btn>
        </div>
      </div>
      <div className="row" style={{ flexWrap: "wrap", marginBottom: 12 }}>
        <Field label="模糊搜"><input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="款号 / 名称 / 品牌" /></Field>
        {[["brand", "品牌", s.dictionaries.brands], ["ip", "IP", s.dictionaries.ips], ["cat", "大类", s.dictionaries.cats], ["sub", "小类", s.dictionaries.subs], ["wave", "波次", s.dictionaries.waves]].map(([k, n, opts]) => (
          <Field key={k} label={n}>
            <select value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>
              <option value="">全部</option>
              {opts.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
        ))}
        <Field label="上下架">
          <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            <option value="">全部</option>
            <option value="live">在售</option>
            <option value="off">下架</option>
          </select>
        </Field>
        <Field label="可订">
          <select value={f.orderable} onChange={(e) => setF({ ...f, orderable: e.target.value })}>
            <option value="">全部</option>
            <option value="yes">可订</option>
            <option value="no">不可订</option>
          </select>
        </Field>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <Btn sm onClick={() => sel.length ? Taowo.batchStatus(sel, { status: "live", orderable: true }) : Taowo.toast("请先勾选商品", "err")}>批量上架</Btn>
        <Btn sm ghost onClick={() => sel.length ? Taowo.batchStatus(sel, { status: "off" }) : Taowo.toast("请先勾选商品", "err")}>批量下架</Btn>
        <Btn sm onClick={() => sel.length ? Taowo.batchStatus(sel, { orderable: true, status: "live" }) : Taowo.toast("请先勾选商品", "err")}>批量可订</Btn>
        <Btn sm danger onClick={() => sel.length ? Taowo.batchStatus(sel, { orderable: false }) : Taowo.toast("请先勾选商品", "err")}>批量不可订</Btn>
      </div>
      {futures && (
        <div className="row" style={{ marginBottom: 12, alignItems: "end" }}>
          <Field label="从现货创建预售">
            <select value={fromId} onChange={(e) => setFromId(e.target.value)}>{s.products.filter((p) => p.type === "spot").map((p) => <option key={p.id} value={p.id}>{p.id} {p.name}</option>)}</select>
          </Field>
          <Field label="有效期至"><input value={validTo} onChange={(e) => setValidTo(e.target.value)} /></Field>
          <Btn sm onClick={() => Taowo.createFuturesFromSpot(fromId, validTo, "期货 45 天")}>生成预售</Btn>
        </div>
      )}
      <details style={{ marginBottom: 16 }}>
        <summary>CSV 导入</summary>
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} />
        <input type="file" accept=".csv,.txt" onChange={(e) => {
          const file = e.target.files[0];
          if (!file) return;
          const r = new FileReader();
          r.onload = () => setCsv(String(r.result));
          r.readAsText(file);
        }} />
        <Btn sm onClick={() => Taowo.importProducts(csv)}>导入商品</Btn>
      </details>
      <DataTable onRow={(r) => setEdit({ ...r })} columns={cols} rows={rows} />
      {edit && (
        <Modal title={edit.id} onClose={() => setEdit(null)} footer={<Btn onClick={() => { Taowo.upsertProduct(edit); setEdit(null); }}>保存</Btn>}>
          <Field label="名称"><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
          <Field label="批发价"><input type="number" value={edit.price} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value) })} /></Field>
          {edit.type === "futures" && (
            <>
              <Field label="有效期至"><input value={edit.validTo || ""} onChange={(e) => setEdit({ ...edit, validTo: e.target.value })} /></Field>
              <Field label="交期"><input value={edit.lead} onChange={(e) => setEdit({ ...edit, lead: e.target.value })} /></Field>
            </>
          )}
          {edit.type === "spot" && <p className="muted">现货不设有效期。</p>}
        </Modal>
      )}
    </div>
  );
}

function StockOps({ s }) {
  const [text, setText] = useState("仓库,款号,尺码,可订量\n华东仓,TW-1001,42,30\n华南仓,TW-1005,M,12");
  const [wh, setWh] = useState({ name: "", city: "", sync: "手动" });
  function parse(raw) {
    const lines = raw.trim().split(/\r?\n/).filter(Boolean);
    const header = (lines.shift() || "").split(/[,	]/).map((x) => x.trim());
    const iWh = header.findIndex((h) => /仓库/.test(h));
    const iPid = header.findIndex((h) => /款号/.test(h));
    const iSize = header.findIndex((h) => /尺码/.test(h));
    const iQty = header.findIndex((h) => /可订|数量/.test(h));
    if (iPid < 0 || iSize < 0 || iQty < 0) return null;
    return lines.map((row) => {
      const c = row.split(/[,	]/);
      return { warehouse: iWh >= 0 ? (c[iWh] || "").trim() : "", pid: (c[iPid] || "").trim(), size: (c[iSize] || "").trim(), qty: Number(c[iQty] || 0) };
    });
  }
  return (
    <div>
      <div className="hrow"><div><h1>仓库库存</h1><p>创建仓库；下载模板后上传导入可订量</p></div>
        <Btn sm ghost onClick={() => Taowo.runSync("可订量")}>同步库存</Btn>
      </div>
      <div className="row" style={{ alignItems: "end", marginBottom: 16 }}>
        <Field label="仓库名"><input value={wh.name} onChange={(e) => setWh({ ...wh, name: e.target.value })} /></Field>
        <Field label="城市"><input value={wh.city} onChange={(e) => setWh({ ...wh, city: e.target.value })} /></Field>
        <Btn sm onClick={() => { Taowo.createWarehouse(wh); setWh({ name: "", city: "", sync: "手动" }); }}>创建仓库</Btn>
      </div>
      <DataTable columns={[{ key: "id", title: "仓库" }, { key: "name", title: "名称" }, { key: "city", title: "城市" }, { key: "skus", title: "SKU" }, { key: "sync", title: "频率" }]} rows={s.warehouses} />
      <div className="row" style={{ margin: "16px 0" }}>
        <Btn sm ghost onClick={() => downloadText("库存导入模板.csv", "仓库,款号,尺码,可订量\n华东仓,TW-1001,42,30\n华南仓,TW-1005,M,12", "text/csv")}>下载模板</Btn>
        <input type="file" accept=".csv,.txt" onChange={(e) => {
          const file = e.target.files[0];
          if (!file) return;
          const r = new FileReader();
          r.onload = () => setText(String(r.result));
          r.readAsText(file);
        }} />
      </div>
      <Field label="模板内容"><textarea value={text} onChange={(e) => setText(e.target.value)} /></Field>
      <Btn sm onClick={() => {
        const rows = parse(text);
        if (!rows) return Taowo.toast("模板需含：款号、尺码、可订量", "err");
        Taowo.importStock(rows);
      }}>上传导入</Btn>
    </div>
  );
}

function ImageOps({ s }) {
  const folders = s.mediaFolders || [];
  const [folder, setFolder] = useState(folders[0]?.id || "");
  const [view, setView] = useState("grid");
  const [sel, setSel] = useState([]);
  const [name, setName] = useState("新文件夹");
  const [lastMatch, setLastMatch] = useState([]);
  const rows = (s.media || []).filter((m) => !folder || m.folderId === folder);
  function ingest(list) {
    const result = Taowo.matchImages(list, folder);
    setLastMatch(result);
    const ok = result.filter((x) => x.ok).length;
    Taowo.toast("已导入，匹配款号 " + ok + " / " + result.length);
  }
  function readFiles(list) {
    const files = Array.from(list || []);
    const zips = files.filter((f) => /\.zip$/i.test(f.name));
    const imgs = files.filter((f) => !/\.zip$/i.test(f.name));
    zips.forEach((file) => {
      if (!window.JSZip) {
        Taowo.toast("ZIP 解压库未加载，请改用文件夹导入", "err");
        return;
      }
      window.JSZip.loadAsync(file).then((zip) => {
        const jobs = [];
        zip.forEach((path, entry) => {
          if (entry.dir || !/\.(png|jpe?g|webp|gif|bmp)$/i.test(path)) return;
          const fname = path.split("/").pop();
          jobs.push(entry.async("base64").then((b64) => {
            const ext = (fname.split(".").pop() || "jpeg").toLowerCase().replace("jpg", "jpeg");
            return { name: fname, url: "data:image/" + ext + ";base64," + b64 };
          }));
        });
        return Promise.all(jobs);
      }).then((found) => {
        if (!found.length) return Taowo.toast("压缩包里没有图片", "err");
        ingest(found);
      }).catch(() => Taowo.toast("ZIP 无法解压", "err"));
    });
    if (imgs.length) {
      const pending = [];
      imgs.forEach((f) => {
        const r = new FileReader();
        r.onload = () => {
          pending.push({ name: f.name, url: String(r.result) });
          if (pending.length === imgs.length) ingest(pending);
        };
        r.readAsDataURL(f);
      });
    }
  }
  return (
    <div>
      <div className="hrow"><div><h1>图片管理</h1><p>文件夹、本地/ZIP/文件夹导入。ZIP 会解压，文件名含款号则自动匹配商品。支持矩阵和列表、批量删除。</p></div></div>
      <div className="row" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <Field label="文件夹">
          <select value={folder} onChange={(e) => setFolder(e.target.value)}>
            <option value="">全部</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="新建"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Btn sm onClick={() => Taowo.createMediaFolder(name)}>创建文件夹</Btn>
        <Btn sm ghost onClick={() => setView(view === "grid" ? "list" : "grid")}>{view === "grid" ? "列表" : "矩阵"}</Btn>
        <Btn sm danger disabled={!sel.length} onClick={() => { Taowo.deleteMedia(sel); setSel([]); }}>批量删除</Btn>
      </div>
      <div className="row" style={{ marginBottom: 16 }}>
        <label className="btn sm ghost">本地导入<input type="file" multiple accept="image/*,.zip" hidden onChange={(e) => readFiles(e.target.files)} /></label>
        <label className="btn sm ghost">文件夹导入<input type="file" webkitdirectory="" directory="" multiple hidden onChange={(e) => readFiles(e.target.files)} /></label>
      </div>
      {view === "list" ? (
        <DataTable
          columns={[
            { key: "ck", title: "", render: (r) => <input type="checkbox" checked={sel.includes(r.id)} onChange={() => setSel(sel.includes(r.id) ? sel.filter((x) => x !== r.id) : sel.concat(r.id))} /> },
            { key: "pic", title: "图", render: (r) => <div className="ops-thumb"><img src={r.src} alt="" /></div> },
            { key: "name", title: "文件" },
            { key: "pid", title: "款号" },
            { key: "kind", title: "类型" },
            { key: "year", title: "年份" },
          ]}
          rows={rows}
        />
      ) : (
        <div className="media-grid">
          {rows.map((m) => (
            <label key={m.id} className={"media-cell" + (sel.includes(m.id) ? " on" : "")}>
              <input type="checkbox" checked={sel.includes(m.id)} onChange={() => setSel(sel.includes(m.id) ? sel.filter((x) => x !== m.id) : sel.concat(m.id))} />
              <img src={m.src} alt={m.name} />
              <span>{m.name}</span>
            </label>
          ))}
        </div>
      )}
      {lastMatch.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 500, marginBottom: 8 }}>最近导入匹配</h2>
          <DataTable columns={[{ key: "name", title: "文件" }, { key: "pid", title: "款号" }, { key: "ok", title: "结果", render: (r) => r.ok ? "已匹配" : "未匹配" }]} rows={lastMatch} />
        </div>
      )}
    </div>
  );
}

function OrderOps({ s }) {
  const [tab, setTab] = useState("all");
  const rows = s.orders.filter((o) => o.type !== "erp").filter((o) => tab === "all" || o.type === tab);
  return (
    <div>
      <div className="hrow"><div><h1>订购单</h1><p>全部订购单单行列表，现货 / 期货分列。点进详情审核、改款或发货。</p></div></div>
      <div className="tabs">
        {[["all", "全部"], ["spot", "现货"], ["futures", "期货"]].map(([k, n]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{n}</button>
        ))}
      </div>
      <DataTable
        onRow={(r) => go("/ops/orders/" + r.id)}
        columns={[
          { key: "id", title: "单号" },
          { key: "type", title: "类型", render: (r) => r.type === "futures" ? "期货" : "现货" },
          { key: "dealerId", title: "经销商" },
          { key: "status", title: "阶段", render: (r) => statusLabel(r.status) },
          { key: "created", title: "提交" },
          { key: "amt", title: "金额", render: (r) => Money(Taowo.lineAmount(r.lines)) },
        ]}
        rows={rows}
      />
    </div>
  );
}

function OrderDetailOps({ s, id }) {
  const o = s.orders.find((x) => x.id === id);
  const [pid, setPid] = useState("");
  const [size, setSize] = useState("");
  const [qty, setQty] = useState("1");
  const [express, setExpress] = useState("顺丰");
  const [tracking, setTracking] = useState("SF" + Date.now().toString().slice(-10));
  const [csv, setCsv] = useState("款号,尺码,本次发货\nTW-1002,40,4");
  if (!o) return <Empty title="订购单不存在" action={<Btn onClick={() => go("/ops/orders")}>返回</Btn>} />;
  const groups = groupOrderLines(o.lines);
  const editable = o.status === "pending_review";
  const canShip = o.status === "active" || o.status === "partial";
  function setSizeQty(p, sz, val) {
    const n = Number(val) || 0;
    const next = [];
    groups.forEach((g) => {
      const prod = Taowo.product(g.pid);
      const sizes = prod?.sizes || g.items.map((i) => i.size);
      sizes.forEach((z) => {
        const current = g.pid === p && z === sz ? n : qtyOfSize(g.items, z);
        if (current > 0) {
          const old = g.items.find((i) => i.size === z);
          next.push({ pid: g.pid, size: z, qty: current, price: old?.price || prod?.price, shipped: old?.shipped || 0 });
        }
      });
    });
    Taowo.updateOrderLines(o.id, next);
  }
  return (
    <div>
      <div className="hrow">
        <div>
          <h1>{o.id}</h1>
          <p>{o.type === "futures" ? "期货" : "现货"} · {statusLabel(o.status)} · {o.dealerId} · {o.created}</p>
        </div>
        <Btn sm ghost onClick={() => go("/ops/orders")}>返回列表</Btn>
      </div>
      <p className="muted">{o.address} · {o.remark || "无备注"}</p>
      <table className="data">
        <thead><tr><th>图</th><th>款号</th><th>名称</th><th>尺码分列</th>{editable ? <th></th> : null}</tr></thead>
        <tbody>
          {groups.map((g) => {
            const p = Taowo.product(g.pid);
            const sizes = p?.sizes || g.items.map((i) => i.size);
            return (
              <tr key={g.pid}>
                <td><div className="ops-thumb"><Photo src={productThumb(p)} alt="" color={p?.color} /></div></td>
                <td>{g.pid}</td>
                <td>{p?.name}</td>
                <td>
                  <div className="sizegrid compact">
                    {sizes.map((sz) => (
                      <div className="size" key={sz}>
                        <b>{sz}</b>
                        {editable
                          ? <input value={qtyOfSize(g.items, sz) || ""} onChange={(e) => setSizeQty(g.pid, sz, e.target.value.replace(/[^\d]/g, ""))} />
                          : <span>{qtyOfSize(g.items, sz) || 0}{g.items.find((i) => i.size === sz)?.shipped ? " / 已发 " + g.items.find((i) => i.size === sz).shipped : ""}</span>}
                      </div>
                    ))}
                  </div>
                </td>
                {editable ? <td><button onClick={() => Taowo.removeOrderPid(o.id, g.pid)}>删款</button></td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
      {editable && (
        <div className="row" style={{ margin: "16px 0", alignItems: "end" }}>
          <Field label="增款号"><input value={pid} onChange={(e) => setPid(e.target.value)} placeholder="TW-1004" /></Field>
          <Field label="尺码"><input value={size} onChange={(e) => setSize(e.target.value)} placeholder="L" /></Field>
          <Field label="数量"><input value={qty} onChange={(e) => setQty(e.target.value)} /></Field>
          <Btn sm onClick={() => Taowo.addOrderLine(o.id, pid, size, qty)}>增加</Btn>
          <Btn sm onClick={() => Taowo.reviewOrder(o.id, "approve", { lines: o.lines })}>通过</Btn>
          <Btn sm danger onClick={() => Taowo.reviewOrder(o.id, "reject", "请修改后重新提交")}>驳回（退回购物袋）</Btn>
        </div>
      )}
      {canShip && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>待发货 · 手工发货单</h2>
          <p className="muted">必须填写发货单号。可一次全发，或按模板分批发货；超量会拦截。</p>
          <div className="row" style={{ alignItems: "end" }}>
            <Field label="承运"><input value={express} onChange={(e) => setExpress(e.target.value)} /></Field>
            <Field label="发货单号"><input value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
            <Btn sm onClick={() => Taowo.shipAll(o.id, express, tracking)}>全部发货</Btn>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <Btn sm ghost onClick={() => {
              const header = "款号,尺码,本次发货";
              const body = o.lines.map((l) => [l.pid, l.size, l.qty - (l.shipped || 0)].join(","));
              downloadText("发货模板-" + o.id + ".csv", [header, ...body].join("\n"), "text/csv");
            }}>下载发货模板</Btn>
            <input type="file" accept=".csv,.txt" onChange={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              const r = new FileReader();
              r.onload = () => setCsv(String(r.result));
              r.readAsText(file);
            }} />
          </div>
          <Field label="分批导入"><textarea value={csv} onChange={(e) => setCsv(e.target.value)} /></Field>
          <Btn sm onClick={() => Taowo.shipFromCsv(o.id, csv, express, tracking)}>校验并生成发货单</Btn>
        </div>
      )}
      <h2 style={{ margin: "28px 0 12px", fontSize: 20, fontWeight: 500 }}>轨迹</h2>
      {o.history.map((h, i) => <div key={i} className="muted">{h.t} · {h.e}</div>)}
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
  return (
    <div>
      <div className="hrow"><div><h1>发货交付</h1><p>只列出已生成的发货单。手工开单在订购单详情的待发货阶段完成。</p></div></div>
      <DataTable
        onRow={(r) => go("/ops/ship/" + r.id)}
        columns={[
          { key: "id", title: "发货单" },
          { key: "orderId", title: "订购单" },
          { key: "date", title: "日期" },
          { key: "express", title: "承运" },
          { key: "tracking", title: "发货单号" },
          { key: "status", title: "状态", render: (r) => statusLabel(r.status) },
        ]}
        rows={s.shipments}
      />
    </div>
  );
}

function ShipDetail({ s, id }) {
  const sh = s.shipments.find((x) => x.id === id);
  if (!sh) return <Empty title="发货单不存在" action={<Btn onClick={() => go("/ops/ship")}>返回</Btn>} />;
  const tracks = s.tracks[sh.tracking] || [];
  return (
    <div>
      <div className="hrow">
        <div><h1>{sh.id}</h1><p>{sh.orderId} · {sh.date} · {sh.express} {sh.tracking}</p></div>
        <Btn sm ghost onClick={() => go("/ops/ship")}>返回列表</Btn>
      </div>
      <table className="data">
        <thead><tr><th>款号</th><th>尺码</th><th>本次发货</th></tr></thead>
        <tbody>{sh.lines.map((l, i) => <tr key={i}><td>{l.pid}</td><td>{l.size}</td><td>{l.qty}</td></tr>)}</tbody>
      </table>
      <h2 style={{ margin: "24px 0 8px", fontSize: 20, fontWeight: 500 }}>物流</h2>
      {tracks.length ? tracks.map((t, i) => <div key={i} className="muted">{t.t} {t.e}</div>) : <p className="muted">暂无轨迹</p>}
    </div>
  );
}

function WishOps({ s }) {
  const rows = (s.wishlist || []).map((w, i) => ({ ...w, id: w.pid + "-" + w.size + "-" + i }));
  return (
    <div>
      <div className="hrow"><div><h1>心愿单</h1><p>经销商缺货尺码登记。点进详情查看数量与到货提醒。</p></div></div>
      <DataTable
        onRow={(r) => go("/ops/wish/" + encodeURIComponent(r.id))}
        columns={[
          { key: "pid", title: "款号" },
          { key: "size", title: "尺码" },
          { key: "qty", title: "数量" },
          { key: "dealerId", title: "经销商" },
          { key: "note", title: "说明" },
          { key: "time", title: "时间" },
        ]}
        rows={rows}
      />
    </div>
  );
}

function WishDetail({ s, id }) {
  const rows = (s.wishlist || []).map((w, i) => ({ ...w, id: w.pid + "-" + w.size + "-" + i }));
  const w = rows.find((x) => x.id === decodeURIComponent(id));
  if (!w) return <Empty title="心愿单不存在" action={<Btn onClick={() => go("/ops/wish")}>返回</Btn>} />;
  const p = Taowo.product(w.pid);
  return (
    <div>
      <div className="hrow">
        <div><h1>{w.pid} · {w.size}</h1><p>{p?.name} · {w.dealerId}</p></div>
        <Btn sm ghost onClick={() => go("/ops/wish")}>返回列表</Btn>
      </div>
      <div className="kvs">
        <i>数量</i><b>{w.qty || 1}</b>
        <i>说明</i><b>{w.note}</b>
        <i>时间</i><b>{w.time}</b>
        <i>可订</i><b>{p ? (p.stock[w.size] || 0) : "—"}</b>
      </div>
      <div style={{ marginTop: 16 }}><Btn sm onClick={() => Taowo.restockNotice(w.pid)}>模拟到货提醒</Btn></div>
    </div>
  );
}

function ReturnOps({ s }) {
  return (
    <div>
      <div className="hrow"><div><h1>退货</h1><p>行列表进入详情后通过或驳回</p></div></div>
      <DataTable
        onRow={(r) => go("/ops/returns/" + r.id)}
        columns={[
          { key: "id", title: "退货单" },
          { key: "orderId", title: "原订购单" },
          { key: "dealerId", title: "经销商" },
          { key: "reason", title: "原因" },
          { key: "status", title: "状态", render: (r) => statusLabel(r.status) },
        ]}
        rows={s.returns}
      />
    </div>
  );
}

function ReturnDetail({ s, id }) {
  const r = s.returns.find((x) => x.id === id);
  if (!r) return <Empty title="退货单不存在" action={<Btn onClick={() => go("/ops/returns")}>返回</Btn>} />;
  return (
    <div>
      <div className="hrow">
        <div><h1>{r.id}</h1><p>{r.orderId} · {statusLabel(r.status)}</p></div>
        <Btn sm ghost onClick={() => go("/ops/returns")}>返回列表</Btn>
      </div>
      <div className="kvs">
        <i>经销商</i><b>{r.dealerId}</b>
        <i>原因</i><b>{r.reason}</b>
        <i>明细</i><b>{(r.lines || []).map((l) => l.pid + " " + l.size + "×" + l.qty).join("，") || "—"}</b>
      </div>
      {r.status === "pending" ? (
        <div className="row" style={{ marginTop: 16 }}>
          <Btn sm onClick={() => Taowo.reviewReturn(r.id, "approved")}>通过</Btn>
          <Btn sm danger onClick={() => Taowo.reviewReturn(r.id, "rejected")}>驳回</Btn>
        </div>
      ) : <p className="muted" style={{ marginTop: 16 }}>已处理。</p>}
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
      <div className="hrow"><div><h1>日志</h1><p>登录、商品上架、商品下架、审核。上下架同时写入商品操作记录。</p></div></div>
      <div className="chips">
        {["", "登录", "商品上架", "商品下架", "审核", "导入", "修改"].map((t) => <button key={t || "all"} className={"chip " + (type === t ? "on" : "")} onClick={() => setType(t)}>{t || "全部"}</button>)}
      </div>
      <DataTable columns={[{ key: "time", title: "时间" }, { key: "user", title: "人员" }, { key: "type", title: "类型" }, { key: "result", title: "结果" }, { key: "ip", title: "IP" }]} rows={rows} />
      <h2 style={{ fontSize: 20, margin: "28px 0 12px", fontWeight: 500 }}>商品上下架记录</h2>
      <DataTable columns={[{ key: "t", title: "时间" }, { key: "user", title: "人" }, { key: "action", title: "动作" }, { key: "target", title: "对象" }]} rows={s.productLogs} />
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

function OpsApp({ s, path, parts }) {
  if (!s.session || String(s.session.role).startsWith("dealer")) return <LoginView portal="ops" />;
  const id = parts && parts[2];
  let body = null;
  if (path === "/ops") body = <OpsToday s={s} />;
  else if (path === "/ops/cms" || path === "/ops/home") body = <CmsView s={s} />;
  else if (path === "/ops/dealers") body = <DealersView s={s} />;
  else if (path === "/ops/apply") body = <ApplyOps s={s} />;
  else if (path.startsWith("/ops/apply/") && id) body = <ApplyDetail s={s} id={id} />;
  else if (path === "/ops/accounts") body = <AccountsOps s={s} />;
  else if (path.startsWith("/ops/accounts/") && id) body = <AccountBindDetail s={s} id={id} />;
  else if (path === "/ops/master") body = <MasterView s={s} />;
  else if (path.startsWith("/ops/products")) body = <ProductsOps s={s} type={path.indexOf("futures") >= 0 ? "futures" : "spot"} />;
  else if (path === "/ops/stock") body = <StockOps s={s} />;
  else if (path === "/ops/images" || path === "/ops/media" || path === "/ops/batch") body = <ImageOps s={s} />;
  else if (path === "/ops/orders" || path === "/ops/review") body = <OrderOps s={s} />;
  else if (path.startsWith("/ops/orders/") && id) body = <OrderDetailOps s={s} id={id} />;
  else if (path === "/ops/erp-orders") body = <ErpOrders s={s} />;
  else if (path === "/ops/ship") body = <ShipOps s={s} />;
  else if (path.startsWith("/ops/ship/") && id) body = <ShipDetail s={s} id={id} />;
  else if (path === "/ops/wish" || path === "/ops/requests") body = <WishOps s={s} />;
  else if (path.startsWith("/ops/wish/") && id) body = <WishDetail s={s} id={id} />;
  else if (path === "/ops/returns") body = <ReturnOps s={s} />;
  else if (path.startsWith("/ops/returns/") && id) body = <ReturnDetail s={s} id={id} />;
  else if (path === "/ops/pay") body = <PayOps s={s} />;
  else if (path === "/ops/contracts") body = <ContractOps s={s} />;
  else if (path === "/ops/statements") body = <StatementOps s={s} />;
  else if (path === "/ops/campaigns") body = <CampaignOps s={s} />;
  else if (path === "/ops/reports") body = <ReportOps s={s} />;
  else if (path === "/ops/api") body = <ApiOps s={s} />;
  else if (path === "/ops/org") body = <OrgOps s={s} />;
  else if (path === "/ops/roles") body = <RoleOps s={s} />;
  else if (path === "/ops/logs") body = <LogOps s={s} />;
  else if (path === "/ops/dict") body = <DictOps s={s} />;
  else body = <OpsToday s={s} />;
  return <OpsShell s={s} path={path}>{body}</OpsShell>;
}

Object.assign(window, { OpsApp });
