/* dc-lite: tiny dependency-free runtime for the CORE 3 component templates.
   Supports <sc-if>, <sc-for>, {{ path }} bindings, on* handlers, style-hover, ref, <dc-import>. */
(function () {
  'use strict';
  var registry = {};
  var HANDLERS = { onclick: 'click', onmouseenter: 'mouseenter', onmouseleave: 'mouseleave', onfocus: 'focus', onblur: 'blur', onchange: 'input' };
  var PROPS = { value: 1, checked: 1 };
  var RE = /\{\{\s*([^}]*?)\s*\}\}/g, RE1 = /^\{\{\s*([^}]*?)\s*\}\}$/;

  function evalExpr(expr, scope) {
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;
    if (expr !== '' && !isNaN(Number(expr))) return Number(expr);
    var o = scope, parts = expr.split('.');
    for (var i = 0; i < parts.length; i++) { if (o == null) return undefined; o = o[parts[i]]; }
    return o;
  }
  function interp(str, scope) {
    return str.replace(RE, function (_, e) { var v = evalExpr(e, scope); return v == null || v === false ? '' : String(v); });
  }
  function bound(str, scope) { var m = RE1.exec(str); return m ? { raw: true, v: evalExpr(m[1], scope) } : { raw: false, v: interp(str, scope) }; }

  // ---- template -> vnodes ------------------------------------------------
  function build(node, scope, out) {
    if (node.nodeType === 3) { out.push(RE.test(node.nodeValue) ? interp(node.nodeValue, scope) : node.nodeValue); RE.lastIndex = 0; return; }
    if (node.nodeType !== 1) return;
    var tag = node.localName;
    if (tag === 'sc-if') {
      out.push({ c: 1 });
      if (evalExpr(RE1.exec(node.getAttribute('value'))[1], scope)) kids(node, scope, out);
      out.push({ c: 1 }); return;
    }
    if (tag === 'sc-for') {
      out.push({ c: 1 });
      var list = evalExpr(RE1.exec(node.getAttribute('list'))[1], scope) || [], as = node.getAttribute('as');
      for (var i = 0; i < list.length; i++) { var s = Object.create(scope); s[as] = list[i]; kids(node, s, out); }
      out.push({ c: 1 }); return;
    }
    var v = { tag: tag, ns: node.namespaceURI, a: {}, p: {}, h: {}, hover: null, ref: null, k: [] };
    var attrs = node.attributes;
    for (var j = 0; j < attrs.length; j++) {
      var n = attrs[j].name, val = attrs[j].value;
      if (n.indexOf('hint-') === 0) continue;
      if (HANDLERS[n]) { var b = bound(val, scope); if (typeof b.v === 'function') v.h[HANDLERS[n]] = b.v; continue; }
      if (n === 'style-hover') { v.hover = interp(val, scope); continue; }
      if (n === 'ref') { v.ref = bound(val, scope).v; continue; }
      var bb = bound(val, scope), x = bb.v;
      if (tag === 'dc-import') { v.a[n] = bb.raw ? x : x; continue; }
      if (PROPS[n] && bb.raw) { v.p[n] = x; continue; }
      if (bb.raw) {
        if (x == null || x === false) { if (/^(aria-|data-)/.test(n) && x === false) v.a[n] = 'false'; continue; }
        if (x === true) x = /^(aria-|data-)/.test(n) ? 'true' : '';
      }
      v.a[n] = String(x);
    }
    if (tag === 'dc-import') { v.imp = v.a.name; v.props = {}; for (var key in v.a) if (key !== 'name' && key !== 'style') v.props[key] = v.a[key]; v.a = v.a.style != null ? { style: String(v.a.style) } : {}; v.tag = 'div'; v.ns = 'http://www.w3.org/1999/xhtml'; out.push(v); return; }
    kids(node, scope, v.k);
    out.push(v);
  }
  function kids(node, scope, out) { for (var c = node.firstChild; c; c = c.nextSibling) build(c, scope, out); }

  // ---- vnodes -> DOM -----------------------------------------------------
  var HTML = 'http://www.w3.org/1999/xhtml';
  function create(v) {
    if (typeof v === 'string') return document.createTextNode(v);
    if (v.c) return document.createComment('');
    var el = v.ns && v.ns !== HTML ? document.createElementNS(v.ns, v.tag) : document.createElement(v.tag);
    el.__a = {}; el.__l = {};
    if (v.imp) { el.__impName = v.imp; el.__imp = registry[v.imp](v.props); el.__imp.mountInto(el); }
    update(el, v, true);
    if (!v.imp) for (var i = 0; i < v.k.length; i++) el.appendChild(create(v.k[i]));
    return el;
  }
  function same(d, v) {
    if (typeof v === 'string') return d.nodeType === 3;
    if (v.c) return d.nodeType === 8;
    return d.nodeType === 1 && d.localName === v.tag && (d.namespaceURI || HTML) === (v.ns || HTML) && (d.__impName || null) === (v.imp || null);
  }
  function applyStyle(el) {
    var s = el.__base == null ? null : (el.__hov && el.__hover ? el.__base + ';' + el.__hover : el.__base);
    if (s == null) { if (el.hasAttribute('style')) el.removeAttribute('style'); return; }
    if (el.getAttribute('style') !== s) el.setAttribute('style', s);
  }
  function update(el, v, isNew) {
    var a = v.a, name;
    for (name in a) {
      if (name === 'style') continue;
      if (el.getAttribute(name) !== a[name]) el.setAttribute(name, a[name]);
    }
    for (name in el.__a) if (!(name in a)) el.removeAttribute(name);
    el.__a = a;
    el.__base = a.style != null ? a.style : null;
    el.__hover = v.hover;
    if (v.hover && !el.__hl) {
      el.__hl = true;
      el.addEventListener('mouseenter', function () { el.__hov = true; applyStyle(el); });
      el.addEventListener('mouseleave', function () { el.__hov = false; applyStyle(el); });
    }
    applyStyle(el);
    for (var p in v.p) { if (el[p] !== v.p[p]) el[p] = v.p[p] == null ? '' : v.p[p]; }
    el.__h = v.h;
    for (var ev in v.h) if (!el.__l[ev]) { el.__l[ev] = 1; (function (ev) { el.addEventListener(ev, function (e) { var f = el.__h[ev]; if (f) f(e); }); })(ev); }
    if (v.ref) v.ref.current = el;
    if (v.imp) { el.__impName = v.imp; el.__imp.setProps(v.props); }
    else if (!isNew) patchKids(el, v.k);
  }
  function patchKids(el, vk) {
    var i = 0;
    for (; i < vk.length; i++) {
      var cur = el.childNodes[i], v = vk[i];
      if (!cur) el.appendChild(create(v));
      else if (same(cur, v)) { if (typeof v === 'string') { if (cur.nodeValue !== v) cur.nodeValue = v; } else if (!v.c) update(cur, v); }
      else el.replaceChild(create(v), cur);
    }
    while (el.childNodes.length > vk.length) el.removeChild(el.lastChild);
  }
  // ---- component base ----------------------------------------------------
  function DCLogic(props) { this.props = props || {}; this._cbs = []; this._q = false; this._mounted = false; }
  DCLogic.prototype.setState = function (p, cb) {
    var patch = typeof p === 'function' ? p(this.state) : p;
    this.state = Object.assign({}, this.state, patch);
    if (cb) this._cbs.push(cb);
    this._schedule();
  };
  DCLogic.prototype._schedule = function () {
    if (this._q || !this._root) return; this._q = true; var me = this;
    queueMicrotask(function () { me._q = false; me._render(); });
  };
  DCLogic.prototype.setProps = function (props) {
    var changed = false; for (var k in props) if (props[k] !== this.props[k]) { changed = true; break; }
    if (!changed && Object.keys(this.props).length === Object.keys(props).length) return;
    this.props = props; this._schedule();
  };
  DCLogic.prototype.mountInto = function (el) { this._root = el; this._render(); };
  DCLogic.prototype._render = function () {
    var vals = this.renderVals(), out = [], t = this._tpl;
    for (var c = t.firstChild; c; c = c.nextSibling) build(c, vals, out);
    var host = this._root;
    if (!this._mounted) {
      for (var i = 0; i < out.length; i++) host.appendChild(create(out[i]));
      this._mounted = true;
      if (this.componentDidMount) this.componentDidMount();
    } else {
      patchKids(host, out);
      if (this.componentDidUpdate) this.componentDidUpdate();
    }
    var cbs = this._cbs; this._cbs = []; cbs.forEach(function (f) { f(); });
  };

  var React = { createRef: function () { return { current: null }; } };

  window.DC = {
    register: function (name, templateHtml, factory) {
      var tpl = document.createElement('template'); tpl.innerHTML = templateHtml;
      var Cls = factory(DCLogic, React);
      registry[name] = function (props) { var inst = new Cls(props); inst._tpl = tpl.content; return inst; };
    },
    mount: function (name, el) { var inst = registry[name]({}); inst.mountInto(el); return inst; }
  };
})();
