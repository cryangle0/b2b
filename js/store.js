window.Taowo = (function () {
  const KEY = "taowo-b2b-proto-v6";
  const seed = window.TAOWO_SEED;

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        (s.users || []).forEach((u) => {
          const seedU = (seed.users || []).find((x) => x.id === u.id);
          if (seedU) {
            if (!u.phone) u.phone = seedU.phone || "";
            if (!u.email) u.email = seedU.email || "";
            if (!u.created) u.created = seedU.created || "";
          }
          if (u.phone == null) u.phone = "";
          if (u.email == null) u.email = "";
          if (u.created == null) u.created = "";
          if (u.lastLogin == null) u.lastLogin = "";
        });
        s.pendingBags = s.pendingBags || {};
        s.mediaFolders = s.mediaFolders || [{ id: "F-main", name: "主图" }, { id: "F-detail", name: "细节" }];
        return s;
      }
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
    s.pendingBags = s.pendingBags || {};
    s.mediaFolders = s.mediaFolders || [{ id: "F-main", name: "主图" }, { id: "F-detail", name: "细节" }];
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
      u.lastLogin = now();
      state.session.lastLogin = u.lastLogin;
      state.logs.unshift({
        id: Date.now(),
        user: u.name,
        type: "登录",
        result: "成功",
        time: now(),
        ip: "10.2.1.3",
      });
      if (isDealer && u.dealerId) {
        const extra = (state.pendingBags && state.pendingBags[u.dealerId]) || [];
        if (extra.length) {
          extra.forEach((item) => {
            const hit = state.cart.find((c) => c.pid === item.pid && c.size === item.size);
            if (hit) hit.qty += item.qty;
            else state.cart.push({ pid: item.pid, size: item.size, qty: item.qty, price: item.price, selected: true });
          });
          state.pendingBags[u.dealerId] = [];
          toast("有驳回订购已退回购物袋，请修改后重新提交");
        }
      }
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
          toast((p && p.id) + " 当前不可订购", "err");
          return null;
        }
        if (l.qty > (p.stock[l.size] || 0)) {
          toast(p.id + " " + l.size + " 可订量不足", "err");
          return null;
        }
      }
      const groups = type
        ? [{ type, items }]
        : [
            { type: "spot", items: items.filter((i) => product(i.pid).type !== "futures") },
            { type: "futures", items: items.filter((i) => product(i.pid).type === "futures") },
          ].filter((g) => g.items.length);
      const created = groups.map((g) => {
        const id = "SO-" + String(Date.now()).slice(-8) + g.type.slice(0, 1).toUpperCase();
        const order = {
          id,
          dealerId: state.session.dealerId,
          type: g.type,
          status: "pending_review",
          payStatus: "unpaid",
          payMethod: payMethod || "",
          created: now(),
          address,
          remark: remark || "",
          lines: g.items,
          history: [{ t: now(), e: "经销商提交" + (g.type === "futures" ? "预售" : "现货") + "订购单" }],
        };
        g.items.forEach((l) => {
          const p = product(l.pid);
          p.stock[l.size] = (p.stock[l.size] || 0) - l.qty;
        });
        state.orders.unshift(order);
        state.logs.unshift({ id: Date.now() + Math.random(), user: state.session.name, type: "新增", result: "提交 " + id, time: now(), ip: "10.2.1.3" });
        return order;
      });
      if (!lines) state.cart = state.cart.filter((c) => c.selected === false);
      emit();
      toast(created.length > 1 ? "已拆成现货/预售两张订购单，等待审核" : "订购单已提交，等待审核");
      return created[0];
    },
    reviewOrder(id, action, adjust) {
      const o = state.orders.find((x) => x.id === id);
      if (!o) return;
      if (action === "reject") {
        o.status = "rejected";
        o.history.push({ t: now(), e: "审核驳回，商品已退回经销商购物袋" + (adjust ? "：" + adjust : "") });
        state.pendingBags = state.pendingBags || {};
        const bag = (state.pendingBags[o.dealerId] = state.pendingBags[o.dealerId] || []);
        o.lines.forEach((l) => {
          const p = product(l.pid);
          if (p) p.stock[l.size] = (p.stock[l.size] || 0) + l.qty;
          bag.push({ pid: l.pid, size: l.size, qty: l.qty, price: l.price });
          if (state.session && state.session.dealerId === o.dealerId) {
            const hit = state.cart.find((c) => c.pid === l.pid && c.size === l.size);
            if (hit) hit.qty += l.qty;
            else state.cart.push({ pid: l.pid, size: l.size, qty: l.qty, price: l.price, selected: true });
          }
        });
      } else {
        if (adjust && adjust.lines) o.lines = adjust.lines;
        o.status = "active";
        o.history.push({ t: now(), e: "审核通过，订单生效" });
        if (!o.contractId) {
          const cid = "CT-" + id.slice(-4);
          state.contracts.unshift({
            id: cid,
            dealerId: o.dealerId,
            title: o.id + " 订购合同",
            orders: [o.id],
            status: "生效",
            from: state.today,
            to: "2026-12-31",
            file: cid + ".pdf",
          });
          o.contractId = cid;
          o.history.push({ t: now(), e: "已关联合同 " + cid });
        }
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
      if (o.status === "pending_review") {
        toast("审核通过后再支付", "err");
        return;
      }
      o.payStatus = "paying";
      o.payMethod = method;
      const pid = "PAY-" + String(Date.now()).slice(-6);
      state.payments.unshift({
        id: pid,
        orderId: id,
        channel: method,
        channelNo: channelNo || "MOCK" + Date.now(),
        amount: lineAmount(o.lines),
        status: "pending",
        time: now(),
      });
      o.history.push({ t: now(), e: "发起" + method + "，等待渠道回调" });
      emit();
      toast("已调起" + method + "，等待回调验签");
      setTimeout(() => {
        const pay = state.payments.find((x) => x.id === pid);
        if (pay) pay.status = "success";
        o.payStatus = "paid";
        o.history.push({ t: now(), e: method + " 回调验签通过 " + lineAmount(o.lines) });
        emit();
        toast("支付完成");
      }, 900);
    },
    ship(orderId, payload) {
      const o = state.orders.find((x) => x.id === orderId);
      if (!o) return;
      if (!(payload.tracking || "").trim()) {
        toast("发货必须填写发货单号", "err");
        return;
      }
      const over = (payload.lines || []).find((l) => {
        const line = o.lines.find((x) => x.pid === l.pid && x.size === l.size);
        const remain = line ? line.qty - (line.shipped || 0) : 0;
        return !line || l.qty > remain;
      });
      if (over) {
        toast(over.pid + " " + over.size + " 超出可发数量", "err");
        return;
      }
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
        const acc = "d" + did.slice(-4);
        state.users.push({
          id: "u-" + Date.now(),
          name: a.contact,
          account: acc,
          password: "123456",
          role: "dealer_main",
          org: a.company,
          dealerId: did,
          phone: a.phone || "",
          email: "",
          created: now(),
          lastLogin: "",
          status: "active",
        });
        a.account = acc;
      }
      emit();
      toast(action === "approved" ? "已准入、建档并开通账号 " + a.account + " / 123456" : action === "need_info" ? "已要求补资料" : "已驳回");
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
        const action = patch.orderable === false ? "不可订购" : patch.status === "off" ? "下架" : "上架";
        state.productLogs.unshift({
          t: now(),
          user: state.session.name,
          action,
          target: id,
        });
        state.logs.unshift({
          id: Date.now() + Math.random(),
          user: state.session.name,
          type: action === "下架" ? "商品下架" : action === "上架" ? "商品上架" : "修改",
          result: id + " " + action,
          time: now(),
          ip: "10.2.1.3",
        });
      });
      emit();
      toast("已更新 " + ids.length + " 个商品");
    },
    importStock(rows) {
      let n = 0;
      const hits = [];
      rows.forEach((r) => {
        const p = product(r.pid);
        if (!p) return;
        if (r.warehouse) p.warehouse = r.warehouse;
        if (p.stock[r.size] == null) p.stock[r.size] = 0;
        const before = p.stock[r.size] || 0;
        p.stock[r.size] = Number(r.qty);
        n++;
        if (before <= 0 && Number(r.qty) > 0) hits.push({ pid: r.pid, size: r.size });
      });
      hits.forEach((h) => {
        const wished = (state.wishlist || []).some((w) => w.pid === h.pid && w.size === h.size);
        if (wished) {
          state.notices.unshift({
            id: "N" + Date.now() + h.pid + h.size,
            title: h.pid + " " + h.size + " 已到货，可返回订购",
            time: now(),
            read: false,
            href: "#/p/" + h.pid,
          });
        }
      });
      const byWh = {};
      rows.forEach((r) => {
        if (r.warehouse) byWh[r.warehouse] = (byWh[r.warehouse] || 0) + 1;
      });
      (state.warehouses || []).forEach((w) => {
        if (byWh[w.name]) w.skus = (Number(w.skus) || 0) + byWh[w.name];
      });
      emit();
      toast("已写入 " + n + " 条可订量" + (hits.length ? "，并通知心愿单经销商" : ""));
    },
    matchImages(files, folderId) {
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
            folderId: folderId || (state.mediaFolders && state.mediaFolders[0]?.id) || "",
          });
          matched.push({ name: f.name, pid, ok: true, src: f.url || p.images[0] });
        } else matched.push({ name: f.name, pid: "—", ok: false, src: f.url || "" });
      });
      emit();
      return matched;
    },
    toggleFav(pid) {
      if (state.favorites.includes(pid)) state.favorites = state.favorites.filter((x) => x !== pid);
      else state.favorites.push(pid);
      emit();
    },
    addWish(pid, size, qty) {
      qty = Number(qty) || 1;
      const hit = state.wishlist.find((w) => w.pid === pid && w.size === size && w.dealerId === state.session?.dealerId);
      if (hit) hit.qty = (hit.qty || 1) + qty;
      else {
        state.wishlist.push({
          pid,
          size,
          qty,
          note: "缺货心愿单",
          dealerId: state.session?.dealerId,
          time: now(),
        });
      }
      toast("已加入缺货心愿单");
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
          brand: c[idx("品牌")] || base.brand || "TAOWO",
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
      if (name.indexOf("经销商") >= 0) {
        state.dealers.forEach((d) => { d.synced = now(); });
        if (!state.dealers.find((d) => d.id === "D-SYNC")) {
          state.dealers.push({
            id: "D-SYNC",
            name: "ERP 新同步客户",
            short: "新同步",
            city: "宁波",
            level: "C",
            status: "active",
            credit: 0,
            contact: "ERP",
            phone: "—",
            erpId: "ERP-NB-NEW",
            synced: now(),
            cert: "待认证",
            address: "宁波",
          });
        }
      }
      if (name.indexOf("现货") >= 0) {
        state.products.forEach((p) => { if (p.type === "spot") p.synced = now(); });
      }
      emit();
      toast(name + " 已同步");
    },
    saveDealer(id, patch) {
      const d = state.dealers.find((x) => x.id === id);
      if (!d) return;
      Object.assign(d, patch);
      emit();
      toast("企业认证信息已保存");
    },
    resetPassword(userId) {
      const u = state.users.find((x) => x.id === userId);
      if (!u) return;
      u.password = "123456";
      state.logs.unshift({ id: Date.now(), user: state.session.name, type: "修改", result: "重置 " + u.account + " 密码", time: now(), ip: "10.2.1.3" });
      emit();
      toast("密码已重置为 123456");
    },
    updateProfile(patch) {
      const u = state.users.find((x) => x.id === state.session.id);
      if (!u) return;
      Object.assign(u, patch);
      Object.assign(state.session, patch);
      emit();
      toast("账号信息已保存");
    },
    createFuturesFromSpot(pid, validTo, lead) {
      const src = product(pid);
      if (!src || src.type !== "spot") {
        toast("只能从已同步现货创建预售", "err");
        return;
      }
      const id = src.id.replace("TW-1", "TW-2");
      const nid = product(id) ? src.id + "-F" : id;
      if (product(nid)) {
        toast(nid + " 已存在", "err");
        return;
      }
      const p = JSON.parse(JSON.stringify(src));
      p.id = nid;
      p.type = "futures";
      p.lead = lead || "期货 45 天";
      p.validFrom = state.today;
      p.validTo = validTo;
      p.warehouse = "预售仓";
      p.fair = true;
      state.products.unshift(p);
      state.productLogs.unshift({ t: now(), user: state.session.name, action: "现货转预售", target: src.id + " → " + nid });
      emit();
      toast("已从 " + src.id + " 创建预售 " + nid);
    },
    markNotice(id) {
      const n = state.notices.find((x) => x.id === id);
      if (n) n.read = true;
      emit();
    },
    bindSub(dealerId, name, account) {
      const d = state.dealers.find((x) => x.id === dealerId);
      state.users.push({
        id: "u-" + Date.now(),
        name,
        account,
        password: "123456",
        role: "dealer_sub",
        org: d?.name,
        dealerId,
        status: "active",
      });
      emit();
      toast("已创建子账号并绑定档案");
    },
    linkContract(cid, orderId) {
      const c = state.contracts.find((x) => x.id === cid);
      const o = state.orders.find((x) => x.id === orderId);
      if (!c || !o) return;
      c.orders = Array.from(new Set((c.orders || []).concat(orderId)));
      o.contractId = cid;
      emit();
      toast("合同已关联订单");
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
    bindUserDealer(userId, dealerId) {
      const u = state.users.find((x) => x.id === userId);
      const d = state.dealers.find((x) => x.id === dealerId);
      if (!u) return toast("账号不存在", "err");
      if (!d) return toast("经销商档案不存在", "err");
      u.dealerId = dealerId;
      u.org = d.name;
      emit();
      toast("已绑定 " + d.name);
    },
    importDealerAccounts(text) {
      const lines = String(text || "").trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) {
        toast("模板至少要有表头和一行账号", "err");
        return { created: 0, updated: 0, failed: [{ line: 1, account: "", msg: "空文件" }], rows: [] };
      }
      const header = lines.shift().split(/[,	]/).map((s) => s.trim());
      const idx = (re) => header.findIndex((h) => re.test(h));
      const iAcc = idx(/账号|account/i);
      const iName = idx(/姓名|名称|name/i);
      const iPhone = idx(/手机|电话|phone/i);
      const iEmail = idx(/邮箱|邮件|email/i);
      const iRole = idx(/角色|role/i);
      const iBind = idx(/绑定|档案|经销商|dealer/i);
      const iPwd = idx(/密码|password/i);
      if (iAcc < 0 || iName < 0) {
        toast("模板表头必须含：账号、姓名", "err");
        return { created: 0, updated: 0, failed: [{ line: 1, account: "", msg: "缺账号或姓名列" }], rows: [] };
      }
      const findDealer = (raw) => {
        const q = String(raw || "").trim().toLowerCase();
        if (!q) return null;
        return state.dealers.find((d) => [d.id, d.name, d.short, d.erpId].some((x) => String(x || "").toLowerCase() === q))
          || state.dealers.find((d) => [d.id, d.name, d.short, d.erpId].some((x) => String(x || "").toLowerCase().includes(q)));
      };
      const parseRole = (raw) => {
        const t = String(raw || "").trim();
        if (/子/.test(t) || t === "dealer_sub") return "dealer_sub";
        return "dealer_main";
      };
      let created = 0;
      let updated = 0;
      const failed = [];
      const rows = [];
      lines.forEach((line, i) => {
        const c = line.split(/[,	]/);
        const account = (c[iAcc] || "").trim();
        const name = (c[iName] || "").trim();
        const phone = iPhone >= 0 ? (c[iPhone] || "").trim() : "";
        const email = iEmail >= 0 ? (c[iEmail] || "").trim() : "";
        const bindRaw = iBind >= 0 ? (c[iBind] || "").trim() : "";
        const password = (iPwd >= 0 && (c[iPwd] || "").trim()) ? (c[iPwd] || "").trim() : "123456";
        const role = parseRole(iRole >= 0 ? c[iRole] : "");
        const no = i + 2;
        if (!account || !name) {
          failed.push({ line: no, account, msg: "账号和姓名必填" });
          return;
        }
        if (state.users.some((u) => u.account === account && !String(u.role).startsWith("dealer"))) {
          failed.push({ line: no, account, msg: "该账号已是运营账号，不能导入为经销商" });
          return;
        }
        let dealer = null;
        if (bindRaw) {
          dealer = findDealer(bindRaw);
          if (!dealer) {
            failed.push({ line: no, account, msg: "找不到经销商档案：" + bindRaw });
            return;
          }
        }
        const hit = state.users.find((u) => u.account === account);
        const patch = {
          name,
          phone,
          email,
          role,
          password,
          status: "active",
          org: dealer ? dealer.name : (hit?.org || ""),
          dealerId: dealer ? dealer.id : (hit?.dealerId || ""),
        };
        if (hit) {
          Object.assign(hit, patch);
          updated += 1;
          rows.push({ account, name, action: "更新", dealerId: hit.dealerId || "", msg: "已更新" });
        } else {
          state.users.push({
            id: "u-" + Date.now() + "-" + i,
            account,
            created: now(),
            lastLogin: "",
            ...patch,
          });
          created += 1;
          rows.push({ account, name, action: "新建", dealerId: patch.dealerId || "", msg: "已开通，密码 " + password });
        }
      });
      state.logs.unshift({
        id: Date.now(),
        user: state.session?.name || "系统",
        type: "导入",
        result: "经销商账号 新建" + created + " 更新" + updated + " 失败" + failed.length,
        time: now(),
        ip: "10.2.1.3",
      });
      emit();
      toast("导入完成：新建 " + created + "，更新 " + updated + "，失败 " + failed.length);
      return { created, updated, failed, rows };
    },
    createWarehouse(form) {
      if (!(form.name || "").trim()) {
        toast("请填写仓库名", "err");
        return;
      }
      const id = "WH-" + String(Date.now()).slice(-4);
      state.warehouses.unshift({
        id,
        name: form.name.trim(),
        city: form.city || "",
        skus: 0,
        sync: form.sync || "手动",
      });
      emit();
      toast("仓库已创建");
    },
    importOrderSheetToCart(text) {
      const preview = api.parseImport(text);
      if (!preview.rows.length) {
        toast(preview.errors[0] || "订购表没有有效行", "err");
        return preview;
      }
      preview.rows.forEach((r) => {
        const hit = state.cart.find((c) => c.pid === r.pid && c.size === r.size);
        if (hit) hit.qty += r.qty;
        else state.cart.push({ pid: r.pid, size: r.size, qty: r.qty, price: r.price, selected: true });
      });
      emit();
      toast("订购表中的数量已写入购物袋" + (preview.errors.length ? "；部分行未导入" : ""));
      if (preview.errors.length) toast(preview.errors.slice(0, 3).join("；"), "err");
      return preview;
    },
    updateOrderLines(orderId, lines) {
      const o = state.orders.find((x) => x.id === orderId);
      if (!o || o.status !== "pending_review") {
        toast("仅待审核订购单可改明细", "err");
        return;
      }
      const old = o.lines;
      old.forEach((l) => {
        const p = product(l.pid);
        if (p) p.stock[l.size] = (p.stock[l.size] || 0) + l.qty;
      });
      for (const l of lines) {
        const p = product(l.pid);
        if (!p || l.qty > (p.stock[l.size] || 0)) {
          old.forEach((x) => {
            const q = product(x.pid);
            if (q) q.stock[x.size] = (q.stock[x.size] || 0) - x.qty;
          });
          toast((l.pid || "") + " 可订量不足", "err");
          return;
        }
      }
      lines.forEach((l) => {
        const p = product(l.pid);
        p.stock[l.size] = (p.stock[l.size] || 0) - l.qty;
      });
      o.lines = lines.map((l) => ({ pid: l.pid, size: l.size, qty: Number(l.qty), price: l.price, shipped: 0 }));
      o.history.push({ t: now(), e: "平台修改订购明细" });
      emit();
      toast("订购单已更新");
    },
    shipFromCsv(orderId, text, express, tracking) {
      const o = state.orders.find((x) => x.id === orderId);
      if (!o) return;
      if (!["active", "partial"].includes(o.status)) {
        toast("仅待发货/部分发货可开单", "err");
        return;
      }
      if (!(tracking || "").trim()) {
        toast("发货必须填写发货单号", "err");
        return;
      }
      const lines = [];
      const rows = text.trim().split(/\r?\n/).filter(Boolean);
      const header = (rows.shift() || "").split(/[,	]/).map((s) => s.trim());
      const iPid = header.findIndex((h) => /款号/.test(h));
      const iSize = header.findIndex((h) => /尺码/.test(h));
      const iQty = header.findIndex((h) => /本次|发货数|数量/.test(h));
      if (iPid < 0 || iSize < 0 || iQty < 0) {
        toast("模板需含：款号、尺码、本次发货", "err");
        return;
      }
      for (const row of rows) {
        const c = row.split(/[,	]/);
        const pid = (c[iPid] || "").trim();
        const size = (c[iSize] || "").trim();
        const qty = Number(c[iQty] || 0);
        if (!pid || !qty) continue;
        const line = o.lines.find((x) => x.pid === pid && x.size === size);
        if (!line) {
          toast(pid + " " + size + " 不在本订单可发范围内", "err");
          return;
        }
        const remain = line.qty - (line.shipped || 0);
        if (qty > remain) {
          toast(pid + " " + size + " 发货 " + qty + " 超出可发 " + remain, "err");
          return;
        }
        lines.push({ pid, size, qty });
      }
      if (!lines.length) {
        toast("没有有效发货行", "err");
        return;
      }
      api.ship(orderId, { express: express || "顺丰", tracking: tracking.trim(), date: state.today, lines });
    },
    createMediaFolder(name) {
      state.mediaFolders = state.mediaFolders || [];
      state.mediaFolders.push({ id: "F-" + Date.now(), name: name || "未命名" });
      emit();
      toast("文件夹已创建");
    },
    deleteMedia(ids) {
      state.media = state.media.filter((m) => !ids.includes(m.id));
      emit();
      toast("已删除 " + ids.length + " 张图片");
    },
    moveMedia(ids, folderId) {
      (state.media || []).forEach((m) => {
        if (ids.includes(m.id)) m.folderId = folderId;
      });
      emit();
    },
    shipAll(orderId, express, tracking) {
      const o = state.orders.find((x) => x.id === orderId);
      if (!o) return;
      const lines = o.lines
        .map((l) => ({ pid: l.pid, size: l.size, qty: l.qty - (l.shipped || 0) }))
        .filter((x) => x.qty > 0);
      if (!lines.length) {
        toast("没有可发数量", "err");
        return;
      }
      api.ship(orderId, { express: express || "顺丰", tracking, date: state.today, lines });
    },
    addOrderLine(orderId, pid, size, qty) {
      const o = state.orders.find((x) => x.id === orderId);
      if (!o || o.status !== "pending_review") {
        toast("仅待审核订购单可增款", "err");
        return;
      }
      const p = product(pid);
      qty = Number(qty) || 0;
      if (!p || !size || qty <= 0) {
        toast("请填写存在的款号、尺码和数量", "err");
        return;
      }
      if (qty > (p.stock[size] || 0)) {
        toast(pid + " " + size + " 可订量不足", "err");
        return;
      }
      p.stock[size] -= qty;
      const hit = o.lines.find((l) => l.pid === pid && l.size === size);
      if (hit) hit.qty += qty;
      else o.lines.push({ pid, size, qty, price: p.price, shipped: 0 });
      o.history.push({ t: now(), e: "增款 " + pid + " " + size + " × " + qty });
      emit();
      toast("已增加明细");
    },
    removeOrderPid(orderId, pid) {
      const o = state.orders.find((x) => x.id === orderId);
      if (!o || o.status !== "pending_review") {
        toast("仅待审核订购单可删款", "err");
        return;
      }
      o.lines.filter((l) => l.pid === pid).forEach((l) => {
        const p = product(l.pid);
        if (p) p.stock[l.size] = (p.stock[l.size] || 0) + l.qty;
      });
      o.lines = o.lines.filter((l) => l.pid !== pid);
      o.history.push({ t: now(), e: "删款 " + pid });
      emit();
      toast("已删除该款");
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
