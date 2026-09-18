window.Taovo = (function () {
  const KEY = "taovo-b2b-proto-v2";
  const seed = window.TAOVO_SEED;

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return boot();
  }

  function boot() {
    const s = clone(seed);
    s.session = null;
    s.cart = [];
    s.toasts = [];
    s.ui = { search: "", bagOpen: false };
    s.importPreview = null;
    return s;
  }

  let state = load();
  const listeners = new Set();

  function persist() {
    const copy = clone(state);
    copy.toasts = [];
    localStorage.setItem(KEY, JSON.stringify(copy));
  }

  function emit() {
    persist();
    listeners.forEach((fn) => fn(state));
  }

  function set(patch) {
    if (typeof patch === "function") state = patch(state);
    else Object.assign(state, patch);
    emit();
  }

  function toast(text, kind) {
    const id = Date.now() + Math.random();
    state.toasts = [...(state.toasts || []), { id, text, kind: kind || "ok" }];
    emit();
    setTimeout(() => {
      state.toasts = (state.toasts || []).filter((t) => t.id !== id);
      emit();
    }, 2600);
  }

  function product(id) {
    return state.products.find((p) => p.id === id);
  }

  function isExpired(p, day) {
    if (!p || p.type !== "futures" || !p.validTo) return false;
    return p.validTo < (day || state.today);
  }

  function canOrder(p) {
    if (!p) return false;
    if (p.status !== "live" || !p.orderable) return false;
    if (isExpired(p)) return false;
    return true;
  }

  function lineAmount(lines) {
    return lines.reduce((n, l) => n + l.qty * l.price, 0);
  }

  function applyPromo(amount, items) {
    let off = 0;
    let label = [];
    const live = (state.campaigns || []).filter((c) => c.status === "live");
    live.forEach((c) => {
      if (c.type === "满减" && amount >= c.threshold) {
        off += c.value;
        label.push(c.name);
      }
      if (c.type === "满折") {
        const hit = items.some((it) => /Tee|Short/.test(product(it.pid)?.name || ""));
        if (hit) {
          const part = items
            .filter((it) => /Tee|Short/.test(product(it.pid)?.name || ""))
            .reduce((n, l) => n + l.qty * l.price, 0);
          off += Math.round(part * (1 - c.value));
          label.push(c.name);
        }
      }
    });
    const coupon = (state.coupons || []).find((c) => c.owned && amount >= c.min);
    if (coupon) {
      off += coupon.amount;
      label.push(coupon.name);
    }
    return { off, pay: Math.max(0, amount - off), label };
  }

  function hasPerm(key) {
    const u = state.session;
    if (!u) return false;
    const role = state.roles.find((r) => r.id === u.role);
    if (!role) return false;
    if (role.perms.includes("*")) return true;
    if (role.perms.includes(key)) return true;
    return role.perms.some((p) => p.endsWith(".*") && key.startsWith(p.slice(0, -1)));
  }

  const api = {
    get: () => state,
    on(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    toast,
    reset() {
      localStorage.removeItem(KEY);
      state = boot();
      emit();
      toast("演示数据已重置");
    },
    login(account, password, portal) {
      const u = state.users.find((x) => x.account === account && x.password === password && x.status === "active");
      if (!u) {
        state.logs.unshift({
          id: Date.now(),
          user: account,
          type: "登录",
          result: "失败",
          time: now(),
          ip: "10.2.1.3",
        });
        emit();
        return { ok: false, msg: "账号或密码不正确" };
      }
      const isDealer = u.role.startsWith("dealer");
      if (portal === "ops" && isDealer) return { ok: false, msg: "该账号没有运营后台权限" };
      if (portal === "mall" && !isDealer) return { ok: false, msg: "请使用经销商账号进入订货台" };
      state.session = clone(u);
      state.logs.unshift({
        id: Date.now(),
        user: u.name,
        type: "登录",
        result: "成功",
        time: now(),
        ip: "10.2.1.3",
      });
      emit();
      toast("欢迎回来，" + u.name);
      return { ok: true, user: u };
    },
    logout() {
      if (state.session) {
        state.logs.unshift({
          id: Date.now(),
          user: state.session.name,
          type: "退出",
          result: "成功",
          time: now(),
          ip: "10.2.1.3",
        });
      }
      state.session = null;
      emit();
    },
    product,
    canOrder,
    isExpired,
    hasPerm,
    addToBag(pid, sizeQty) {
      const p = product(pid);
      if (!canOrder(p)) {
        toast(isExpired(p) ? "期货已过有效期，不可加购" : "当前不可订购", "err");
        return false;
      }
      Object.entries(sizeQty).forEach(([size, qty]) => {
        qty = Number(qty) || 0;
        if (qty <= 0) return;
        const avail = (p.stock[size] || 0);
        if (qty > avail) {
          toast(size + " 可订量不足（" + avail + "）", "err");
          return;
        }
        const hit = state.cart.find((c) => c.pid === pid && c.size === size);
        if (hit) hit.qty += qty;
        else state.cart.push({ pid, size, qty, price: p.price, selected: true });
      });
      emit();
      toast("已加入购物袋");
      return true;
    },
    setCartQty(pid, size, qty) {
      qty = Math.max(0, Number(qty) || 0);
      const p = product(pid);
      if (p && qty > (p.stock[size] || 0)) qty = p.stock[size] || 0;
      state.cart = state.cart
        .map((c) => (c.pid === pid && c.size === size ? { ...c, qty } : c))
        .filter((c) => c.qty > 0);
      emit();
    },
    removeCart(pid, size) {
      state.cart = state.cart.filter((c) => !(c.pid === pid && c.size === size));
      emit();
    },
    toggleSelectCart(pid, size) {
      state.cart = state.cart.map((c) =>
        c.pid === pid && c.size === size ? { ...c, selected: c.selected === false } : c
      );
      emit();
    },
    selectAllCart(on) {
      state.cart = state.cart.map((c) => ({ ...c, selected: on }));
      emit();
    },
    removeSelectedCart() {
      state.cart = state.cart.filter((c) => c.selected === false);
      emit();
    },
    submitOrder({ address, remark, type, lines, payMethod }) {
      const items = (lines || state.cart.filter((c) => c.selected !== false)).map((c) => ({
        pid: c.pid,
        size: c.size,
        qty: c.qty,
        price: c.price,
        shipped: 0,
      }));
      if (!items.length) {
        toast("没有可提交的商品", "err");
        return null;
      }
      for (const l of items) {
        const p = product(l.pid);
        if (!canOrder(p)) {
          toast(p.id + " 当前不可订购", "err");
          return null;
        }
        if (l.qty > (p.stock[l.size] || 0)) {
          toast(p.id + " " + l.size + " 可订量不足", "err");
          return null;
        }
      }
      const id = "SO-" + String(Date.now()).slice(-8);
      const order = {
        id,
        dealerId: state.session.dealerId,
        type: type || (items.some((i) => product(i.pid).type === "futures") ? "futures" : "spot"),
        status: "pending_review",
        payStatus: "unpaid",
        payMethod: payMethod || "",
        created: now(),
        address,
        remark: remark || "",
        lines: items,
        history: [{ t: now(), e: "经销商提交订购单" }],
      };
      items.forEach((l) => {
        const p = product(l.pid);
        p.stock[l.size] = (p.stock[l.size] || 0) - l.qty;
      });
      state.orders.unshift(order);
      if (!lines) state.cart = state.cart.filter((c) => c.selected === false);
      state.logs.unshift({ id: Date.now(), user: state.session.name, type: "新增", result: "提交 " + id, time: now(), ip: "10.2.1.3" });
      emit();
      toast("订购单已提交，等待审核");
      return order;
    },
    reviewOrder(id, action, adjust) {
      const o = state.orders.find((x) => x.id === id);
      if (!o) return;
      if (action === "reject") {
        o.status = "rejected";
        o.history.push({ t: now(), e: "审核驳回" + (adjust ? "：" + adjust : "") });
        o.lines.forEach((l) => {
          const p = product(l.pid);
          if (p) p.stock[l.size] = (p.stock[l.size] || 0) + l.qty;
        });
      } else {
        if (adjust && adjust.lines) o.lines = adjust.lines;
        o.status = "active";
        o.history.push({ t: now(), e: "审核通过，订单生效" });
      }
      state.logs.unshift({
        id: Date.now(),
        user: state.session.name,
        type: "审核",
        result: id + " " + (action === "reject" ? "驳回" : "通过"),
        time: now(),
        ip: "10.2.1.3",
      });
      emit();
      toast(action === "reject" ? "已驳回" : "订单已生效");
    },
    payOrder(id, method, channelNo) {
      const o = state.orders.find((x) => x.id === id);
      if (!o) return;
      o.payStatus = "paid";
      o.payMethod = method;
      const amount = lineAmount(o.lines);
      state.payments.unshift({
        id: "PAY-" + String(Date.now()).slice(-6),
        orderId: id,
        channel: method,
        channelNo: channelNo || "MOCK" + Date.now(),
        amount,
        status: "success",
        time: now(),
      });
      o.history.push({ t: now(), e: method + " 支付成功 " + amount });
      emit();
      toast("支付完成");
    },
    ship(orderId, payload) {
      const o = state.orders.find((x) => x.id === orderId);
      if (!o) return;
      const id = "SH-" + String(Date.now()).slice(-4);
      const ship = {
        id,
        orderId,
        date: payload.date || state.today,
        express: payload.express,
        tracking: payload.tracking,
        lines: payload.lines,
        status: "in_transit",
      };
      state.shipments.unshift(ship);
      payload.lines.forEach((l) => {
        const line = o.lines.find((x) => x.pid === l.pid && x.size === l.size);
        if (line) line.shipped = (line.shipped || 0) + l.qty;
      });
      const all = o.lines.every((l) => (l.shipped || 0) >= l.qty);
      o.status = all ? "shipped" : "partial";
      o.history.push({ t: now(), e: "发货 " + id + " / " + payload.tracking });
      if (payload.tracking) {
        state.tracks[payload.tracking] = [
          { t: now(), e: payload.express + " 已揽收" },
          { t: now(), e: "运输中" },
        ];
      }
      emit();
      toast("发货单已生成");
    },
    updateDelivery(orderId, lines) {
      const o = state.orders.find((x) => x.id === orderId);
      if (!o) return;
      lines.forEach((l) => {
        const line = o.lines.find((x) => x.pid === l.pid && x.size === l.size);
        if (line) line.shipped = l.shipped;
      });
      const all = o.lines.every((l) => (l.shipped || 0) >= l.qty);
      const any = o.lines.some((l) => (l.shipped || 0) > 0);
      o.status = all ? "shipped" : any ? "partial" : o.status;
      o.history.push({ t: now(), e: "手工/接口回传交付数量" });
      emit();
      toast("交付进度已更新");
    },
    applyDealer(form) {
      const id = "AP-" + String(Date.now()).slice(-4);
      state.applications.unshift({ id, status: "pending", time: now(), ...form });
      emit();
      toast("入驻申请已提交");
      return id;
    },
    reviewApply(id, action, note) {
      const a = state.applications.find((x) => x.id === id);
      if (!a) return;
      a.status = action;
      a.note = note || a.note;
      if (action === "approved") {
        const did = "D-" + String(Date.now()).slice(-5);
        state.dealers.unshift({
          id: did,
          name: a.company,
          short: a.company.slice(0, 4),
          city: a.city,
          level: "C",
          status: "active",
          credit: 0,
          contact: a.contact,
          phone: a.phone,
          erpId: "ERP-NEW",
          synced: now(),
          cert: "待认证",
          address: a.city,
        });
        a.dealerId = did;
      }
      emit();
      toast(action === "approved" ? "已准入并建档" : action === "need_info" ? "已要求补资料" : "已驳回");
    },
    bindAccount(dealerId, account, name) {
      state.users.push({
        id: "u-" + Date.now(),
        name,
        account,
        password: "123456",
        role: "dealer_main",
        org: state.dealers.find((d) => d.id === dealerId)?.name,
        dealerId,
        status: "active",
      });
      emit();
      toast("已创建商城账号并绑定档案，初始密码 123456");
    },
    addSub(name, account) {
      state.users.push({
        id: "u-" + Date.now(),
        name,
        account,
        password: "123456",
        role: "dealer_sub",
        org: state.session.org,
        dealerId: state.session.dealerId,
        status: "active",
      });
      emit();
      toast("子账号已创建");
    },
    toggleUser(id) {
      const u = state.users.find((x) => x.id === id);
      if (!u) return;
      u.status = u.status === "active" ? "stopped" : "active";
      emit();
    },
    upsertProduct(p, silent) {
      const i = state.products.findIndex((x) => x.id === p.id);
      if (i >= 0) state.products[i] = { ...state.products[i], ...p };
      else state.products.unshift(p);
      state.productLogs.unshift({ t: now(), user: state.session?.name || "系统", action: "保存商品", target: p.id });
      emit();
      if (!silent) toast("商品已保存");
    },
    batchStatus(ids, patch) {
      ids.forEach((id) => {
        const p = product(id);
        if (!p) return;
        Object.assign(p, patch);
        state.productLogs.unshift({
          t: now(),
          user: state.session.name,
          action: patch.orderable === false ? "不可订购" : patch.status === "off" ? "下架" : "上架",
          target: id,
        });
      });
      emit();
      toast("已更新 " + ids.length + " 个商品");
    },
    importStock(rows) {
      let n = 0;
      rows.forEach((r) => {
        const p = product(r.pid);
        if (!p) return;
        if (p.stock[r.size] == null) p.stock[r.size] = 0;
        p.stock[r.size] = Number(r.qty);
        n++;
      });
      emit();
      toast("已写入 " + n + " 条可订量");
    },
    matchImages(files) {
      const matched = [];
      files.forEach((f) => {
        const pid = (f.name.match(/TW-\d+/) || [])[0];
        if (pid && product(pid)) {
          const p = product(pid);
          p.images = p.images || [];
          p.images.unshift(f.url || p.images[0]);
          state.media.unshift({
            id: "MD" + Date.now() + Math.random(),
            pid,
            year: p.year,
            kind: /d\d|detail/i.test(f.name) ? "细节" : "主图",
            name: f.name,
            src: f.url || p.images[0],
          });
          matched.push({ name: f.name, pid, ok: true });
        } else matched.push({ name: f.name, pid: "—", ok: false });
      });
      emit();
      return matched;
    },
    toggleFav(pid) {
      if (state.favorites.includes(pid)) state.favorites = state.favorites.filter((x) => x !== pid);
      else state.favorites.push(pid);
      emit();
    },
    addWish(pid, size) {
      if (!state.wishlist.some((w) => w.pid === pid && w.size === size)) {
        state.wishlist.push({ pid, size, note: "到货提醒" });
        toast("已加入心愿单，到货后通知");
      }
      emit();
    },
    restockNotice(pid) {
      state.notices.unshift({
        id: "N" + Date.now(),
        title: pid + " 已补货，可返回订购",
        time: now(),
        read: false,
        href: "#/p/" + pid,
      });
      emit();
    },
    addRequest(form) {
      const id = "RQ-" + String(Date.now()).slice(-4);
      state.requests.unshift({ id, dealerId: state.session.dealerId, status: "pending", time: now(), reply: "", ...form });
      emit();
      toast("求购单已提交");
    },
    replyRequest(id, status, reply) {
      const r = state.requests.find((x) => x.id === id);
      if (!r) return;
      r.status = status;
      r.reply = reply;
      emit();
      toast("求购单已处理");
    },
    addReturn(form) {
      const id = "RT-" + String(Date.now()).slice(-4);
      state.returns.unshift({ id, dealerId: state.session.dealerId, status: "pending", time: now(), ...form });
      emit();
      toast("退货申请已提交");
    },
    reviewReturn(id, status) {
      const r = state.returns.find((x) => x.id === id);
      if (!r) return;
      r.status = status;
      emit();
      toast("退货单已更新");
    },
    saveRole(role) {
      const i = state.roles.findIndex((r) => r.id === role.id);
      if (i >= 0) state.roles[i] = role;
      else state.roles.push(role);
      emit();
      toast("角色已保存");
    },
    saveUser(u) {
      const i = state.users.findIndex((x) => x.id === u.id);
      if (i >= 0) state.users[i] = { ...state.users[i], ...u };
      else state.users.push({ ...u, id: "u-" + Date.now(), status: "active", password: "123456" });
      emit();
      toast("用户已保存");
    },
    saveOrg(o) {
      const i = state.orgs.findIndex((x) => x.id === o.id);
      if (i >= 0) state.orgs[i] = { ...state.orgs[i], ...o };
      else state.orgs.push(o);
      emit();
      toast("组织已保存");
    },
    saveCms(cms) {
      state.cms = { ...state.cms, ...cms, published: true };
      emit();
      toast("页面已发布，商城将读取生效配置");
    },
    saveCampaign(c) {
      const i = state.campaigns.findIndex((x) => x.id === c.id);
      if (i >= 0) state.campaigns[i] = c;
      else state.campaigns.unshift(c);
      emit();
      toast("活动已发布");
    },
    saveDict(key, values) {
      state.dictionaries[key] = values;
      emit();
      toast("字典已生效");
    },
    confirmStatement(id) {
      const s = state.statements.find((x) => x.id === id);
      if (!s) return;
      if (s.status === "待经销商核对") s.status = "待平台确认";
      else s.status = "平台已确认";
      emit();
      toast(s.status);
    },
    createStatement(period, dealerId) {
      const orders = state.orders.filter((o) => o.dealerId === dealerId && o.payMethod === "对公转账");
      const amount = orders.reduce((n, o) => n + lineAmount(o.lines), 0);
      const id = "ST-" + String(Date.now()).slice(-4);
      state.statements.unshift({
        id,
        dealerId,
        period,
        orders: orders.map((o) => o.id),
        amount,
        paid: orders.filter((o) => o.payStatus === "paid").reduce((n, o) => n + lineAmount(o.lines), 0),
        status: "待经销商核对",
      });
      emit();
      toast("对账单已生成");
    },
    saveContract(c) {
      const i = state.contracts.findIndex((x) => x.id === c.id);
      if (i >= 0) state.contracts[i] = { ...state.contracts[i], ...c };
      else state.contracts.unshift(c);
      emit();
      toast("合同已保存");
    },
    importProducts(text) {
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      const header = (lines.shift() || "").split(/[,	]/).map((s) => s.trim());
      const idx = (n) => header.findIndex((h) => h.includes(n));
      let n = 0;
      lines.forEach((line) => {
        const c = line.split(/[,	]/);
        const id = c[idx("款号")] || c[0];
        if ((c[idx("有效期")] || "").trim() && !product(id)) {
          toast(id + " 期货必须先有现货主数据", "err");
          return;
        }
        const base = product(id) || {
          id, sizes: ["S", "M", "L", "XL"], stock: { S: 0, M: 0, L: 0, XL: 0 },
          images: [state.products[0]?.images[0]], warehouse: "华东仓", status: "live", orderable: true, fair: false, color: "#ddd",
        };
        const p = {
          ...base,
          id,
          name: c[idx("名称")] || base.name,
          year: Number(c[idx("年份")] || base.year || 2026),
          season: c[idx("季节")] || base.season || "SS26",
          brand: c[idx("品牌")] || base.brand || "TAOVO",
          cat: c[idx("大类")] || base.cat || "服装",
          sub: c[idx("小类")] || base.sub || "T恤",
          gender: c[idx("性别")] || base.gender || "中性",
          wave: c[idx("波次")] || base.wave || "01",
          price: Number(c[idx("价格")] || base.price || 0),
          lead: c[idx("交期")] || base.lead || "现货 5 天",
          validTo: c[idx("有效期")] || base.validTo,
          type: (c[idx("有效期")] || "").trim() ? "futures" : (base.type || "spot"),
        };
        const i = state.products.findIndex((x) => x.id === p.id);
        if (i >= 0) state.products[i] = { ...state.products[i], ...p };
        else state.products.unshift(p);
        n++;
      });
      toast("已导入 / 更新 " + n + " 款商品");
    },
    parseImport(text) {
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      const header = lines.shift();
      if (!header) return { errors: ["空文件"], rows: [] };
      const cols = header.split(/[,	]/).map((s) => s.trim());
      const pidI = cols.findIndex((c) => /款号|pid|style/i.test(c));
      const sizeCols = cols
        .map((c, i) => ({ c, i }))
        .filter((x) => x.i !== pidI && !/合计|公式|name|名称|波次|图片/.test(x.c));
      const errors = [];
      const rows = [];
      lines.forEach((line, idx) => {
        const cells = line.split(/[,	]/);
        const pid = cells[pidI];
        const p = product(pid);
        if (!p) {
          errors.push("第 " + (idx + 2) + " 行：款号 " + pid + " 不存在");
          return;
        }
        if (!canOrder(p)) {
          errors.push(pid + " 当前不可订购（下架、不可订或期货过期）");
          return;
        }
        sizeCols.forEach(({ c, i }) => {
          let raw = (cells[i] || "").trim();
          let qty = 0;
          if (raw.startsWith("=")) {
            const expr = raw.slice(1).replace(/[^0-9+\-*/().]/g, "");
            try {
              qty = Function("return (" + expr + ")")();
            } catch (e) {
              errors.push(pid + " " + c + " 公式无法解析");
              return;
            }
          } else qty = Number(raw || 0);
          if (!qty) return;
          if (qty > (p.stock[c] || 0)) errors.push(pid + " " + c + " 数量 " + qty + " 超过可订量 " + (p.stock[c] || 0));
          rows.push({ pid, size: c, qty, price: p.price, formula: raw.startsWith("=") ? raw : "" });
        });
      });
      state.importPreview = { rows, errors, header: cols };
      emit();
      return state.importPreview;
    },
    setImportQty(i, qty) {
      if (!state.importPreview) return;
      state.importPreview.rows[i].qty = Number(qty) || 0;
      emit();
    },
    runSync(name) {
      const job = state.syncJobs.find((j) => j.name === name);
      if (job) {
        job.last = now();
        job.result = "手动同步完成";
      }
      emit();
      toast(name + " 已同步");
    },
    logApi(id, ok) {
      const a = state.apis.find((x) => x.id === id);
      if (a) {
        a.last = now();
        if (ok) a.ok += 1;
        else a.fail += 1;
      }
      emit();
    },
    lineAmount,
    applyPromo,
    now,
  };

  function now() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return "2026-09-18 " + p(d.getHours()) + ":" + p(d.getMinutes());
  }

  return api;
})();
