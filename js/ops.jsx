const { useState } = React;
const { Icon, Photo, go, Btn, Field, Modal, Empty, Money, statusLabel, accountStatus, DataTable, downloadText, downloadUrl, readLocalFile, dealerName, Pager, GoodsLines, ImagePicker, ProductPickModal, LoginView, productThumb, groupOrderLines, qtyOfSize } = window;

function canSetOrgPassword() {
  return Taowo.hasPerm("sys.password") || Taowo.hasPerm("sys.*");
}

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
  const live = s.products.filter((p) => p.status === "live");
  const [device, setDevice] = useState("PC");
  const [nav, setNav] = useState((device === "H5" ? cms.h5Nav : cms.nav).join(" / "));
  const [productMenu, setProductMenu] = useState((cms.productMenu || []).map((x) => x.label + "|" + x.href).join("\n"));
  const [assetMenu, setAssetMenu] = useState((cms.assetMenu || []).map((x) => x.label + "|" + x.href).join("\n"));
  const [catNav, setCatNav] = useState((cms.categoryNav || []).map((x) => x.label + "|" + x.href).join("\n"));
  const [heroes, setHeroes] = useState((cms.hero || []).map((h) => ({ ...h })));
  const [banner, setBanner] = useState({ ...cms.banner });
  const [pickFloor, setPickFloor] = useState(null);
  const [floors, setFloors] = useState((cms.floors || []).map((f, i) => ({
    id: f.id || ("f" + (i + 1)),
    kind: f.kind || (f.img && !f.productIds ? "image" : "products"),
    title: f.title || "",
    href: f.href || "#/shop/spot",
    img: f.img || "",
    productIds: f.productIds ? f.productIds.slice() : [],
    query: f.query || null,
  })));
  function parseLinks(text) {
    return text.split(/\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const [label, href] = l.split("|").map((x) => (x || "").trim());
      return { label, href: href || "#/" };
    });
  }
  function setFloor(i, patch) {
    setFloors(floors.map((f, n) => n === i ? { ...f, ...patch } : f));
  }
  function publish() {
    const parts = nav.split(/[\/,，]/).map((x) => x.trim()).filter(Boolean);
    Taowo.saveCms({
      ...(device === "H5" ? { h5Nav: parts } : { nav: parts }),
      productMenu: parseLinks(productMenu),
      assetMenu: parseLinks(assetMenu),
      categoryNav: parseLinks(catNav),
      hero: heroes,
      floors: floors.map((f, i) => ({ ...f, id: f.id || ("f" + (i + 1)) })),
      banner,
    });
  }
  return (
    <div>
      <div className="hrow">
        <div><h1>页面装修</h1><p>商品楼层点「添加商品」弹窗筛选并批量勾选；轮播、专场和图片楼层支持本地上传或图片库。</p></div>
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
      <Field label="首页导航（产品 / 订单 / 资产，已合并到原分类行位置）"><textarea value={catNav} onChange={(e) => setCatNav(e.target.value)} rows={3} /></Field>
      <Field label="产品下拉（每行：名称|#锚点）"><textarea value={productMenu} onChange={(e) => setProductMenu(e.target.value)} rows={3} /></Field>
      <Field label="资产下拉（每行：名称|#锚点）"><textarea value={assetMenu} onChange={(e) => setAssetMenu(e.target.value)} rows={3} /></Field>
      <h2 style={{ fontSize: 18, margin: "24px 0 12px", fontWeight: 500 }}>首屏轮播</h2>
      {heroes.map((h, i) => (
        <div className="floor-card" key={i}>
          <div className="form-2">
            <Field label="标题"><input value={h.title} onChange={(e) => setHeroes(heroes.map((x, n) => n === i ? { ...x, title: e.target.value } : x))} /></Field>
            <Field label="说明"><input value={h.sub} onChange={(e) => setHeroes(heroes.map((x, n) => n === i ? { ...x, sub: e.target.value } : x))} /></Field>
            <Field label="链接"><input value={h.href} onChange={(e) => setHeroes(heroes.map((x, n) => n === i ? { ...x, href: e.target.value } : x))} /></Field>
          </div>
          <Field label="图片"><ImagePicker value={h.img} media={s.media} onChange={(img) => setHeroes(heroes.map((x, n) => n === i ? { ...x, img } : x))} /></Field>
        </div>
      ))}
      <h2 style={{ fontSize: 18, margin: "24px 0 12px", fontWeight: 500 }}>专场条</h2>
      <div className="floor-card">
        <div className="form-2">
          <Field label="标题"><input value={banner.title || ""} onChange={(e) => setBanner({ ...banner, title: e.target.value })} /></Field>
          <Field label="说明"><input value={banner.sub || ""} onChange={(e) => setBanner({ ...banner, sub: e.target.value })} /></Field>
          <Field label="链接"><input value={banner.href || ""} onChange={(e) => setBanner({ ...banner, href: e.target.value })} /></Field>
        </div>
        <Field label="图片"><ImagePicker value={banner.img} media={s.media} onChange={(img) => setBanner({ ...banner, img })} /></Field>
      </div>
      <div className="hrow" style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 500 }}>首页楼层</h2>
        <div className="row">
          <Btn sm ghost onClick={() => setFloors(floors.concat([{ id: "f" + Date.now(), kind: "products", title: "新商品楼层", productIds: [], href: "#/shop/spot", img: "" }]))}>加商品楼层</Btn>
          <Btn sm ghost onClick={() => setFloors(floors.concat([{ id: "f" + Date.now(), kind: "image", title: "新图片楼层", img: "", href: "#/shop/spot", productIds: [] }]))}>加图片楼层</Btn>
        </div>
      </div>
      {floors.map((f, i) => (
        <div className="floor-card" key={f.id}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b>{f.kind === "image" ? "图片楼层" : "商品楼层"}</b>
            <button className="linkish" onClick={() => setFloors(floors.filter((_, n) => n !== i))}>删除</button>
          </div>
          <Field label="标题"><input value={f.title} onChange={(e) => setFloor(i, { title: e.target.value })} /></Field>
          {f.kind === "image" ? (
            <>
              <Field label="链接"><input value={f.href} onChange={(e) => setFloor(i, { href: e.target.value })} /></Field>
              <Field label="图片"><ImagePicker value={f.img} media={s.media} onChange={(img) => setFloor(i, { img })} /></Field>
            </>
          ) : (
            <div style={{ marginTop: 8 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <Btn sm onClick={() => setPickFloor(i)}>添加商品</Btn>
                <span className="muted">已选 {(f.productIds || []).length} 款</span>
              </div>
              <div className="sel-prod">
                {(f.productIds || []).map((id) => {
                  const p = s.products.find((x) => x.id === id);
                  return (
                    <i key={id}>
                      {p?.nameZh || p?.name || id}
                      <button className="linkish" onClick={() => setFloor(i, { productIds: f.productIds.filter((x) => x !== id) })}>移除</button>
                    </i>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
      <p className="muted">发布后商城首页立即读取所选商品与图片。</p>
      {pickFloor != null && floors[pickFloor] && (
        <ProductPickModal
          title="添加楼层商品"
          products={live}
          dictionaries={s.dictionaries}
          value={floors[pickFloor].productIds || []}
          onClose={() => setPickFloor(null)}
          onConfirm={(ids) => {
            setFloor(pickFloor, { productIds: ids });
            setPickFloor(null);
          }}
        />
      )}
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
  const [tab, setTab] = useState("main");
  const [page, setPage] = useState(1);
  const pageSize = 3;
  const all = s.users.filter((u) => String(u.role).startsWith("dealer") && u.status !== "pending");
  const rows = all.filter((u) => tab === "sub" ? u.role === "dealer_sub" : u.role !== "dealer_sub");
  const slice = rows.slice((page - 1) * pageSize, page * pageSize);
  function runImport(text) {
    setReport(Taowo.importDealerAccounts(text));
  }
  return (
    <div>
      <div className="hrow">
        <div><h1>账号绑定</h1><p>主账号与子账号分页展示。绑定列显示企业名称，点进详情改绑档案。</p></div>
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
      <details style={{ marginBottom: 16 }}>
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
      <div className="tabs">
        <button className={tab === "main" ? "on" : ""} onClick={() => { setTab("main"); setPage(1); }}>主账号 {all.filter((u) => u.role !== "dealer_sub").length}</button>
        <button className={tab === "sub" ? "on" : ""} onClick={() => { setTab("sub"); setPage(1); }}>子账号 {all.filter((u) => u.role === "dealer_sub").length}</button>
      </div>
      <DataTable
        onRow={(r) => go("/ops/accounts/" + r.id)}
        columns={[
          { key: "account", title: "账号" },
          { key: "name", title: "姓名" },
          { key: "phone", title: "手机" },
          { key: "role", title: "角色", render: (r) => r.role === "dealer_sub" ? "子账号" : "主账号" },
          { key: "dealer", title: "绑定经销商", render: (r) => r.dealerId ? dealerName(s, r.dealerId) : "" },
          { key: "dealerId", title: "档案号", render: (r) => r.dealerId || "" },
          { key: "status", title: "状态", render: (r) => accountStatus(r.status) },
        ]}
        rows={slice}
      />
      <Pager page={page} total={rows.length} size={pageSize} onPage={setPage} />
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
  const [csv, setCsv] = useState(futures
    ? "款号,交期,期货有效期\nTW-1001,期货 45 天,2026-12-31\nTW-9999,期货 45 天,2026-12-31"
    : "款号,名称,年份,季节,品牌,大类,小类,性别,波次,价格,交期\nTW-1010,Street Jersey,2026,SS26,TAOWO,服装,球衣,中性,02,188,现货 5 天");
  const [validTo, setValidTo] = useState("2026-12-31");
  const [lead, setLead] = useState((s.dictionaries.futureLeads || ["期货 45 天"])[1] || "期货 45 天");
  const [pick, setPick] = useState(false);
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
  const rowIds = rows.map((r) => r.id);
  const allOn = rowIds.length > 0 && rowIds.every((id) => sel.includes(id));
  function toggleAll(e) {
    e.stopPropagation();
    setSel(allOn ? sel.filter((id) => !rowIds.includes(id)) : Array.from(new Set(sel.concat(rowIds))));
  }
  const cols = [
    {
      key: "ck",
      width: 36,
      title: <input type="checkbox" checked={allOn} onChange={toggleAll} title="全选当前筛选" />,
      render: (r) => <input type="checkbox" checked={sel.includes(r.id)} onClick={(e) => e.stopPropagation()} onChange={() => setSel(sel.includes(r.id) ? sel.filter((x) => x !== r.id) : sel.concat(r.id))} />,
    },
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
        <div>
          <h1>{futures ? "期货" : "现货"}</h1>
          <p>{futures ? "导入须平台已有现货款号；也可弹窗筛选批量预售。过期前台不可订。" : "现货无有效期。导入直接建档或更新。列表可全选删除。"}</p>
        </div>
        <div className="row">
          <Btn sm ghost onClick={() => Taowo.runSync("ERP 现货商品")}>ERP 同步</Btn>
          <Btn sm ghost onClick={() => {
            const header = futures ? "款号,交期,期货有效期" : "款号,名称,年份,季节,品牌,大类,小类,性别,波次,价格,交期";
            const body = (futures ? s.products.filter((p) => p.type === "spot") : s.products).map((p) => (
              futures
                ? [p.id, p.lead || "期货 45 天", validTo].join(",")
                : [p.id, p.name, p.year, p.season, p.brand, p.cat, p.sub, p.gender, p.wave, p.price, p.lead].join(",")
            ));
            downloadText(futures ? "期货导入模板.csv" : "商品导入模板.csv", [header, ...body].join("\n"), "text/csv");
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
        <Btn sm danger onClick={() => {
          if (!sel.length) return Taowo.toast("请先勾选商品", "err");
          Taowo.deleteProducts(sel);
          setSel([]);
        }}>删除商品</Btn>
        {futures && <Btn sm onClick={() => setPick(true)}>手动预售</Btn>}
      </div>
      {futures && (
        <div className="row" style={{ marginBottom: 12, alignItems: "end" }}>
          <Field label="预售有效期至"><input value={validTo} onChange={(e) => setValidTo(e.target.value)} /></Field>
          <Field label="默认交期">
            <select value={lead} onChange={(e) => setLead(e.target.value)}>
              {(s.dictionaries.futureLeads || ["期货 30 天", "期货 45 天", "期货 60 天"]).map((x) => <option key={x}>{x}</option>)}
            </select>
          </Field>
        </div>
      )}
      <div className="floor-card" style={{ marginBottom: 16 }}>
        <div className="hrow" style={{ marginBottom: 8 }}>
          <b>{futures ? "导入期货" : "导入商品"}</b>
          <span className="muted">{futures ? "表头须含款号。平台没有该现货款号会失败，不会凭空建期货。" : "可见导入，不只导出模板。新建现货或更新已有款。"}</span>
        </div>
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={5} />
        <div className="row" style={{ marginTop: 8 }}>
          <input type="file" accept=".csv,.txt" onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            const r = new FileReader();
            r.onload = () => setCsv(String(r.result));
            r.readAsText(file);
          }} />
          <Btn sm onClick={() => futures ? Taowo.importFutures(csv, validTo) : Taowo.importProducts(csv)}>导入商品</Btn>
        </div>
      </div>
      <DataTable onRow={(r) => go("/ops/products/" + (futures ? "futures" : "spot") + "/" + r.id)} columns={cols} rows={rows} />
      {pick && (
        <ProductPickModal
          title="手动预售 · 筛选并批量选择平台现货"
          products={s.products}
          dictionaries={s.dictionaries}
          value={[]}
          onlySpot
          onClose={() => setPick(false)}
          onConfirm={(ids) => {
            Taowo.createFuturesBatch(ids, validTo, lead);
            setPick(false);
          }}
        />
      )}
    </div>
  );
}

function ProductEdit({ s, id }) {
  const src = s.products.find((p) => p.id === id);
  const [edit, setEdit] = useState(src ? JSON.parse(JSON.stringify(src)) : null);
  if (!src || !edit) return <Empty title="商品不存在" action={<Btn onClick={() => go("/ops/products/spot")}>返回</Btn>} />;
  const d = s.dictionaries;
  function set(k, v) { setEdit({ ...edit, [k]: v }); }
  function save() {
    const sizes = String(edit.sizesText != null ? edit.sizesText : (edit.sizes || []).join(",")).split(/[,，\s]+/).filter(Boolean);
    const stock = { ...(edit.stock || {}) };
    sizes.forEach((sz) => { if (stock[sz] == null) stock[sz] = 0; });
    Taowo.upsertProduct({
      ...edit,
      sizes,
      stock,
      price: Number(edit.price) || 0,
      retail: Number(edit.retail) || 0,
      year: Number(edit.year) || 2026,
      orderable: edit.orderable === true || edit.orderable === "true",
      fair: edit.fair === true || edit.fair === "true",
      images: Array.isArray(edit.images) ? edit.images : String(edit.images || "").split(/[,，\s]+/).filter(Boolean),
    });
    go("/ops/products/" + (edit.type === "futures" ? "futures" : "spot"));
  }
  const text = ["id", "name", "nameZh", "brand", "ip", "cat", "sub", "series", "season", "gender", "wave", "lead", "warehouse", "color", "colorName", "badge", "video", "desc"];
  const labels = { id: "款号", name: "英文名", nameZh: "中文名", brand: "品牌", ip: "IP", cat: "大类", sub: "小类", series: "系列", season: "季节", gender: "性别", wave: "波次", lead: "交期", warehouse: "仓库", color: "色值", colorName: "色名", badge: "角标", video: "视频", desc: "描述" };
  return (
    <div>
      <div className="hrow">
        <div><h1>{edit.id}</h1><p>现货 / 期货全部字段，保存后商城立即读取。</p></div>
        <div className="row">
          <Btn sm ghost onClick={() => go("/ops/products/" + (edit.type === "futures" ? "futures" : "spot"))}>返回列表</Btn>
          <Btn sm onClick={save}>保存</Btn>
        </div>
      </div>
      <div className="form-2">
        {text.map((k) => (
          <Field key={k} label={labels[k]}>
            {k === "desc" ? <textarea rows={3} value={edit[k] || ""} onChange={(e) => set(k, e.target.value)} /> : <input value={edit[k] || ""} onChange={(e) => set(k, e.target.value)} />}
          </Field>
        ))}
        <Field label="类型">
          <select value={edit.type} onChange={(e) => set("type", e.target.value)}>
            <option value="spot">现货</option>
            <option value="futures">期货</option>
          </select>
        </Field>
        <Field label="年份"><input type="number" value={edit.year || ""} onChange={(e) => set("year", e.target.value)} /></Field>
        <Field label="批发价"><input type="number" value={edit.price} onChange={(e) => set("price", e.target.value)} /></Field>
        <Field label="建议零售"><input type="number" value={edit.retail || ""} onChange={(e) => set("retail", e.target.value)} /></Field>
        <Field label="上下架">
          <select value={edit.status} onChange={(e) => set("status", e.target.value)}>
            <option value="live">在售</option>
            <option value="off">下架</option>
          </select>
        </Field>
        <Field label="可订">
          <select value={String(!!edit.orderable)} onChange={(e) => set("orderable", e.target.value === "true")}>
            <option value="true">可订</option>
            <option value="false">不可订</option>
          </select>
        </Field>
        <Field label="订货会">
          <select value={String(!!edit.fair)} onChange={(e) => set("fair", e.target.value === "true")}>
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        </Field>
        <Field label="评分"><input value={edit.rating || ""} onChange={(e) => set("rating", e.target.value)} /></Field>
        <Field label="评价数"><input value={edit.reviews || ""} onChange={(e) => set("reviews", e.target.value)} /></Field>
        {edit.type === "futures" && (
          <>
            <Field label="有效期自"><input value={edit.validFrom || ""} onChange={(e) => set("validFrom", e.target.value)} /></Field>
            <Field label="有效期至"><input value={edit.validTo || ""} onChange={(e) => set("validTo", e.target.value)} /></Field>
          </>
        )}
        <Field label="尺码（逗号分隔）"><input value={edit.sizesText != null ? edit.sizesText : (edit.sizes || []).join(",")} onChange={(e) => set("sizesText", e.target.value)} /></Field>
        <Field label="图片 URL（逗号分隔）"><input value={Array.isArray(edit.images) ? edit.images.join(",") : (edit.images || "")} onChange={(e) => set("images", e.target.value.split(/[,，\s]+/).filter(Boolean))} /></Field>
      </div>
      <h2 style={{ fontSize: 18, margin: "24px 0 12px", fontWeight: 500 }}>各尺码库存</h2>
      <div className="form-2">
        {(edit.sizesText != null ? edit.sizesText.split(/[,，\s]+/).filter(Boolean) : (edit.sizes || [])).map((sz) => (
          <Field key={sz} label={sz}>
            <input type="number" value={(edit.stock && edit.stock[sz]) || 0} onChange={(e) => setEdit({ ...edit, stock: { ...(edit.stock || {}), [sz]: Number(e.target.value) || 0 } })} />
          </Field>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 12 }}>字典可选：{(d.brands || []).join(" / ")}</p>
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
      <GoodsLines lines={sh.lines} />
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
          { key: "img", title: "图", render: (r) => { const p = Taowo.product(r.pid); return <div className="goods-thumb"><Photo src={productThumb(p)} alt={p?.name} color={p?.color} /></div>; } },
          { key: "pid", title: "款号" },
          { key: "name", title: "名称", render: (r) => Taowo.product(r.pid)?.name || "" },
          { key: "size", title: "尺码" },
          { key: "qty", title: "数量" },
          { key: "dealerId", title: "经销商", render: (r) => dealerName(s, r.dealerId) },
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
      <GoodsLines lines={[{ pid: w.pid, size: w.size, qty: w.qty || 1 }]} />
      <div className="kvs" style={{ marginTop: 16 }}>
        <i>经销商</i><b>{dealerName(s, w.dealerId)}</b>
        <i>说明</i><b>{w.note}</b>
        <i>时间</i><b>{w.time}</b>
        <i>当前可订</i><b>{p ? (p.stock[w.size] || 0) : "—"}</b>
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
        <i>经销商</i><b>{dealerName(s, r.dealerId)}</b>
        <i>原因</i><b>{r.reason}</b>
      </div>
      <h2 style={{ fontSize: 18, margin: "20px 0 8px", fontWeight: 500 }}>商品明细</h2>
      <GoodsLines lines={r.lines || []} />
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
  const types = s.dictionaries.contractTypes || ["框架合同", "期货合同", "现货合同", "补充协议"];
  const quarters = s.dictionaries.quarters || ["2026Q3", "2026Q4"];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    dealerId: s.dealers[0]?.id || "",
    kind: types[0],
    quarter: quarters[2] || quarters[0],
    title: "",
    fileName: "",
    fileUrl: "",
    mime: "",
  });
  function upload(file) {
    if (!file) return;
    readLocalFile(file, (url, mime, name) => setForm({ ...form, fileUrl: url, mime, fileName: name }), /pdf|image\/|png|jpe?g|webp|html/i);
  }
  function resetForm() {
    setForm({ dealerId: s.dealers[0]?.id || "", kind: types[0], quarter: quarters[2] || quarters[0], title: "", fileName: "", fileUrl: "", mime: "" });
  }
  return (
    <div>
      <div className="hrow">
        <div><h1>合同</h1><p>本页只列已有合同。创建走右上角弹窗，不在列表页铺表单。</p></div>
        <Btn sm onClick={() => setOpen(true)}>创建合同</Btn>
      </div>
      <DataTable
        onRow={(r) => go("/ops/contracts/" + r.id)}
        columns={[
          { key: "dealer", title: "经销商名称", render: (r) => dealerName(s, r.dealerId) },
          { key: "kind", title: "合同类型", render: (r) => r.kind || r.type || "" },
          { key: "quarter", title: "季度", render: (r) => r.quarter || "" },
          { key: "title", title: "名称" },
          { key: "fileName", title: "文件" },
          { key: "status", title: "状态" },
        ]}
        rows={s.contracts}
      />
      {open && (
        <Modal title="创建合同" onClose={() => setOpen(false)} footer={
          <div className="row">
            <Btn ghost sm onClick={() => setOpen(false)}>取消</Btn>
            <Btn sm onClick={() => {
              const row = Taowo.saveContract(form);
              if (row) {
                resetForm();
                setOpen(false);
              }
            }}>上传并创建</Btn>
          </div>
        }>
          <div className="form-2">
            <Field label="经销商">
              <select value={form.dealerId} onChange={(e) => setForm({ ...form, dealerId: e.target.value })}>
                {s.dealers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
            <Field label="合同类型">
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                {types.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="季度">
              <select value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })}>
                {quarters.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="名称"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="可空，默认类型+季度" /></Field>
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <label className="btn sm">选择本地文件
              <input type="file" accept=".pdf,image/*,.html,.txt" hidden onChange={(e) => { upload(e.target.files[0]); e.target.value = ""; }} />
            </label>
            <span className="muted">{form.fileName || "未选择文件则生成预览页"}</span>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ContractDetail({ s, id }) {
  const c = s.contracts.find((x) => x.id === id);
  if (!c) return <Empty title="合同不存在" action={<Btn onClick={() => go("/ops/contracts")}>返回</Btn>} />;
  const src = Taowo.contractSrc(c);
  return (
    <div>
      <div className="hrow">
        <div>
          <h1>{c.title || c.id}</h1>
          <p>{dealerName(s, c.dealerId)} · {c.kind || c.type} · {c.quarter}</p>
        </div>
        <div className="row">
          <Btn sm ghost onClick={() => downloadUrl(c.fileName || (c.id + ".html"), src)}>下载</Btn>
          <Btn sm ghost onClick={() => go("/ops/contracts")}>返回列表</Btn>
        </div>
      </div>
      {/^data:image\//.test(src) ? <img className="contract-view" src={src} alt="" /> : <iframe className="contract-view" title={c.id} src={src} />}
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
  const [password, setPassword] = useState("");
  const [org, setOrg] = useState(s.orgs[0]?.name);
  const [pwdUser, setPwdUser] = useState("");
  const [pwdNext, setPwdNext] = useState("");
  const canPwd = canSetOrgPassword();
  const opsUsers = s.users.filter((u) => !u.role.startsWith("dealer"));
  return (
    <div>
      <div className="hrow"><div><h1>组织与用户</h1><p>新建必须设密码；已创建的可改密。按钮跟随角色权限「设置密码」。</p></div></div>
      <DataTable columns={[{ key: "id", title: "组织" }, { key: "name", title: "名称" }, { key: "parent", title: "上级" }, { key: "people", title: "人数" }]} rows={s.orgs} />
      <h2 style={{ fontSize: 20, margin: "28px 0 12px", fontWeight: 500 }}>用户</h2>
      <DataTable columns={[
        { key: "account", title: "账号" }, { key: "name", title: "姓名" }, { key: "org", title: "组织" }, { key: "role", title: "角色" },
        { key: "status", title: "状态", render: (r) => statusLabel(r.status) },
        { key: "op", title: "", render: (r) => r.role.startsWith("dealer") ? null : (
          <span>
            <button onClick={() => Taowo.toggleUser(r.id)}>{r.status === "active" ? "停用" : "启用"}</button>
            {canPwd ? <button onClick={() => { setPwdUser(r.id); setPwdNext(""); }}>改密</button> : null}
          </span>
        ) },
      ]} rows={opsUsers} />
      <div className="row" style={{ marginTop: 16, alignItems: "end" }}>
        <Field label="姓名"><input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="账号"><input value={account} onChange={(e) => setAccount(e.target.value)} /></Field>
        <Field label="组织"><select value={org} onChange={(e) => setOrg(e.target.value)}>{s.orgs.map((o) => <option key={o.id}>{o.name}</option>)}</select></Field>
        {canPwd ? <Field label="初始密码"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="必填" /></Field> : <p className="muted">无设置密码权限，不能新建账号</p>}
        <Btn sm disabled={!canPwd} onClick={() => {
          Taowo.saveUser({ name, account, org, role: "ops_merch", password });
          setName(""); setAccount(""); setPassword("");
        }}>创建用户</Btn>
      </div>
      {canPwd && pwdUser && (
        <div className="row" style={{ marginTop: 16, alignItems: "end" }}>
          <Field label={"修改 " + (opsUsers.find((u) => u.id === pwdUser)?.account || "") + " 密码"}>
            <input type="password" value={pwdNext} onChange={(e) => setPwdNext(e.target.value)} />
          </Field>
          <Btn sm onClick={() => { if (Taowo.setUserPassword(pwdUser, pwdNext)) { setPwdUser(""); setPwdNext(""); } }}>保存新密码</Btn>
          <Btn sm ghost onClick={() => Taowo.resetPassword(pwdUser)}>重置为 123456</Btn>
        </div>
      )}
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
          <label style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
            <input type="checkbox" checked={picked.includes("*") || picked.includes("sys.*") || picked.includes("sys.password")} onChange={(e) => {
              setPicked(e.target.checked ? Array.from(new Set(picked.concat("sys.password"))) : picked.filter((p) => p !== "sys.password"));
            }} />
            <span>设置 / 修改组织用户密码</span>
          </label>
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
  const leaf = parts && parts[3];
  let body = null;
  if (path === "/ops") body = <OpsToday s={s} />;
  else if (path === "/ops/cms" || path === "/ops/home") body = <CmsView s={s} />;
  else if (path === "/ops/dealers") body = <DealersView s={s} />;
  else if (path === "/ops/apply") body = <ApplyOps s={s} />;
  else if (path.startsWith("/ops/apply/") && id) body = <ApplyDetail s={s} id={id} />;
  else if (path === "/ops/accounts") body = <AccountsOps s={s} />;
  else if (path.startsWith("/ops/accounts/") && id) body = <AccountBindDetail s={s} id={id} />;
  else if (path === "/ops/master") body = <MasterView s={s} />;
  else if (path.startsWith("/ops/products") && leaf) body = <ProductEdit s={s} id={leaf} />;
  else if (path.startsWith("/ops/products")) body = <ProductsOps key={path.indexOf("futures") >= 0 ? "futures" : "spot"} s={s} type={path.indexOf("futures") >= 0 ? "futures" : "spot"} />;
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
  else if (path.startsWith("/ops/contracts/") && id) body = <ContractDetail s={s} id={id} />;
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
