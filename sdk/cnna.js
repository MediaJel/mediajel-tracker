/*!
 * Web analytics for Snowplow v3.22.1 (http://bit.ly/sp-js)
 * Copyright 2022 Snowplow Analytics Ltd, 2010 Anthon Pang
 * Licensed under BSD-3-Clause
 */

"use strict";
!(function () {
  function e(e, n) {
    var t,
      o = {};
    for (t in e) Object.prototype.hasOwnProperty.call(e, t) && 0 > n.indexOf(t) && (o[t] = e[t]);
    if (null != e && "function" == typeof Object.getOwnPropertySymbols) {
      var r = 0;
      for (t = Object.getOwnPropertySymbols(e); r < t.length; r++)
        0 > n.indexOf(t[r]) && Object.prototype.propertyIsEnumerable.call(e, t[r]) && (o[t[r]] = e[t[r]]);
    }
    return o;
  }
  function n(e, n, t) {
    if (t || 2 === arguments.length)
      for (var o, r = 0, i = n.length; r < i; r++)
        (!o && r in n) || (o || (o = Array.prototype.slice.call(n, 0, r)), (o[r] = n[r]));
    return e.concat(o || Array.prototype.slice.call(n));
  }
  function t() {
    var e,
      n = {},
      t = [],
      o = [],
      i = [],
      a = function (e, t) {
        null != t && "" !== t && (n[e] = t);
      };
    return {
      add: a,
      addDict: function (e) {
        for (var n in e) Object.prototype.hasOwnProperty.call(e, n) && a(n, e[n]);
      },
      addJson: function (e, n, i) {
        i && r(i) && ((e = { keyIfEncoded: e, keyIfNotEncoded: n, json: i }), o.push(e), t.push(e));
      },
      addContextEntity: function (e) {
        i.push(e);
      },
      getPayload: function () {
        return n;
      },
      getJson: function () {
        return t;
      },
      withJsonProcessor: function (n) {
        e = n;
      },
      build: function () {
        return null == e || e(this, o, i), n;
      },
    };
  }
  function o(e) {
    return function (t, o, r) {
      for (
        var i = function (n, o, r) {
            if (((n = JSON.stringify(n)), e)) {
              if (((r = t.add), n)) {
                var i = 0,
                  a = 0,
                  c = [];
                if (n) {
                  n = unescape(encodeURIComponent(n));
                  do {
                    var s = n.charCodeAt(i++),
                      u = n.charCodeAt(i++),
                      l = n.charCodeAt(i++),
                      d = (s << 16) | (u << 8) | l;
                    (s = (d >> 18) & 63),
                      (u = (d >> 12) & 63),
                      (l = (d >> 6) & 63),
                      (d &= 63),
                      (c[a++] = Xe.charAt(s) + Xe.charAt(u) + Xe.charAt(l) + Xe.charAt(d));
                  } while (i < n.length);
                  (i = c.join("")), (n = ((n = n.length % 3) ? i.slice(0, n - 3) : i) + "===".slice(n || 3));
                }
                n = n.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
              }
              r.call(t, o, n);
            } else t.add(r, n);
          },
          a = function (n, o) {
            if (!n) {
              var r = t.getPayload();
              if (e ? r.cx : r.co) {
                var i = (n = JSON).parse;
                if (e) {
                  if ((r = r.cx)) {
                    switch (4 - (r.length % 4)) {
                      case 2:
                        r += "==";
                        break;
                      case 3:
                        r += "=";
                    }
                    r = (function (e) {
                      var n,
                        t = 0,
                        o = 0,
                        r = "",
                        i = [];
                      if (!e) return e;
                      e += "";
                      do {
                        var a = Xe.indexOf(e.charAt(t++)),
                          c = Xe.indexOf(e.charAt(t++));
                        r = Xe.indexOf(e.charAt(t++));
                        var s = Xe.indexOf(e.charAt(t++)),
                          u = (a << 18) | (c << 12) | (r << 6) | s;
                        (a = (u >> 16) & 255),
                          (c = (u >> 8) & 255),
                          (u &= 255),
                          (i[o++] =
                            64 === r
                              ? String.fromCharCode(a)
                              : 64 === s
                                ? String.fromCharCode(a, c)
                                : String.fromCharCode(a, c, u));
                      } while (t < e.length);
                      return (
                        (r = i.join("")),
                        (n = r.replace(/\0+$/, "")),
                        decodeURIComponent(
                          n
                            .split("")
                            .map(function (e) {
                              return "%" + ("00" + e.charCodeAt(0).toString(16)).slice(-2);
                            })
                            .join(""),
                        )
                      );
                    })((r = r.replace(/-/g, "+").replace(/_/g, "/")));
                  }
                } else r = r.co;
                n = i.call(n, r);
              } else n = void 0;
            }
            return n ? (n.data = n.data.concat(o.data)) : (n = o), n;
          },
          c = void 0,
          s = 0;
        s < o.length;
        s++
      ) {
        var u = o[s];
        "cx" === u.keyIfEncoded ? (c = a(c, u.json)) : i(u.json, u.keyIfEncoded, u.keyIfNotEncoded);
      }
      (o.length = 0),
        r.length &&
          ((c = a(
            c,
            (o = { schema: "iglu:com.snowplowanalytics.snowplow/contexts/jsonschema/1-0-0", data: n([], r, !0) }),
          )),
          (r.length = 0)),
        c && i(c, "cx", "co");
    };
  }
  function r(e) {
    if (!i(e)) return !1;
    for (var n in e) if (Object.prototype.hasOwnProperty.call(e, n)) return !0;
    return !1;
  }
  function i(e) {
    return null != e && (e.constructor === {}.constructor || e.constructor === [].constructor);
  }
  function a() {
    var e = [],
      n = [];
    return {
      getGlobalPrimitives: function () {
        return e;
      },
      getConditionalProviders: function () {
        return n;
      },
      addGlobalContexts: function (t) {
        for (var o = [], r = [], i = 0; i < t.length; i++) {
          var a = t[i];
          y(a) ? o.push(a) : v(a) && r.push(a);
        }
        (e = e.concat(r)), (n = n.concat(o));
      },
      clearGlobalContexts: function () {
        (n = []), (e = []);
      },
      removeGlobalContexts: function (t) {
        for (
          var o = function (t) {
              y(t)
                ? (n = n.filter(function (e) {
                    return JSON.stringify(e) !== JSON.stringify(t);
                  }))
                : v(t) &&
                  (e = e.filter(function (e) {
                    return JSON.stringify(e) !== JSON.stringify(t);
                  }));
            },
            r = 0;
          r < t.length;
          r++
        )
          o(t[r]);
      },
      getApplicableContexts: function (t) {
        e: {
          for (var o = 0, r = t.getJson(); o < r.length; o++) {
            var i = r[o];
            if (
              "ue_px" === i.keyIfEncoded &&
              "object" == typeof i.json.data &&
              "string" == typeof (i = i.json.data.schema)
            ) {
              o = i;
              break e;
            }
          }
          o = "";
        }
        (i = "string" == typeof (r = t.getPayload().e) ? r : ""), (r = []);
        var a = A(e, t, i, o);
        return (
          r.push.apply(r, a),
          (t = (function (e, n, t, o) {
            var r;
            return (
              (e = b(e).map(function (e) {
                e: {
                  if (g(e)) {
                    var r = e[0],
                      i = !1;
                    try {
                      i = r({ event: n.getPayload(), eventType: t, eventSchema: o });
                    } catch (e) {
                      i = !1;
                    }
                    if (!0 === i) {
                      e = A(e[1], n, t, o);
                      break e;
                    }
                  } else if (
                    h(e) &&
                    (function (e, n) {
                      var t = 0,
                        o = 0,
                        r = e.accept;
                      return (
                        Array.isArray(r)
                          ? e.accept.some(function (e) {
                              return w(e, n);
                            }) && o++
                          : "string" == typeof r && w(r, n) && o++,
                        (r = e.reject),
                        Array.isArray(r)
                          ? e.reject.some(function (e) {
                              return w(e, n);
                            }) && t++
                          : "string" == typeof r && w(r, n) && t++,
                        0 < o && 0 === t
                      );
                    })(e[0], o)
                  ) {
                    e = A(e[1], n, t, o);
                    break e;
                  }
                  e = [];
                }
                if (e && 0 !== e.length) return e;
              })),
              (r = []).concat.apply(
                r,
                e.filter(function (e) {
                  return null != e && e.filter(Boolean);
                }),
              )
            );
          })(n, t, i, o)),
          r.push.apply(r, t),
          r
        );
      },
    };
  }
  function c(e) {
    for (var n, t = [], o = 1; o < arguments.length; o++) t[o - 1] = arguments[o];
    return null !==
      (n =
        null == e
          ? void 0
          : e
              .map(function (e) {
                if ("function" != typeof e) return e;
                try {
                  return e.apply(void 0, t);
                } catch (e) {}
              })
              .filter(Boolean)) && void 0 !== n
      ? n
      : [];
  }
  function s(e) {
    return (
      !!((e = e.split(".")) && 1 < e.length) &&
      (function (e) {
        if ("*" === e[0] || "*" === e[1]) return !1;
        if (0 < e.slice(2).length) {
          var n = !1,
            t = 0;
          for (e = e.slice(2); t < e.length; t++)
            if ("*" === e[t]) n = !0;
            else if (n) return !1;
          return !0;
        }
        return 2 == e.length;
      })(e)
    );
  }
  function u(e) {
    if (
      null !==
        (e =
          /^iglu:((?:(?:[a-zA-Z0-9-_]+|\*).)+(?:[a-zA-Z0-9-_]+|\*))\/([a-zA-Z0-9-_.]+|\*)\/jsonschema\/([1-9][0-9]*|\*)-(0|[1-9][0-9]*|\*)-(0|[1-9][0-9]*|\*)$/.exec(
            e,
          )) &&
      s(e[1])
    )
      return e.slice(1, 6);
  }
  function l(e) {
    if ((e = u(e))) {
      var n = e[0];
      return 5 === e.length && s(n);
    }
    return !1;
  }
  function d(e) {
    return (
      Array.isArray(e) &&
      e.every(function (e) {
        return "string" == typeof e;
      })
    );
  }
  function f(e) {
    return d(e)
      ? e.every(function (e) {
          return l(e);
        })
      : "string" == typeof e && l(e);
  }
  function m(e) {
    return !!(r(e) && "schema" in e && "data" in e) && "string" == typeof e.schema && "object" == typeof e.data;
  }
  function p(e) {
    return "function" == typeof e && 1 >= e.length;
  }
  function v(e) {
    return p(e) || m(e);
  }
  function g(e) {
    return (
      !(!Array.isArray(e) || 2 !== e.length) && (Array.isArray(e[1]) ? p(e[0]) && e[1].every(v) : p(e[0]) && v(e[1]))
    );
  }
  function h(e) {
    return (
      !(!Array.isArray(e) || 2 !== e.length) &&
      !!(function (e) {
        var n = 0;
        if (null != e && "object" == typeof e && !Array.isArray(e)) {
          if (Object.prototype.hasOwnProperty.call(e, "accept")) {
            if (!f(e.accept)) return !1;
            n += 1;
          }
          if (Object.prototype.hasOwnProperty.call(e, "reject")) {
            if (!f(e.reject)) return !1;
            n += 1;
          }
          return 0 < n && 2 >= n;
        }
        return !1;
      })(e[0]) &&
      (Array.isArray(e[1]) ? e[1].every(v) : v(e[1]))
    );
  }
  function y(e) {
    return g(e) || h(e);
  }
  function w(e, n) {
    if (!l(e)) return !1;
    if (
      ((e = u(e)),
      (n =
        null !==
        (n =
          /^iglu:([a-zA-Z0-9-_.]+)\/([a-zA-Z0-9-_]+)\/jsonschema\/([1-9][0-9]*)-(0|[1-9][0-9]*)-(0|[1-9][0-9]*)$/.exec(
            n,
          ))
          ? n.slice(1, 6)
          : void 0),
      e && n)
    ) {
      if (
        !(function (e, n) {
          if (((n = n.split(".")), (e = e.split(".")), n && e)) {
            if (n.length !== e.length) return !1;
            for (var t = 0; t < e.length; t++) if (!k(n[t], e[t])) return !1;
            return !0;
          }
          return !1;
        })(e[0], n[0])
      )
        return !1;
      for (var t = 1; 5 > t; t++) if (!k(e[t], n[t])) return !1;
      return !0;
    }
    return !1;
  }
  function k(e, n) {
    return (e && n && "*" === e) || e === n;
  }
  function b(e) {
    return Array.isArray(e) ? e : [e];
  }
  function A(e, n, t, o) {
    var r;
    return (
      (e = b(e).map(function (e) {
        e: if (m(e)) e = [e];
        else {
          if (p(e)) {
            n: {
              var r = void 0;
              try {
                if (
                  ((r = e({ event: n.getPayload(), eventType: t, eventSchema: o })),
                  (Array.isArray(r) && r.every(m)) || m(r))
                ) {
                  var i = r;
                  break n;
                }
                i = void 0;
                break n;
              } catch (e) {}
              i = void 0;
            }
            if (m(i)) {
              e = [i];
              break e;
            }
            if (Array.isArray(i)) {
              e = i;
              break e;
            }
          }
          e = void 0;
        }
        if (e && 0 !== e.length) return e;
      })),
      (r = []).concat.apply(
        r,
        e.filter(function (e) {
          return null != e && e.filter(Boolean);
        }),
      )
    );
  }
  function _(e) {
    void 0 === e && (e = {});
    var t,
      r,
      c,
      s,
      u,
      l,
      d,
      f = e.base64,
      m = e.corePlugins,
      p = null != m ? m : [];
    (t = null == f || f),
      (r = p),
      (c = e.callback),
      (s = (function (e) {
        return {
          addPluginContexts: function (t) {
            var o = t ? n([], t, !0) : [];
            return (
              e.forEach(function (e) {
                try {
                  e.contexts && o.push.apply(o, e.contexts());
                } catch (e) {
                  Qe.error("Error adding plugin contexts", e);
                }
              }),
              o
            );
          },
        };
      })(r)),
      (u = a()),
      (l = t),
      (d = {});
    var v = je(
      je(
        {},
        (e = {
          track: function (e, n, t) {
            e.withJsonProcessor(o(l)),
              e.add("eid", We.v4()),
              e.addDict(d),
              (t = (function (e) {
                return null == e
                  ? { type: "dtm", value: new Date().getTime() }
                  : "number" == typeof e
                    ? { type: "dtm", value: e }
                    : "ttm" === e.type
                      ? { type: "ttm", value: e.value }
                      : { type: "dtm", value: e.value || new Date().getTime() };
              })(t)),
              e.add(t.type, t.value.toString()),
              (n = (function (e, n) {
                e = u.getApplicableContexts(e);
                var t = [];
                return n && n.length && t.push.apply(t, n), e && e.length && t.push.apply(t, e), t;
              })(e, s.addPluginContexts(n))),
              void 0 !==
                (n =
                  n && n.length
                    ? { schema: "iglu:com.snowplowanalytics.snowplow/contexts/jsonschema/1-0-0", data: n }
                    : void 0) && e.addJson("cx", "co", n),
              r.forEach(function (n) {
                try {
                  n.beforeTrack && n.beforeTrack(e);
                } catch (e) {
                  Qe.error("Plugin beforeTrack", e);
                }
              }),
              "function" == typeof c && c(e);
            var i = e.build();
            return (
              r.forEach(function (e) {
                try {
                  e.afterTrack && e.afterTrack(i);
                } catch (e) {
                  Qe.error("Plugin afterTrack", e);
                }
              }),
              i
            );
          },
          addPayloadPair: function (e, n) {
            d[e] = n;
          },
          getBase64Encoding: function () {
            return l;
          },
          setBase64Encoding: function (e) {
            l = e;
          },
          addPayloadDict: function (e) {
            for (var n in e) Object.prototype.hasOwnProperty.call(e, n) && (d[n] = e[n]);
          },
          resetPayloadPairs: function (e) {
            d = i(e) ? e : {};
          },
          setTrackerVersion: function (e) {
            d.tv = e;
          },
          setTrackerNamespace: function (e) {
            d.tna = e;
          },
          setAppId: function (e) {
            d.aid = e;
          },
          setPlatform: function (e) {
            d.p = e;
          },
          setUserId: function (e) {
            d.uid = e;
          },
          setScreenResolution: function (e, n) {
            d.res = e + "x" + n;
          },
          setViewport: function (e, n) {
            d.vp = e + "x" + n;
          },
          setColorDepth: function (e) {
            d.cd = e;
          },
          setTimezone: function (e) {
            d.tz = e;
          },
          setLang: function (e) {
            d.lang = e;
          },
          setIpAddress: function (e) {
            d.ip = e;
          },
          setUseragent: function (e) {
            d.ua = e;
          },
          addGlobalContexts: function (e) {
            u.addGlobalContexts(e);
          },
          clearGlobalContexts: function () {
            u.clearGlobalContexts();
          },
          removeGlobalContexts: function (e) {
            u.removeGlobalContexts(e);
          },
        }),
      ),
      {
        addPlugin: function (e) {
          var n, t;
          (e = e.plugin),
            p.push(e),
            null === (n = e.logger) || void 0 === n || n.call(e, Qe),
            null === (t = e.activateCorePlugin) || void 0 === t || t.call(e, v);
        },
      },
    );
    return (
      null == p ||
        p.forEach(function (e) {
          var n, t;
          null === (n = e.logger) || void 0 === n || n.call(e, Qe),
            null === (t = e.activateCorePlugin) || void 0 === t || t.call(e, v);
        }),
      v
    );
  }
  function T(e) {
    var n = e.event;
    return (
      (e = {
        schema: "iglu:com.snowplowanalytics.snowplow/unstruct_event/jsonschema/1-0-0",
        data: { schema: (e = n.schema), data: n.data },
      }),
      (n = t()).add("e", "ue"),
      n.addJson("ue_px", "ue_pr", e),
      n
    );
  }
  function P(e) {
    return T({
      event: (e = {
        schema: "iglu:com.snowplowanalytics.snowplow/link_click/jsonschema/1-0-1",
        data: C({
          targetUrl: e.targetUrl,
          elementId: e.elementId,
          elementClasses: e.elementClasses,
          elementTarget: e.elementTarget,
          elementContent: e.elementContent,
        }),
      }),
    });
  }
  function C(e, n) {
    void 0 === n && (n = {});
    var t,
      o = {};
    for (t in e) (n[t] || (null !== e[t] && void 0 !== e[t])) && (o[t] = e[t]);
    return o;
  }
  function S(e, n, t) {
    void 0 === t && (t = 63072e3);
    try {
      var o = window.localStorage,
        r = Date.now() + 1e3 * t;
      return o.setItem("".concat(e, ".expires"), r.toString()), o.setItem(e, n), !0;
    } catch (e) {
      return !1;
    }
  }
  function O(e) {
    try {
      var n = window.localStorage;
      return n.removeItem(e), n.removeItem(e + ".expires"), !0;
    } catch (e) {
      return !1;
    }
  }
  function x(e) {
    try {
      return window.sessionStorage.getItem(e);
    } catch (e) {}
  }
  function I(e) {
    return btoa(e).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function E(e) {
    return (Number.isInteger && Number.isInteger(e)) || ("number" == typeof e && isFinite(e) && Math.floor(e) === e);
  }
  function j(e) {
    return !(!e || "function" != typeof e);
  }
  function L(e) {
    if (!e || "string" != typeof e.valueOf()) {
      e = e.text || "";
      var n = document.getElementsByTagName("title");
      n && null != n[0] && (e = n[0].text);
    }
    return e;
  }
  function D(e) {
    var n = /^(?:(?:https?|ftp):)\/*(?:[^@]+@)?([^:/#]+)/.exec(e);
    return n ? n[1] : e;
  }
  function N(e) {
    var n = e.length;
    return "." === e.charAt(--n) && (e = e.slice(0, n)), "*." === e.slice(0, 2) && (e = e.slice(1)), e;
  }
  function B(e) {
    var n = window,
      t = z("referrer", n.location.href) || z("referer", n.location.href);
    if (t) return t;
    if (e) return e;
    try {
      if (n.top) return n.top.document.referrer;
      if (n.parent) return n.parent.document.referrer;
    } catch (e) {}
    return document.referrer;
  }
  function M(e, n, t, o) {
    return e.addEventListener
      ? (e.addEventListener(n, t, o), !0)
      : e.attachEvent
        ? e.attachEvent("on" + n, t)
        : void (e["on" + n] = t);
  }
  function z(e, n) {
    return (e = new RegExp("^[^#]*[?&]" + e + "=([^&#]*)").exec(n))
      ? decodeURIComponent(e[1].replace(/\+/g, " "))
      : null;
  }
  function U(e, n, t, o, r, i, a) {
    return 1 < arguments.length
      ? (document.cookie =
          e +
          "=" +
          encodeURIComponent(null != n ? n : "") +
          (t ? "; Expires=" + new Date(+new Date() + 1e3 * t).toUTCString() : "") +
          (o ? "; Path=" + o : "") +
          (r ? "; Domain=" + r : "") +
          (i ? "; SameSite=" + i : "") +
          (a ? "; Secure" : ""))
      : decodeURIComponent((("; " + document.cookie).split("; " + e + "=")[1] || "").split(";")[0]);
  }
  function F(e) {
    return (e = parseInt(e)), isNaN(e) ? void 0 : e;
  }
  function R(e) {
    return (e = parseFloat(e)), isNaN(e) ? void 0 : e;
  }
  function V(e) {
    if (null == e || "object" != typeof e || Array.isArray(e))
      return function () {
        return !0;
      };
    var n = Object.prototype.hasOwnProperty.call(e, "allowlist"),
      t = J(e);
    return q(e, function (e) {
      e: {
        var o = 0;
        for (e = G(e); o < e.length; o++)
          if (t[e[o]]) {
            o = !0;
            break e;
          }
        o = !1;
      }
      return o === n;
    });
  }
  function H(e) {
    if (null == e || "object" != typeof e || Array.isArray(e))
      return function () {
        return !0;
      };
    var n = e.hasOwnProperty("allowlist"),
      t = J(e);
    return q(e, function (e) {
      return e.name in t === n;
    });
  }
  function G(e) {
    return e.className.match(/\S+/g) || [];
  }
  function q(e, n) {
    return e.hasOwnProperty("filter") && e.filter ? e.filter : n;
  }
  function J(e) {
    var n = {};
    if ((e = e.allowlist || e.denylist)) {
      Array.isArray(e) || (e = [e]);
      for (var t = 0; t < e.length; t++) n[e[t]] = !0;
    }
    return n;
  }
  function Y(e, n, t, o, r, i, a, c, s, u, l, d, f, m, p, v, g, h, y, w) {
    function k(e) {
      var n = Object.keys(e)
        .map(function (n) {
          return [n, e[n]];
        })
        .reduce(function (e, n) {
          return (e[n[0]] = n[1].toString()), e;
        }, {});
      return { evt: n, bytes: b(JSON.stringify(n)) };
    }
    function b(e) {
      for (var n = 0, t = 0; t < e.length; t++) {
        var o = e.charCodeAt(t);
        127 >= o
          ? (n += 1)
          : 2047 >= o
            ? (n += 2)
            : 55296 <= o && 57343 >= o
              ? ((n += 4), t++)
              : (n = 65535 > o ? n + 3 : n + 4);
      }
      return n;
    }
    function A(e, n) {
      var t = O(n, !0, !1),
        o = I([e.evt]);
      (t.onreadystatechange = function () {
        4 === t.readyState &&
          (C(t.status)
            ? null == y || y(o)
            : null == w || w({ status: t.status, message: t.statusText, events: o, willRetry: !1 }));
      }),
        t.send(x(o));
    }
    function _(e) {
      for (var n = 0; n < e; n++) M.shift();
      t && S(G, JSON.stringify(M.slice(0, u)));
    }
    function T(e, n, t) {
      e.onreadystatechange = function () {
        if (4 === e.readyState)
          if ((clearTimeout(o), C(e.status))) _(n), null == y || y(t), P();
          else {
            var r = e.status;
            (r = !(C(r) || !h) && (!!p.includes(r) || !v.includes(r))) ||
              (Qe.error("Status ".concat(e.status, ", will not retry.")), _(n)),
              null == w || w({ status: e.status, message: e.statusText, events: t, willRetry: r }),
              (B = !1);
          }
      };
      var o = setTimeout(function () {
        e.abort(), h || _(n), null == w || w({ status: 0, message: "timeout", events: t, willRetry: h }), (B = !1);
      }, l);
    }
    function P(e) {
      for (void 0 === e && (e = !1); M.length && "string" != typeof M[0] && "object" != typeof M[0]; ) M.shift();
      if (M.length) {
        if (!j || "string" != typeof j.valueOf()) throw "No collector configured";
        if (((B = !0), g && !z)) {
          var n = O(g, !1, e);
          (z = !0),
            (n.timeout = l),
            (n.onreadystatechange = function () {
              4 === n.readyState && P();
            }),
            n.send();
        } else if (R) {
          var o = function (e) {
              for (var n = 0, t = 0; n < e.length && !((t += e[n].bytes) >= a); ) n += 1;
              return n;
            },
            r = void 0,
            i = void 0,
            c = void 0;
          if ((J(M) ? ((i = O((r = j), !0, e)), (c = o(M))) : ((i = O((r = E(M[0])), !1, e)), (c = 1)), J(M))) {
            if (0 < (e = M.slice(0, c)).length) {
              o = !1;
              var s = e.map(function (e) {
                return e.evt;
              });
              if (F) {
                var f = new Blob([x(I(s))], { type: "application/json" });
                try {
                  o = window.navigator.sendBeacon(r, f);
                } catch (e) {
                  o = !1;
                }
              }
              !0 === o ? (_(c), null == y || y(e), P()) : (T(i, c, (r = I(s))), i.send(x(r)));
            }
          } else T(i, c, [r]), i.send();
        } else if (d || J(M)) B = !1;
        else {
          i = new Image(1, 1);
          var m = !0;
          (i.onload = function () {
            m && ((m = !1), M.shift(), t && S(G, JSON.stringify(M.slice(0, u))), P());
          }),
            (i.onerror = function () {
              m && (B = m = !1);
            }),
            (i.src = E(M[0])),
            setTimeout(function () {
              m && B && ((m = !1), P());
            }, l);
        }
      } else B = !1;
    }
    function C(e) {
      return 200 <= e && 300 > e;
    }
    function O(e, n, t) {
      var o = new XMLHttpRequest();
      for (var r in (n
        ? (o.open("POST", e, !t), o.setRequestHeader("Content-Type", "application/json; charset=UTF-8"))
        : o.open("GET", e, !t),
      (o.withCredentials = m),
      d && o.setRequestHeader("SP-Anonymous", "*"),
      f))
        Object.prototype.hasOwnProperty.call(f, r) && o.setRequestHeader(r, f[r]);
      return o;
    }
    function x(e) {
      return JSON.stringify({ schema: "iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4", data: e });
    }
    function I(e) {
      for (var n = new Date().getTime().toString(), t = 0; t < e.length; t++) e[t].stm = n;
      return e;
    }
    function E(e) {
      return s ? j + e.replace("?", "?stm=" + new Date().getTime() + "&") : j + e;
    }
    void 0 === h && (h = !0);
    var j,
      L,
      D,
      N,
      B = !1,
      M = [],
      z = !1,
      U = !0 === (o = "string" == typeof o ? o.toLowerCase() : o) || "beacon" === o || "true" === o,
      F =
        !(
          !U ||
          !window.navigator ||
          "function" != typeof window.navigator.sendBeacon ||
          ((L = window.navigator.userAgent),
          ((N = (N = L).match("(iP.+; CPU .*OS (d+)[_d]*.*) AppleWebKit/")) && N.length && parseInt(N[0]) <= 13) ||
            ((function (e, n, t) {
              return (
                !(!(t = t.match("(Macintosh;.*Mac OS X (d+)_(d+)[_d]*.*) AppleWebKit/")) || !t.length) &&
                (parseInt(t[0]) <= e || (parseInt(t[0]) === e && parseInt(t[1]) <= n))
              );
            })(10, 15, L) &&
              (D = L).match("Version/.* Safari/") &&
              !D.match("Chrom(e|ium)")))
        ) && U,
      R = !(!window.XMLHttpRequest || !("withCredentials" in new XMLHttpRequest())),
      V = "get" !== o && R && ("post" === o || U),
      H = V ? r : "/i",
      G = "snowplowOutQueue_".concat(e, "_").concat(V ? "post2" : "get");
    if (
      (U && (f = {}),
      (i =
        (t &&
          (function () {
            try {
              var e = !!window.localStorage;
            } catch (n) {
              e = !0;
            }
            if (!e) return !1;
            try {
              var n = window.localStorage;
              return n.setItem("modernizr", "modernizr"), n.removeItem("modernizr"), !0;
            } catch (e) {
              return !1;
            }
          })() &&
          V &&
          i) ||
        1),
      t)
    )
      try {
        var q = window.localStorage.getItem(G);
        M = q ? JSON.parse(q) : [];
      } catch (L) {}
    Array.isArray(M) || (M = []),
      n.outQueues.push(M),
      R &&
        1 < i &&
        n.bufferFlushers.push(function (e) {
          B || P(e);
        });
    var J = function (e) {
      return "object" == typeof e[0] && "evt" in e[0];
    };
    return {
      enqueueRequest: function (e, n) {
        if (((j = n + H), V)) {
          if ((e = k(e)).bytes >= a) return Qe.warn("Event (" + e.bytes + "B) too big, max is " + a), void A(e, j);
          M.push(e);
        } else {
          var o,
            s = "?",
            l = { co: !0, cx: !0 },
            d = !0;
          for (o in e)
            e.hasOwnProperty(o) &&
              !l.hasOwnProperty(o) &&
              (d ? (d = !1) : (s += "&"), (s += encodeURIComponent(o) + "=" + encodeURIComponent(e[o])));
          for (var f in l)
            e.hasOwnProperty(f) && l.hasOwnProperty(f) && (s += "&" + f + "=" + encodeURIComponent(e[f]));
          if (0 < c && (l = b((l = E(s)))) >= c)
            return Qe.warn("Event (" + l + "B) too big, max is " + c), void (R && ((e = k(e)), A(e, n + r)));
          M.push(s);
        }
        (n = !1), t && (n = S(G, JSON.stringify(M.slice(0, u)))), B || (n && !(M.length >= i)) || P();
      },
      executeQueue: function () {
        B || P();
      },
      setUseLocalStorage: function (e) {
        t = e;
      },
      setAnonymousTracking: function (e) {
        d = e;
      },
      setCollectorUrl: function (e) {
        j = e + H;
      },
      setBufferSize: function (e) {
        i = e;
      },
    };
  }
  function K(e, n, t) {
    return (
      "translate.googleusercontent.com" === e
        ? ("" === t && (t = n),
          (e = D(
            (n =
              null !=
              (e =
                (e = /^(?:https?|ftp)(?::\/*(?:[^?]+))([?][^#]+)/.exec(n)) && 1 < (null == e ? void 0 : e.length)
                  ? z("u", e[1])
                  : null)
                ? e
                : ""),
          )))
        : ("cc.bingj.com" !== e && "webcache.googleusercontent.com" !== e) || (e = D((n = document.links[0].href))),
      [e, n, t]
    );
  }
  function W(e, n) {
    return (
      void 0 === n && (n = { memorizedVisitCount: 1 }),
      (n = n.memorizedVisitCount),
      "0" === e[0] ? ((e[7] = e[6]), (e[5] = e[4]), e[3]++) : (e[3] = n),
      (n = We.v4()),
      (e[6] = n),
      (e[10] = 0),
      (e[8] = ""),
      (e[9] = void 0),
      n
    );
  }
  function X(e) {
    e[4] = Math.round(new Date().getTime() / 1e3);
  }
  function Q(e, n, t) {
    var o = e[9];
    return {
      userId: t ? "00000000-0000-0000-0000-000000000000" : e[1],
      sessionId: e[6],
      eventIndex: e[10],
      sessionIndex: e[3],
      previousSessionId: t ? null : e[7] || null,
      storageMechanism: "localStorage" == n ? "LOCAL_STORAGE" : "COOKIE_1",
      firstEventId: e[8] || null,
      firstEventTimestamp: o ? new Date(o).toISOString() : null,
    };
  }
  function Z() {
    var e = $;
    if ("innerWidth" in window)
      var n = window.innerWidth,
        t = window.innerHeight;
    else (n = (t = document.documentElement || document.body).clientWidth), (t = t.clientHeight);
    (e = e(0 <= n && 0 <= t ? n + "x" + t : null)), (n = $);
    var o = document.documentElement,
      r = document.body;
    return (
      (t = Math.max(o.clientWidth, o.offsetWidth, o.scrollWidth)),
      (o = Math.max(o.clientHeight, o.offsetHeight, o.scrollHeight, r ? Math.max(r.offsetHeight, r.scrollHeight) : 0)),
      {
        viewport: e,
        documentSize: n((t = isNaN(t) || isNaN(o) ? "" : t + "x" + o)),
        resolution: $(screen.width + "x" + screen.height),
        colorDepth: screen.colorDepth,
        devicePixelRatio: window.devicePixelRatio,
        cookiesEnabled: window.navigator.cookieEnabled,
        online: window.navigator.onLine,
        browserLanguage: window.navigator.language || window.navigator.userLanguage,
        documentLanguage: document.documentElement.lang,
        webdriver: window.navigator.webdriver,
        deviceMemory: window.navigator.deviceMemory,
        hardwareConcurrency: window.navigator.hardwareConcurrency,
      }
    );
  }
  function $(e) {
    return (
      e &&
      e
        .split("x")
        .map(function (e) {
          return Math.floor(Number(e));
        })
        .join("x")
    );
  }
  function ee(e, o, r, i, a, c) {
    void 0 === c && (c = {});
    var s = [];
    e = (function (e, o, r, i, a, c) {
      function u() {
        (tn = K(window.location.hostname, window.location.href, B()))[1] !== cn && (sn = B(cn)),
          (on = N(tn[0])),
          (cn = tn[1]);
      }
      function l(e) {
        return function (n) {
          var t = n.currentTarget;
          if (
            ((n = (function (e, n, t) {
              var o,
                r = new Date().getTime();
              n = je(je({}, an), n);
              var i = t.domainUserId,
                a = t.userId,
                c = t.sessionId,
                s = t.sourceId,
                u = t.sourcePlatform,
                l = t.event,
                d = l.currentTarget;
              return (
                (l =
                  "function" == typeof n.reason
                    ? n.reason(l)
                    : null === (o = null == d ? void 0 : d.textContent) || void 0 === o
                      ? void 0
                      : o.trim()),
                e
                  ? [
                      i,
                      r,
                      n.sessionId && c,
                      n.userId && I(a || ""),
                      n.sourceId && I(s || ""),
                      n.sourcePlatform && u,
                      n.reason && I(l || ""),
                    ]
                      .map(function (e) {
                        return e || "";
                      })
                      .join(".")
                      .replace(/([.]*$)/, "")
                  : t.domainUserId + "." + r
              );
            })(e, Un, {
              domainUserId: Ye,
              userId: Xe || void 0,
              sessionId: Ke,
              sourceId: fn,
              sourcePlatform: un,
              event: n,
            })),
            null != t && t.href)
          ) {
            n = "_sp=" + n;
            var o = t.href.split("#"),
              r = o[0].split("?"),
              i = r.shift();
            if ((r = r.join("?"))) {
              for (var a = !0, c = r.split("&"), s = 0; s < c.length; s++)
                if ("_sp=" === c[s].substr(0, 4)) {
                  (a = !1), (c[s] = n), (r = c.join("&"));
                  break;
                }
              a && (r = n + "&" + r);
            } else r = n;
            (o[0] = i + "?" + r), (n = o.join("#")), (t.href = n);
          }
        };
      }
      function d(e) {
        for (var n = l(zn), t = 0; t < document.links.length; t++) {
          var o = document.links[t];
          !o.spDecorationEnabled &&
            e(o) &&
            (o.addEventListener("click", n, !0), o.addEventListener("mousedown", n, !0), (o.spDecorationEnabled = !0));
        }
      }
      function f(e) {
        if (ze) {
          var n = /#.*/;
          e = e.replace(n, "");
        }
        return Ue && ((n = /[{}]/g), (e = e.replace(n, ""))), e;
      }
      function m(e) {
        return (e = /^([a-z]+):/.exec(e)) ? e[1] : null;
      }
      function p(e) {
        if (((e = vn + e + "." + Je), "localStorage" == Sn)) {
          try {
            var n = window.localStorage,
              t = n.getItem(e + ".expires");
            if (null === t || +t > Date.now()) var o = n.getItem(e);
            else n.removeItem(e), n.removeItem(e + ".expires"), (o = void 0);
          } catch (e) {
            o = void 0;
          }
          return o;
        }
        if ("cookie" == Sn || "cookieAndLocalStorage" == Sn) return U(e);
      }
      function v() {
        u(), (Je = rn((gn || on) + (hn || "/")).slice(0, 4));
      }
      function g() {
        Re = new Date().getTime();
      }
      function h() {
        var e = y(),
          n = e[0];
        n < Ve ? (Ve = n) : n > He && (He = n), (e = e[1]) < Ge ? (Ge = e) : e > qe && (qe = e), g();
      }
      function y() {
        var e = document.documentElement;
        return e ? [e.scrollLeft || window.pageXOffset, e.scrollTop || window.pageYOffset] : [0, 0];
      }
      function w() {
        var e = y(),
          n = e[0];
        (He = Ve = n), (qe = Ge = e = e[1]);
      }
      function k() {
        return A(vn + "ses." + Je, "*", _n);
      }
      function b(e) {
        var t = vn + "id." + Je,
          o = Cn;
        return (e = n([], e, !0)), o && ((e[1] = ""), (e[7] = "")), e.shift(), A(t, (o = e.join(".")), An);
      }
      function A(e, n, t) {
        return (
          !(Cn && !Tn) &&
          ("localStorage" == Sn
            ? S(e, n, t)
            : ("cookie" == Sn || "cookieAndLocalStorage" == Sn) &&
              (U(e, n, t, hn, gn, yn, wn), -1 !== document.cookie.indexOf("".concat(e, "="))))
        );
      }
      function T(e) {
        var n = vn + "id." + Je,
          t = vn + "ses." + Je;
        O(n),
          O(t),
          U(n, "", -1, "/", gn, yn, wn),
          U(t, "", -1, "/", gn, yn, wn),
          (null != e && e.preserveSession) || ((Ke = We.v4()), (xn = 1)),
          (null != e && e.preserveUser) || ((Ye = Cn ? "" : We.v4()), (Xe = null));
      }
      function P(e) {
        e && e.stateStorageStrategy && ((c.stateStorageStrategy = e.stateStorageStrategy), (Sn = xe(c))),
          (Cn = !!c.anonymousTracking),
          (Tn = Ie(c)),
          (Pn = Ee(c)),
          In.setUseLocalStorage("localStorage" == Sn || "cookieAndLocalStorage" == Sn),
          In.setAnonymousTracking(Pn);
      }
      function C() {
        if (!Cn || Tn) {
          var e = "none" != Sn && !!p("ses"),
            n = j();
          if (n[1]) var t = n[1];
          else (t = Cn ? "" : We.v4()), (n[1] = t);
          (Ye = t), (Ke = e ? n[6] : W(n)), (xn = n[3]), "none" != Sn && (k(), X(n), b(n));
        }
      }
      function j() {
        return "none" == Sn
          ? ["1", "", 0, 0, 0, void 0, "", "", "", void 0, 0]
          : (function (e, n, t, o) {
              var r = Math.round(new Date().getTime() / 1e3);
              e ? (e = e.split(".")).unshift("0") : (e = ["1", n, r, o, r, "", t]),
                (e[6] && "undefined" !== e[6]) || (e[6] = We.v4()),
                (e[7] && "undefined" !== e[7]) || (e[7] = ""),
                (e[8] && "undefined" !== e[8]) || (e[8] = ""),
                (e[9] && "undefined" !== e[9]) || (e[9] = ""),
                (e[10] && "undefined" !== e[10]) || (e[10] = 0);
              var i = function (e, n) {
                return (e = parseInt(e)), isNaN(e) ? n : e;
              };
              return (
                (n = function (e) {
                  return e ? i(e, void 0) : void 0;
                }),
                [e[0], e[1], i(e[2], r), i(e[3], o), i(e[4], r), n(e[5]), e[6], e[7], e[8], n(e[9]), i(e[10], 0)]
              );
            })(p("id") || void 0, Ye, Ke, xn);
      }
      function F(e) {
        return 0 === e.indexOf("http") ? e : ("https:" === document.location.protocol ? "https" : "http") + "://" + e;
      }
      function R() {
        (En && null != a.pageViewId) || (a.pageViewId = We.v4());
      }
      function V() {
        return null == a.pageViewId && (a.pageViewId = We.v4()), a.pageViewId;
      }
      function H() {
        if ("none" === Sn || Cn || !De) return null;
        var e = x("_sp_tab_id");
        if (!e) {
          e = We.v4();
          try {
            window.sessionStorage.setItem("_sp_tab_id", e);
          } catch (e) {}
          e = x("_sp_tab_id");
        }
        return e || null;
      }
      function G(e) {
        var n = e.title,
          o = e.context,
          r = e.timestamp;
        if (
          ((e = e.contextCallback),
          u(),
          jn && R(),
          (jn = !0),
          (mn = document.title),
          (n = L((Me = n) || mn)),
          en.track(
            (function (e) {
              var n = e.pageUrl,
                o = e.pageTitle;
              e = e.referrer;
              var r = t();
              return r.add("e", "pv"), r.add("url", n), r.add("page", o), r.add("refr", e), r;
            })({ pageUrl: f(Be || cn), pageTitle: n, referrer: f(Ne || sn) }),
            (o || []).concat(e ? e() : []),
            r,
          ),
          (r = new Date()),
          (n = !1),
          Ln.enabled && !Ln.installed)
        ) {
          n = Ln.installed = !0;
          var i = {
            update: function () {
              if ("undefined" != typeof window && "function" == typeof window.addEventListener) {
                var e = !1,
                  n = Object.defineProperty({}, "passive", {
                    get: function () {
                      e = !0;
                    },
                    set: function () {},
                  }),
                  t = function () {};
                window.addEventListener("testPassiveEventSupport", t, n),
                  window.removeEventListener("testPassiveEventSupport", t, n),
                  (i.hasSupport = e);
              }
            },
          };
          i.update();
          var a =
            "onwheel" in document.createElement("div")
              ? "wheel"
              : void 0 !== document.onmousewheel
                ? "mousewheel"
                : "DOMMouseScroll";
          Object.prototype.hasOwnProperty.call(i, "hasSupport")
            ? M(document, a, g, { passive: !0 })
            : M(document, a, g),
            w(),
            (a = function (e, n) {
              return (
                void 0 === n && (n = g),
                function (e) {
                  return M(document, e, n);
                }
              );
            }),
            "click mouseup mousedown mousemove keypress keydown keyup touchend touchstart"
              .split(" ")
              .forEach(a(document)),
            ["resize", "focus", "blur"].forEach(a(window)),
            a(window, h)("scroll");
        }
        if (Ln.enabled && (pn || n))
          for (r in ((Re = r.getTime()), (r = void 0), Ln.configurations))
            (n = Ln.configurations[r]) && (window.clearInterval(n.activityInterval), q(n, o, e));
      }
      function q(e, n, t) {
        var o = function (e, n) {
            u(),
              e({ context: n, pageViewId: V(), minXOffset: Ve, minYOffset: Ge, maxXOffset: He, maxYOffset: qe }),
              w();
          },
          r = function () {
            Re + e.configHeartBeatTimer > new Date().getTime() && o(e.callback, (n || []).concat(t ? t() : []));
          };
        e.activityInterval =
          0 === e.configMinimumVisitLength
            ? window.setInterval(r, e.configHeartBeatTimer)
            : window.setTimeout(function () {
                Re + e.configMinimumVisitLength > new Date().getTime() && o(e.callback, (n || []).concat(t ? t() : [])),
                  (e.activityInterval = window.setInterval(r, e.configHeartBeatTimer));
              }, e.configMinimumVisitLength);
      }
      function J(e) {
        var n = e.minimumVisitLength,
          t = e.heartbeatDelay;
        if (((e = e.callback), E(n) && E(t)))
          return { configMinimumVisitLength: 1e3 * n, configHeartBeatTimer: 1e3 * t, callback: e };
        Qe.error("Activity tracking minimumVisitLength & heartbeatDelay must be integers");
      }
      function $(e) {
        var n = e.context,
          o = e.minXOffset,
          r = e.minYOffset,
          i = e.maxXOffset,
          a = e.maxYOffset;
        (e = document.title) !== mn && ((mn = e), (Me = void 0));
        var c = (e = en).track,
          s = f(Be || cn),
          u = L(Me || mn),
          l = f(Ne || sn);
        (o = Math.round(o)), (i = Math.round(i)), (r = Math.round(r)), (a = Math.round(a));
        var d = t();
        d.add("e", "pp"),
          d.add("url", s),
          d.add("page", u),
          d.add("refr", l),
          o && !isNaN(Number(o)) && d.add("pp_mix", o.toString()),
          i && !isNaN(Number(i)) && d.add("pp_max", i.toString()),
          r && !isNaN(Number(r)) && d.add("pp_miy", r.toString()),
          a && !isNaN(Number(a)) && d.add("pp_may", a.toString()),
          c.call(e, d, n);
      }
      function ee(e) {
        var n = Ln.configurations[e];
        0 === (null == n ? void 0 : n.configMinimumVisitLength)
          ? window.clearTimeout(null == n ? void 0 : n.activityInterval)
          : window.clearInterval(null == n ? void 0 : n.activityInterval),
          (Ln.configurations[e] = void 0);
      }
      var ne,
        te,
        oe,
        re,
        ie,
        ae,
        ce,
        se,
        ue,
        le,
        de,
        fe,
        me,
        pe,
        ve,
        ge,
        he,
        ye,
        we,
        ke,
        be,
        Ae,
        _e,
        Te,
        Pe,
        Ce,
        Se,
        Oe;
      c.eventMethod = null !== (ne = c.eventMethod) && void 0 !== ne ? ne : "post";
      var xe = function (e) {
          var n;
          return null !== (n = e.stateStorageStrategy) && void 0 !== n ? n : "cookieAndLocalStorage";
        },
        Ie = function (e) {
          var n, t;
          return (
            "boolean" != typeof e.anonymousTracking &&
            null !==
              (t = !0 === (null === (n = e.anonymousTracking) || void 0 === n ? void 0 : n.withSessionTracking)) &&
            void 0 !== t &&
            t
          );
        },
        Ee = function (e) {
          var n, t;
          return (
            "boolean" != typeof e.anonymousTracking &&
            null !==
              (t = !0 === (null === (n = e.anonymousTracking) || void 0 === n ? void 0 : n.withServerAnonymisation)) &&
            void 0 !== t &&
            t
          );
        },
        Le =
          null !== (oe = null === (te = null == c ? void 0 : c.contexts) || void 0 === te ? void 0 : te.browser) &&
          void 0 !== oe &&
          oe,
        De =
          null === (ie = null === (re = null == c ? void 0 : c.contexts) || void 0 === re ? void 0 : re.webPage) ||
          void 0 === ie ||
          ie;
      s.push({
        beforeTrack: function (e) {
          var n = p("ses"),
            t = j(),
            o = 0 === t[10];
          if (((Ze = !!Fe && !!U(Fe)), bn || Ze)) T();
          else {
            if (
              ("0" === t[0]
                ? ((Ke = n || "none" == Sn ? t[6] : W(t)), (xn = t[3]))
                : new Date().getTime() - On > 1e3 * _n && (xn++, (Ke = W(t, { memorizedVisitCount: xn }))),
              X(t),
              0 === t[10])
            ) {
              var r = e.build();
              (t[8] = r.eid), (r = r.dtm || r.ttm), (t[9] = r ? parseInt(r) : void 0);
            }
            t[10] += 1;
            var i = (r = Z()).documentSize;
            e.add("vp", r.viewport),
              e.add("ds", i),
              e.add("vid", Tn ? xn : Cn ? null : xn),
              e.add("sid", Tn ? Ke : Cn ? null : Ke),
              e.add("duid", Cn ? null : t[1]),
              e.add("uid", Cn ? null : Xe),
              u(),
              e.add("refr", f(Ne || sn)),
              e.add("url", f(Be || cn)),
              (r = Q(t, Sn, Cn)),
              !Dn ||
                (Cn && !Tn) ||
                e.addContextEntity({
                  schema: "iglu:com.snowplowanalytics.snowplow/client_session/jsonschema/1-0-2",
                  data: r,
                }),
              "none" != Sn && (b(t), (e = k()), (n && !o) || !e || !Nn || Bn || (Nn(r), (Bn = !1))),
              (On = new Date().getTime());
          }
        },
      }),
        De &&
          s.push({
            contexts: function () {
              return [{ schema: "iglu:com.snowplowanalytics.snowplow/web_page/jsonschema/1-0-0", data: { id: V() } }];
            },
          }),
        Le &&
          s.push({
            contexts: function () {
              return [
                {
                  schema: "iglu:com.snowplowanalytics.snowplow/browser_context/jsonschema/2-0-0",
                  data: je(je({}, Z()), { tabId: H() }),
                },
              ];
            },
          }),
        s.push.apply(s, null !== (ae = c.plugins) && void 0 !== ae ? ae : []);
      var Ne,
        Be,
        Me,
        ze,
        Ue,
        Fe,
        Re,
        Ve,
        He,
        Ge,
        qe,
        Je,
        Ye,
        Ke,
        Xe,
        Ze,
        $e,
        en = _({
          base64: c.encodeBase64,
          corePlugins: s,
          callback: function (e) {
            bn || Ze || In.enqueueRequest(e.build(), ln);
          },
        }),
        nn = document.characterSet || document.charset,
        tn = K(window.location.hostname, window.location.href, B()),
        on = N(tn[0]),
        cn = tn[1],
        sn = tn[2],
        un = null !== (ce = c.platform) && void 0 !== ce ? ce : "web",
        ln = F(i),
        dn = null !== (se = c.postPath) && void 0 !== se ? se : "/com.snowplowanalytics.snowplow/tp2",
        fn = null !== (ue = c.appId) && void 0 !== ue ? ue : "",
        mn = document.title,
        pn = null === (le = c.resetActivityTrackingOnPageView) || void 0 === le || le,
        vn = null !== (de = c.cookieName) && void 0 !== de ? de : "_sp_",
        gn = null !== (fe = c.cookieDomain) && void 0 !== fe ? fe : void 0,
        hn = "/",
        yn = null !== (me = c.cookieSameSite) && void 0 !== me ? me : "None",
        wn = null === (pe = c.cookieSecure) || void 0 === pe || pe,
        kn = window.navigator.doNotTrack || window.navigator.msDoNotTrack || window.doNotTrack,
        bn = void 0 !== c.respectDoNotTrack && c.respectDoNotTrack && ("yes" === kn || "1" === kn),
        An = null !== (ve = c.cookieLifetime) && void 0 !== ve ? ve : 63072e3,
        _n = null !== (ge = c.sessionCookieTimeout) && void 0 !== ge ? ge : 1800,
        Tn = Ie(c),
        Pn = Ee(c),
        Cn = !!c.anonymousTracking,
        Sn = xe(c),
        On = new Date().getTime(),
        xn = 1,
        In = Y(
          e,
          a,
          "localStorage" == Sn || "cookieAndLocalStorage" == Sn,
          c.eventMethod,
          dn,
          null !== (he = c.bufferSize) && void 0 !== he ? he : 1,
          null !== (ye = c.maxPostBytes) && void 0 !== ye ? ye : 4e4,
          null !== (we = c.maxGetBytes) && void 0 !== we ? we : 0,
          null === (ke = c.useStm) || void 0 === ke || ke,
          null !== (be = c.maxLocalStorageQueueSize) && void 0 !== be ? be : 1e3,
          null !== (Ae = c.connectionTimeout) && void 0 !== Ae ? Ae : 5e3,
          Pn,
          null !== (_e = c.customHeaders) && void 0 !== _e ? _e : {},
          null === (Te = c.withCredentials) || void 0 === Te || Te,
          null !== (Pe = c.retryStatusCodes) && void 0 !== Pe ? Pe : [],
          (null !== (Ce = c.dontRetryStatusCodes) && void 0 !== Ce ? Ce : []).concat([400, 401, 403, 410, 422]),
          c.idService,
          c.retryFailedRequests,
          c.onRequestSuccess,
          c.onRequestFailure,
        ),
        En = !1,
        jn = !1,
        Ln = { enabled: !1, installed: !1, configurations: {} },
        Dn = null !== (Oe = null === (Se = c.contexts) || void 0 === Se ? void 0 : Se.session) && void 0 !== Oe && Oe,
        Nn = c.onSessionUpdateCallback,
        Bn = !1,
        Mn =
          "boolean" == typeof ($e = c.useExtendedCrossDomainLinker || !1)
            ? { useExtendedCrossDomainLinker: $e }
            : { useExtendedCrossDomainLinker: !0, collectCrossDomainAttributes: $e },
        zn = Mn.useExtendedCrossDomainLinker,
        Un = Mn.collectCrossDomainAttributes;
      c.hasOwnProperty("discoverRootDomain") &&
        c.discoverRootDomain &&
        (gn = (function (e, n) {
          for (
            var t = window.location.hostname,
              o = "_sp_root_domain_test_" + new Date().getTime(),
              r = "_test_value_" + new Date().getTime(),
              i = t.split("."),
              a = i.length - 2;
            0 <= a;
            a--
          ) {
            var c = i.slice(a).join(".");
            if ((U(o, r, 0, "/", c, e, n), U(o) === r)) {
              for (U(o, "", -1, "/", c, e, n), t = document.cookie.split("; "), o = [], r = 0; r < t.length; r++)
                "_sp_root_domain_test_" === t[r].substring(0, 21) && o.push(t[r]);
              for (t = o, o = 0; o < t.length; o++) U(t[o], "", -1, "/", c, e, n);
              return c;
            }
          }
          return t;
        })(yn, wn));
      var Fn = Z(),
        Rn = Fn.browserLanguage,
        Vn = Fn.resolution,
        Hn = Fn.colorDepth,
        Gn = Fn.cookiesEnabled;
      return (
        en.setTrackerVersion(r),
        en.setTrackerNamespace(o),
        en.setAppId(fn),
        en.setPlatform(un),
        en.addPayloadPair("cookie", Gn ? "1" : "0"),
        en.addPayloadPair("cs", nn),
        en.addPayloadPair("lang", Rn),
        en.addPayloadPair("res", Vn),
        en.addPayloadPair("cd", Hn),
        v(),
        C(),
        c.crossDomainLinker && d(c.crossDomainLinker),
        je(
          je(
            {},
            {
              getDomainSessionIndex: function () {
                return xn;
              },
              getPageViewId: V,
              getTabId: H,
              newSession: function () {
                var e = j();
                if (
                  ("0" === e[0]
                    ? ((Ke = "none" != Sn ? W(e) : e[6]), (xn = e[3]))
                    : (xn++, (Ke = W(e, { memorizedVisitCount: xn }))),
                  X(e),
                  "none" != Sn)
                ) {
                  var n = Q(e, Sn, Cn);
                  b(e), k() && Nn && ((Bn = !0), Nn(n));
                }
                On = new Date().getTime();
              },
              getCookieName: function (e) {
                return vn + e + "." + Je;
              },
              getUserId: function () {
                return Xe;
              },
              getDomainUserId: function () {
                return j()[1];
              },
              getDomainUserInfo: function () {
                return j();
              },
              setReferrerUrl: function (e) {
                Ne = e;
              },
              setCustomUrl: function (e) {
                u();
                var n,
                  t = cn;
                m(e)
                  ? (Be = e)
                  : "/" === e.slice(0, 1)
                    ? (Be = m(t) + "://" + D(t) + e)
                    : (0 <= (n = (t = f(t)).indexOf("?")) && (t = t.slice(0, n)),
                      (n = t.lastIndexOf("/")) !== t.length - 1 && (t = t.slice(0, n + 1)),
                      (Be = t + e));
              },
              setDocumentTitle: function (e) {
                (mn = document.title), (Me = e);
              },
              discardHashTag: function (e) {
                ze = e;
              },
              discardBrace: function (e) {
                Ue = e;
              },
              setCookiePath: function (e) {
                (hn = e), v();
              },
              setVisitorCookieTimeout: function (e) {
                An = e;
              },
              crossDomainLinker: function (e) {
                d(e);
              },
              enableActivityTracking: function (e) {
                Ln.configurations.pagePing ||
                  ((Ln.enabled = !0), (Ln.configurations.pagePing = J(je(je({}, e), { callback: $ }))));
              },
              enableActivityTrackingCallback: function (e) {
                Ln.configurations.callback || ((Ln.enabled = !0), (Ln.configurations.callback = J(e)));
              },
              disableActivityTracking: function () {
                ee("pagePing");
              },
              disableActivityTrackingCallback: function () {
                ee("callback");
              },
              updatePageActivity: function () {
                g();
              },
              setOptOutCookie: function (e) {
                Fe = e;
              },
              setUserId: function (e) {
                Xe = e;
              },
              setUserIdFromLocation: function (e) {
                u(), (Xe = z(e, cn));
              },
              setUserIdFromReferrer: function (e) {
                u(), (Xe = z(e, sn));
              },
              setUserIdFromCookie: function (e) {
                Xe = U(e);
              },
              setCollectorUrl: function (e) {
                (ln = F(e)), In.setCollectorUrl(ln);
              },
              setBufferSize: function (e) {
                In.setBufferSize(e);
              },
              flushBuffer: function (e) {
                void 0 === e && (e = {}), In.executeQueue(), e.newBufferSize && In.setBufferSize(e.newBufferSize);
              },
              trackPageView: function (e) {
                void 0 === e && (e = {}), G(e);
              },
              preservePageViewId: function () {
                En = !0;
              },
              disableAnonymousTracking: function (e) {
                (c.anonymousTracking = !1), P(e), C(), In.executeQueue();
              },
              enableAnonymousTracking: function (e) {
                var n;
                (c.anonymousTracking = null === (n = e && (null == e ? void 0 : e.options)) || void 0 === n || n),
                  P(e),
                  Tn || R();
              },
              clearUserData: T,
            },
          ),
          { id: e, namespace: o, core: en, sharedState: a },
        )
      );
    })(e, o, r, i, a, c);
    var u = je(je({}, e), {
      addPlugin: function (e) {
        var n, t;
        u.core.addPlugin(e), null === (t = (n = e.plugin).activateBrowserPlugin) || void 0 === t || t.call(n, u);
      },
    });
    return (
      s.forEach(function (e) {
        var n;
        null === (n = e.activateBrowserPlugin) || void 0 === n || n.call(e, u);
      }),
      u
    );
  }
  function ne(e, n) {
    try {
      re(null != e ? e : Object.keys(cn), cn).forEach(n);
    } catch (e) {
      Qe.error("Function failed", e);
    }
  }
  function te(e, n, t) {
    try {
      re(null != e ? e : Object.keys(n), n).forEach(t);
    } catch (e) {
      Qe.error("Function failed", e);
    }
  }
  function oe(e, n, t, o, r, i) {
    return cn.hasOwnProperty(e) ? null : ((cn[e] = ee(e, n, t, o, r, i)), cn[e]);
  }
  function re(e, n) {
    for (var t = [], o = 0; o < e.length; o++) {
      var r = e[o];
      n.hasOwnProperty(r) ? t.push(n[r]) : Qe.warn(r + " not configured");
    }
    return t;
  }
  function ie() {
    function e() {
      var e;
      if (!n.hasLoaded)
        for (n.hasLoaded = !0, e = 0; e < n.registeredOnLoadHandlers.length; e++) n.registeredOnLoadHandlers[e]();
      return !0;
    }
    var n = new sn(),
      t = document,
      o = window;
    return (
      t.visibilityState &&
        M(
          t,
          "visibilitychange",
          function () {
            "hidden" == t.visibilityState &&
              n.bufferFlushers.forEach(function (e) {
                e(!1);
              });
          },
          !1,
        ),
      M(
        o,
        "beforeunload",
        function () {
          n.bufferFlushers.forEach(function (e) {
            e(!1);
          });
        },
        !1,
      ),
      "loading" === document.readyState
        ? (t.addEventListener
            ? t.addEventListener("DOMContentLoaded", function n() {
                t.removeEventListener("DOMContentLoaded", n, !1), e();
              })
            : t.attachEvent &&
              t.attachEvent("onreadystatechange", function n() {
                "complete" === t.readyState && (t.detachEvent("onreadystatechange", n), e());
              }),
          M(o, "load", e, !1))
        : e(),
      n
    );
  }
  function ae(e) {
    return Array.isArray(e)
      ? e
      : "[object Object]" === Object.prototype.toString.call(e)
        ? Object.keys(e).map(function (n) {
            return e[n];
          })
        : [];
  }
  function ce(e) {
    return e.map(function (e) {
      return { brand: e.brand, version: e.version };
    });
  }
  function se(e) {
    var n = function () {
      var n = navigator.userAgentData;
      if (n) {
        var t = { isMobile: n.mobile, brands: ce(ae(n.brands)) };
        e &&
          n.getHighEntropyValues &&
          n
            .getHighEntropyValues(["platform", "platformVersion", "architecture", "model", "uaFullVersion"])
            .then(function (e) {
              (t.architecture = e.architecture),
                (t.model = e.model),
                (t.platform = e.platform),
                (t.uaFullVersion = e.uaFullVersion),
                (t.platformVersion = e.platformVersion);
            }),
          (function (e) {
            return !(
              !e ||
              "boolean" != typeof e.isMobile ||
              !Array.isArray(e.brands) ||
              0 === e.brands.length ||
              e.brands.some(function (e) {
                return "string" != typeof e.brand || "string" != typeof e.version;
              })
            );
          })(t) && (tn = t);
      }
    };
    return {
      activateBrowserPlugin: function () {
        tn || n();
      },
      contexts: function () {
        return tn ? [{ schema: "iglu:org.ietf/http_client_hints/jsonschema/1-0-0", data: tn }] : [];
      },
    };
  }
  function ue() {
    function e(e, n) {
      var t = window.optimizely;
      if (t && "function" == typeof t.get) {
        var o = t.get(e);
        void 0 !== n && void 0 !== o && (o = o[n]);
      }
      return o;
    }
    function n() {
      return ((n = e("state")),
      (t = n && n.getActiveExperimentIds()),
      (o = n && n.getVariationMap()),
      (r = e("visitor")),
      t.map(function (e) {
        var n = o[e],
          t = (n && n.name && n.name.toString()) || null;
        n = n && n.id;
        var i = (r && r.visitorId && r.visitorId.toString()) || null;
        return { experimentId: F(e) || null, variationName: t, variation: F(n) || null, visitorId: i };
      })).map(function (e) {
        return { schema: "iglu:com.optimizely.optimizelyx/summary/jsonschema/1-0-0", data: e };
      });
      var n, t, o, r;
    }
    return {
      contexts: function () {
        return window.optimizely ? n() : [];
      },
    };
  }
  function le() {
    return {
      contexts: function () {
        var e = window,
          n = (e = e.performance || e.mozPerformance || e.msPerformance || e.webkitPerformance).timing;
        return (e = e
          ? [
              {
                schema: "iglu:org.w3/PerformanceTiming/jsonschema/1-0-0",
                data: {
                  navigationStart: n.navigationStart,
                  redirectStart: n.redirectStart,
                  redirectEnd: n.redirectEnd,
                  fetchStart: n.fetchStart,
                  domainLookupStart: n.domainLookupStart,
                  domainLookupEnd: n.domainLookupEnd,
                  connectStart: n.connectStart,
                  secureConnectionStart: n.secureConnectionStart,
                  connectEnd: n.connectEnd,
                  requestStart: n.requestStart,
                  responseStart: n.responseStart,
                  responseEnd: n.responseEnd,
                  unloadEventStart: n.unloadEventStart,
                  unloadEventEnd: n.unloadEventEnd,
                  domLoading: n.domLoading,
                  domInteractive: n.domInteractive,
                  domContentLoadedEventStart: n.domContentLoadedEventStart,
                  domContentLoadedEventEnd: n.domContentLoadedEventEnd,
                  domComplete: n.domComplete,
                  loadEventStart: n.loadEventStart,
                  loadEventEnd: n.loadEventEnd,
                  msFirstPaint: n.msFirstPaint,
                  chromeFirstPaint: n.chromeFirstPaint,
                  requestEnd: n.requestEnd,
                  proxyStart: n.proxyStart,
                  proxyEnd: n.proxyEnd,
                },
              },
            ]
          : []);
      },
    };
  }
  function de() {
    var e;
    return {
      activateBrowserPlugin: function (n) {
        (e = n.id), (hn[n.id] = n);
      },
      contexts: function () {
        return yn[e] ? [{ schema: "iglu:com.snowplowanalytics.snowplow/gdpr/jsonschema/1-0-0", data: yn[e] }] : [];
      },
      logger: function (e) {
        pn = e;
      },
    };
  }
  function fe(e) {
    var n;
    return (
      void 0 === e && (e = !1),
      {
        activateBrowserPlugin: function (t) {
          (n = t.id), (kn[t.id] = [!1, void 0]), e && me([n]);
        },
        contexts: function () {
          var e,
            t = null === (e = kn[n]) || void 0 === e ? void 0 : e[1];
          return t ? [t] : [];
        },
      }
    );
  }
  function me(e) {
    void 0 === e && (e = Object.keys(kn));
    var n = navigator;
    e.forEach(function (e) {
      kn[e] = [!0, vn];
    }),
      !bn &&
        n.geolocation &&
        n.geolocation.getCurrentPosition &&
        ((bn = !0),
        n.geolocation.getCurrentPosition(function (e) {
          var n = e.coords;
          for (var t in ((vn = {
            schema: "iglu:com.snowplowanalytics.snowplow/geolocation_context/jsonschema/1-1-0",
            data: {
              latitude: n.latitude,
              longitude: n.longitude,
              latitudeLongitudeAccuracy: n.accuracy,
              altitude: n.altitude,
              altitudeAccuracy: n.altitudeAccuracy,
              bearing: n.heading,
              speed: n.speed,
              timestamp: Math.round(e.timestamp),
            },
          }),
          kn))
            Object.prototype.hasOwnProperty.call(kn, t) && kn[t][0] && (kn[t] = [!0, vn]);
        }));
  }
  function pe(e) {
    return (
      void 0 === e && (e = _n),
      {
        contexts: function () {
          var t = [],
            o = je(je({}, _n), e),
            r = o.ga4,
            i = o.ga4MeasurementId,
            a = o.cookiePrefix;
          if (o.ua) {
            var c = { schema: "iglu:com.google.analytics/cookies/jsonschema/1-0-0", data: {} };
            "__utma __utmb __utmc __utmv __utmz _ga".split(" ").forEach(function (e) {
              var n = U(e);
              n && (c.data[e] = n);
            }),
              t.push(c);
          }
          return (
            r &&
              ((o = Array.isArray(a) ? n([], a, !0) : [a]).unshift(""),
              o.forEach(function (e) {
                var o = U(e + "_ga"),
                  r = [];
                i &&
                  (Array.isArray(i) ? n([], i, !0) : [i]).forEach(function (n) {
                    var t = U(e + n.replace("G-", "_ga_"));
                    t && r.push({ measurement_id: n, session_cookie: t });
                  }),
                  (o || r.length) &&
                    t.push({
                      schema: "iglu:com.google.ga4/cookies/jsonschema/1-0-0",
                      data: { _ga: o, session_cookies: r.length ? r : void 0, cookie_prefix: e || void 0 },
                    });
              })),
            t
          );
        },
      }
    );
  }
  function ve() {
    return {
      activateBrowserPlugin: function (e) {
        Pn[e.id] = e;
      },
    };
  }
  function ge(e, n, t) {
    for (
      var o, r, i, a;
      null !== (o = n.parentElement) && null != o && "A" !== (r = n.tagName.toUpperCase()) && "AREA" !== r;

    )
      n = o;
    if (null != (o = n).href) {
      i = (r = o.hostname || D(o.href)).toLowerCase();
      var s = o.href.replace(r, i);
      /^(javascript|vbscript|jscript|mocha|livescript|ecmascript):/i.test(s) ||
        ((r = o.id),
        (i = G(o)),
        (a = o.target),
        (o = Cn[e.id].linkTrackingContent ? o.innerHTML : void 0),
        (s = unescape(s)),
        e.core.track(
          P({ targetUrl: s, elementId: r, elementClasses: i, elementTarget: a, elementContent: o }),
          c(t, n),
        ));
    }
  }
  function he(e, n) {
    return function (t) {
      var o = (t = t || window.event).which || t.button,
        r = t.target || t.srcElement;
      "click" === t.type
        ? r && ge(Pn[e], r, n)
        : "mousedown" === t.type
          ? (1 !== o && 2 !== o) || !r
            ? (Cn[e].lastButton = Cn[e].lastTarget = null)
            : ((Cn[e].lastButton = o), (Cn[e].lastTarget = r))
          : "mouseup" === t.type &&
            (o === Cn[e].lastButton && r === Cn[e].lastTarget && ge(Pn[e], r, n),
            (Cn[e].lastButton = Cn[e].lastTarget = null));
    };
  }
  function ye(e, n) {
    (e = void 0 === e ? {} : e),
      (Cn[n] = {
        linkTrackingContent: e.trackContent,
        linkTrackingContext: e.context,
        linkTrackingPseudoClicks: e.pseudoClicks,
        linkTrackingFilter: V(e.options),
      });
  }
  function we(e) {
    var n,
      t,
      o,
      r = document.links;
    for (o = 0; o < r.length; o++)
      if (null !== (t = (n = Cn[e]).linkTrackingFilter) && void 0 !== t && t.call(n, r[o]) && !r[o][e]) {
        var i = e,
          a = r[o];
        Cn[i].linkTrackingPseudoClicks
          ? (M(a, "mouseup", he(i, Cn[i].linkTrackingContext), !1),
            M(a, "mousedown", he(i, Cn[i].linkTrackingContext), !1))
          : M(a, "click", he(i, Cn[i].linkTrackingContext), !1),
          (r[o][e] = !0);
      }
  }
  function ke(e, n) {
    var t,
      o = n.context,
      r = e.id + "form",
      i = (function (e) {
        if (e) {
          var n = function (e) {
              return !0;
            },
            t = null;
          return (
            !(function (e) {
              return null != e && 0 < Array.prototype.slice.call(e).length;
            })(e.forms)
              ? (n = V(e.forms))
              : (t = e.forms),
            {
              forms: t,
              formFilter: n,
              fieldFilter: H(e.fields),
              fieldTransform: be(e.fields),
              eventFilter: function (n) {
                var t;
                return -1 < (null !== (t = e.events) && void 0 !== t ? t : On).indexOf(n);
              },
            }
          );
        }
        return {
          forms: null,
          formFilter: function () {
            return !0;
          },
          fieldFilter: function () {
            return !0;
          },
          fieldTransform: In,
          eventFilter: function () {
            return !0;
          },
        };
      })(n.options);
    (n = null !== (t = i.forms) && void 0 !== t ? t : document.getElementsByTagName("form")),
      Array.prototype.slice.call(n).forEach(function (n) {
        i.formFilter(n) &&
          (Array.prototype.slice.call(xn).forEach(function (t) {
            Array.prototype.slice.call(n.getElementsByTagName(t)).forEach(function (n) {
              i.fieldFilter(n) &&
                !n[r] &&
                "password" !== n.type.toLowerCase() &&
                (i.eventFilter(gn.FOCUS_FORM) && M(n, "focus", _e(e, i, "focus_form", o), !1),
                i.eventFilter(gn.CHANGE_FORM) && M(n, "change", _e(e, i, "change_form", o), !1),
                (n[r] = !0));
            });
          }),
          n[r] ||
            (i.eventFilter(gn.SUBMIT_FORM) &&
              M(
                n,
                "submit",
                (function (e, n, t, o) {
                  return function (r) {
                    var i;
                    r = r.target;
                    var a = (function (e, n) {
                      var t = [];
                      return (
                        Array.prototype.slice.call(xn).forEach(function (o) {
                          (o = Array.prototype.slice.call(n.getElementsByTagName(o)).filter(function (n) {
                            return n.hasOwnProperty(e);
                          })),
                            Array.prototype.slice.call(o).forEach(function (e) {
                              if ("submit" !== e.type) {
                                var n = {
                                  elementData: { name: Ae(e), value: e.value, nodeName: e.nodeName },
                                  originalElement: e,
                                };
                                e.type && "INPUT" === e.nodeName.toUpperCase() && (n.elementData.type = e.type),
                                  ("checkbox" !== e.type && "radio" !== e.type) ||
                                    e.checked ||
                                    (n.elementData.value = null),
                                  t.push(n);
                              }
                            });
                        }),
                        t
                      );
                    })(t, r);
                    a.forEach(function (e) {
                      var t,
                        o = e.elementData;
                      o.value =
                        null !== (t = n.fieldTransform(o.value, o, e.originalElement)) && void 0 !== t ? t : o.value;
                    }),
                      (a = a.map(function (e) {
                        return e.elementData;
                      })),
                      e.core.track(
                        (function (e) {
                          return T({
                            event: {
                              schema: "iglu:com.snowplowanalytics.snowplow/submit_form/jsonschema/1-0-0",
                              data: C({ formId: e.formId, formClasses: e.formClasses, elements: e.elements }),
                            },
                          });
                        })({ formId: null !== (i = Ae(r)) && void 0 !== i ? i : "", formClasses: G(r), elements: a }),
                        c(o, r, a),
                      );
                  };
                })(e, i, r, o),
              ),
            (n[r] = !0)));
      });
  }
  function be(e) {
    return e && Object.prototype.hasOwnProperty.call(e, "transform") ? e.transform : In;
  }
  function Ae(e) {
    for (var n = 0, t = ["name", "id", "type", "nodeName"]; n < t.length; n++) {
      var o = t[n];
      if (0 != e[o] && "string" == typeof e[o]) return e[o];
    }
    return null;
  }
  function _e(e, n, t, o) {
    return function (r) {
      var i;
      if ((r = r.target)) {
        var a = r.nodeName && "INPUT" === r.nodeName.toUpperCase() ? r.type : null,
          s = "checkbox" !== r.type || r.checked ? n.fieldTransform(r.value, r, r) : null;
        if ("change_form" === t || ("checkbox" !== a && "radio" !== a)) {
          var u,
            l = e.core,
            d = l.track;
          for (u = r; u && u.nodeName && "HTML" !== u.nodeName.toUpperCase() && "FORM" !== u.nodeName.toUpperCase(); )
            u = u.parentNode;
          u = null != (u = u && u.nodeName && "FORM" === u.nodeName.toUpperCase() ? Ae(u) : null) ? u : "";
          var f = null !== (i = Ae(r)) && void 0 !== i ? i : "";
          (i = ""),
            (u = { formId: u, elementId: f, nodeName: r.nodeName, elementClasses: G(r), value: null != s ? s : null }),
            "change_form" === t
              ? ((i = "iglu:com.snowplowanalytics.snowplow/change_form/jsonschema/1-0-0"), (u.type = a))
              : "focus_form" === t &&
                ((i = "iglu:com.snowplowanalytics.snowplow/focus_form/jsonschema/1-0-0"), (u.elementType = a)),
            (i = T({ event: { schema: i, data: C(u, { value: !0 }) } })),
            d.call(l, i, c(o, r, a, s));
        }
      }
    };
  }
  function Te() {
    return {
      activateBrowserPlugin: function (e) {
        En[e.id] = e;
      },
    };
  }
  function Pe() {
    return {
      activateBrowserPlugin: function (e) {
        Ln[e.id] = e;
      },
    };
  }
  function Ce(e, n) {
    void 0 === n && (n = Object.keys(Ln));
    var t = e.message,
      o = e.filename,
      r = e.lineno,
      i = e.colno,
      a = e.error,
      c = e.context,
      s = e.timestamp,
      u = a && a.stack ? a.stack : null;
    te(n, Ln, function (e) {
      e.core.track(
        T({
          event: {
            schema: "iglu:com.snowplowanalytics.snowplow/application_error/jsonschema/1-0-1",
            data: {
              programmingLanguage: "JAVASCRIPT",
              message: null != t ? t : "JS Exception. Browser doesn't support ErrorEvent API",
              stackTrace: u,
              lineNumber: r,
              lineColumn: i,
              fileName: o,
            },
          },
        }),
        c,
        s,
      );
    });
  }
  function Se() {
    return {
      activateBrowserPlugin: function (e) {
        e.core.setTimezone(Nn.exports.determine("undefined" != typeof Intl).name());
      },
    };
  }
  function Oe() {
    return {
      activateBrowserPlugin: function (e) {
        (Mn[e.id] = e), (zn[e.id] = { items: [] });
      },
    };
  }
  function xe() {
    return {
      activateBrowserPlugin: function (e) {
        (Fn[e.id] = e), (Rn[e.id] = []);
      },
    };
  }
  function Ie() {
    return {
      activateBrowserPlugin: function (e) {
        Hn[e.id] = e;
      },
    };
  }
  function Ee() {
    return {
      activateBrowserPlugin: function (e) {
        qn[e.id] = e;
      },
    };
  }
  var je = function () {
      return (
        (je =
          Object.assign ||
          function (e) {
            for (var n, t = 1, o = arguments.length; t < o; t++)
              for (var r in (n = arguments[t])) Object.prototype.hasOwnProperty.call(n, r) && (e[r] = n[r]);
            return e;
          }),
        je.apply(this, arguments)
      );
    },
    Le = {},
    De =
      ("undefined" != typeof crypto && crypto.getRandomValues && crypto.getRandomValues.bind(crypto)) ||
      ("undefined" != typeof msCrypto &&
        "function" == typeof window.msCrypto.getRandomValues &&
        msCrypto.getRandomValues.bind(msCrypto));
  if (De) {
    var Ne = new Uint8Array(16);
    Le = function () {
      return De(Ne), Ne;
    };
  } else {
    var Be = Array(16);
    Le = function () {
      for (var e, n = 0; 16 > n; n++)
        0 == (3 & n) && (e = 4294967296 * Math.random()), (Be[n] = (e >>> ((3 & n) << 3)) & 255);
      return Be;
    };
  }
  for (var Me = [], ze = 0; 256 > ze; ++ze) Me[ze] = (ze + 256).toString(16).substr(1);
  var Ue,
    Fe,
    Re = function (e, n) {
      return (
        (n = n || 0),
        [
          Me[e[n++]],
          Me[e[n++]],
          Me[e[n++]],
          Me[e[n++]],
          "-",
          Me[e[n++]],
          Me[e[n++]],
          "-",
          Me[e[n++]],
          Me[e[n++]],
          "-",
          Me[e[n++]],
          Me[e[n++]],
          "-",
          Me[e[n++]],
          Me[e[n++]],
          Me[e[n++]],
          Me[e[n++]],
          Me[e[n++]],
          Me[e[n++]],
        ].join("")
      );
    },
    Ve = Le,
    He = 0,
    Ge = 0,
    qe = Le,
    Je = function (e, n, t) {
      if (
        ((t = (n && t) || 0),
        "string" == typeof e && ((n = "binary" === e ? Array(16) : null), (e = null)),
        ((e = (e = e || {}).random || (e.rng || qe)())[6] = (15 & e[6]) | 64),
        (e[8] = (63 & e[8]) | 128),
        n)
      )
        for (var o = 0; 16 > o; ++o) n[t + o] = e[o];
      return n || Re(e);
    };
  Je.v1 = function (e, n, t) {
    t = (n && t) || 0;
    var o = n || [],
      r = (e = e || {}).node || Ue,
      i = void 0 !== e.clockseq ? e.clockseq : Fe;
    if (null == r || null == i) {
      var a = Ve();
      null == r && (r = Ue = [1 | a[0], a[1], a[2], a[3], a[4], a[5]]),
        null == i && (i = Fe = 16383 & ((a[6] << 8) | a[7]));
    }
    a = void 0 !== e.msecs ? e.msecs : new Date().getTime();
    var c = void 0 !== e.nsecs ? e.nsecs : Ge + 1,
      s = a - He + (c - Ge) / 1e4;
    if (
      (0 > s && void 0 === e.clockseq && (i = (i + 1) & 16383),
      (0 > s || a > He) && void 0 === e.nsecs && (c = 0),
      1e4 <= c)
    )
      throw Error("uuid.v1(): Can't create more than 10M uuids/sec");
    for (
      He = a,
        Ge = c,
        Fe = i,
        e = (1e4 * (268435455 & (a += 122192928e5)) + c) % 4294967296,
        o[t++] = (e >>> 24) & 255,
        o[t++] = (e >>> 16) & 255,
        o[t++] = (e >>> 8) & 255,
        o[t++] = 255 & e,
        e = ((a / 4294967296) * 1e4) & 268435455,
        o[t++] = (e >>> 8) & 255,
        o[t++] = 255 & e,
        o[t++] = ((e >>> 24) & 15) | 16,
        o[t++] = (e >>> 16) & 255,
        o[t++] = (i >>> 8) | 128,
        o[t++] = 255 & i,
        i = 0;
      6 > i;
      ++i
    )
      o[t + i] = r[i];
    return n || Re(o);
  };
  var Ye,
    Ke,
    We = (Je.v4 = Je),
    Xe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  ((Ke = Ye || (Ye = {}))[(Ke.none = 0)] = "none"),
    (Ke[(Ke.error = 1)] = "error"),
    (Ke[(Ke.warn = 2)] = "warn"),
    (Ke[(Ke.debug = 3)] = "debug"),
    (Ke[(Ke.info = 4)] = "info");
  var Qe = (function (e) {
      return (
        void 0 === e && (e = Ye.warn),
        {
          setLogLevel: function (n) {
            e = Ye[n] ? n : Ye.warn;
          },
          warn: function (t, o) {
            for (var r = [], i = 2; i < arguments.length; i++) r[i - 2] = arguments[i];
            e >= Ye.warn &&
              "undefined" != typeof console &&
              ((i = "Snowplow: " + t),
              o ? console.warn.apply(console, n([i + "\n", o], r, !1)) : console.warn.apply(console, n([i], r, !1)));
          },
          error: function (t, o) {
            for (var r = [], i = 2; i < arguments.length; i++) r[i - 2] = arguments[i];
            e >= Ye.error &&
              "undefined" != typeof console &&
              ((i = "Snowplow: " + t + "\n"),
              o ? console.error.apply(console, n([i + "\n", o], r, !1)) : console.error.apply(console, n([i], r, !1)));
          },
          debug: function (t) {
            for (var o = [], r = 1; r < arguments.length; r++) o[r - 1] = arguments[r];
            e >= Ye.debug &&
              "undefined" != typeof console &&
              console.debug.apply(console, n(["Snowplow: " + t], o, !1));
          },
          info: function (t) {
            for (var o = [], r = 1; r < arguments.length; r++) o[r - 1] = arguments[r];
            e >= Ye.info && "undefined" != typeof console && console.info.apply(console, n(["Snowplow: " + t], o, !1));
          },
        }
      );
    })(),
    Ze = {},
    $e = {};
  !(function () {
    var e = {
      rotl: function (e, n) {
        return (e << n) | (e >>> (32 - n));
      },
      rotr: function (e, n) {
        return (e << (32 - n)) | (e >>> n);
      },
      endian: function (n) {
        if (n.constructor == Number) return (16711935 & e.rotl(n, 8)) | (4278255360 & e.rotl(n, 24));
        for (var t = 0; t < n.length; t++) n[t] = e.endian(n[t]);
        return n;
      },
      randomBytes: function (e) {
        for (var n = []; 0 < e; e--) n.push(Math.floor(256 * Math.random()));
        return n;
      },
      bytesToWords: function (e) {
        for (var n = [], t = 0, o = 0; t < e.length; t++, o += 8) n[o >>> 5] |= e[t] << (24 - (o % 32));
        return n;
      },
      wordsToBytes: function (e) {
        for (var n = [], t = 0; t < 32 * e.length; t += 8) n.push((e[t >>> 5] >>> (24 - (t % 32))) & 255);
        return n;
      },
      bytesToHex: function (e) {
        for (var n = [], t = 0; t < e.length; t++) n.push((e[t] >>> 4).toString(16)), n.push((15 & e[t]).toString(16));
        return n.join("");
      },
      hexToBytes: function (e) {
        for (var n = [], t = 0; t < e.length; t += 2) n.push(parseInt(e.substr(t, 2), 16));
        return n;
      },
      bytesToBase64: function (e) {
        for (var n = [], t = 0; t < e.length; t += 3)
          for (var o = (e[t] << 16) | (e[t + 1] << 8) | e[t + 2], r = 0; 4 > r; r++)
            8 * t + 6 * r <= 8 * e.length
              ? n.push(
                  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".charAt((o >>> (6 * (3 - r))) & 63),
                )
              : n.push("=");
        return n.join("");
      },
      base64ToBytes: function (e) {
        e = e.replace(/[^A-Z0-9+\/]/gi, "");
        for (var n = [], t = 0, o = 0; t < e.length; o = ++t % 4)
          0 != o &&
            n.push(
              (("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(e.charAt(t - 1)) &
                (Math.pow(2, -2 * o + 8) - 1)) <<
                (2 * o)) |
                ("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(e.charAt(t)) >>>
                  (6 - 2 * o)),
            );
        return n;
      },
    };
    $e = e;
  })();
  var en = {
      utf8: {
        stringToBytes: function (e) {
          return en.bin.stringToBytes(unescape(encodeURIComponent(e)));
        },
        bytesToString: function (e) {
          return decodeURIComponent(escape(en.bin.bytesToString(e)));
        },
      },
      bin: {
        stringToBytes: function (e) {
          for (var n = [], t = 0; t < e.length; t++) n.push(255 & e.charCodeAt(t));
          return n;
        },
        bytesToString: function (e) {
          for (var n = [], t = 0; t < e.length; t++) n.push(String.fromCharCode(e[t]));
          return n.join("");
        },
      },
    },
    nn = en;
  !(function () {
    var e = $e,
      n = nn.utf8,
      t = nn.bin,
      o = function (o, r) {
        var i = e.wordsToBytes,
          a = o;
        a.constructor == String
          ? (a = n.stringToBytes(a))
          : "undefined" != typeof Buffer && "function" == typeof Buffer.isBuffer && Buffer.isBuffer(a)
            ? (a = Array.prototype.slice.call(a, 0))
            : Array.isArray(a) || (a = a.toString()),
          (o = e.bytesToWords(a));
        var c = 8 * a.length;
        a = [];
        var s = 1732584193,
          u = -271733879,
          l = -1732584194,
          d = 271733878,
          f = -1009589776;
        for (o[c >> 5] |= 128 << (24 - (c % 32)), o[15 + (((c + 64) >>> 9) << 4)] = c, c = 0; c < o.length; c += 16) {
          for (var m = s, p = u, v = l, g = d, h = f, y = 0; 80 > y; y++) {
            if (16 > y) a[y] = o[c + y];
            else {
              var w = a[y - 3] ^ a[y - 8] ^ a[y - 14] ^ a[y - 16];
              a[y] = (w << 1) | (w >>> 31);
            }
            (w =
              ((s << 5) | (s >>> 27)) +
              f +
              (a[y] >>> 0) +
              (20 > y
                ? 1518500249 + ((u & l) | (~u & d))
                : 40 > y
                  ? 1859775393 + (u ^ l ^ d)
                  : 60 > y
                    ? ((u & l) | (u & d) | (l & d)) - 1894007588
                    : (u ^ l ^ d) - 899497514)),
              (f = d),
              (d = l),
              (l = (u << 30) | (u >>> 2)),
              (u = s),
              (s = w);
          }
          (s += m), (u += p), (l += v), (d += g), (f += h);
        }
        return (
          (i = i.call(e, [s, u, l, d, f])), r && r.asBytes ? i : r && r.asString ? t.bytesToString(i) : e.bytesToHex(i)
        );
      };
    (o._blocksize = 16), (o._digestsize = 20), (Ze = o);
  })();
  var tn,
    on,
    rn = Ze,
    an = { sessionId: !0, sourceId: !0, sourcePlatform: !1, userId: !1, reason: !1 },
    cn = {},
    sn = function () {
      (this.outQueues = []), (this.bufferFlushers = []), (this.hasLoaded = !1), (this.registeredOnLoadHandlers = []);
    },
    un = "undefined" != typeof window ? ie() : void 0,
    ln = Object.freeze({
      __proto__: null,
      addGlobalContexts: function (e, n) {
        ne(n, function (n) {
          n.core.addGlobalContexts(e);
        });
      },
      addPlugin: function (e, n) {
        ne(n, function (n) {
          n.addPlugin(e);
        });
      },
      clearGlobalContexts: function (e) {
        ne(e, function (e) {
          e.core.clearGlobalContexts();
        });
      },
      clearUserData: function (e, n) {
        ne(n, function (n) {
          n.clearUserData(e);
        });
      },
      crossDomainLinker: function (e, n) {
        ne(n, function (n) {
          n.crossDomainLinker(e);
        });
      },
      disableActivityTracking: function (e) {
        ne(e, function (e) {
          e.disableActivityTracking();
        });
      },
      disableActivityTrackingCallback: function (e) {
        ne(e, function (e) {
          e.disableActivityTrackingCallback();
        });
      },
      disableAnonymousTracking: function (e, n) {
        ne(n, function (n) {
          n.disableAnonymousTracking(e);
        });
      },
      discardBrace: function (e, n) {
        ne(n, function (n) {
          n.discardBrace(e);
        });
      },
      discardHashTag: function (e, n) {
        ne(n, function (n) {
          n.discardHashTag(e);
        });
      },
      enableActivityTracking: function (e, n) {
        ne(n, function (n) {
          n.enableActivityTracking(e);
        });
      },
      enableActivityTrackingCallback: function (e, n) {
        ne(n, function (n) {
          n.enableActivityTrackingCallback(e);
        });
      },
      enableAnonymousTracking: function (e, n) {
        ne(n, function (n) {
          n.enableAnonymousTracking(e);
        });
      },
      flushBuffer: function (e, n) {
        ne(n, function (n) {
          n.flushBuffer(e);
        });
      },
      newSession: function (e) {
        ne(e, function (e) {
          e.newSession();
        });
      },
      newTracker: function (e, n, t) {
        if ((void 0 === t && (t = {}), un)) return oe(e, e, "js-".concat("3.22.1"), n, un, t);
      },
      preservePageViewId: function (e) {
        ne(e, function (e) {
          e.preservePageViewId();
        });
      },
      removeGlobalContexts: function (e, n) {
        ne(n, function (n) {
          n.core.removeGlobalContexts(e);
        });
      },
      setBufferSize: function (e, n) {
        ne(n, function (n) {
          n.setBufferSize(e);
        });
      },
      setCollectorUrl: function (e, n) {
        ne(n, function (n) {
          n.setCollectorUrl(e);
        });
      },
      setCookiePath: function (e, n) {
        ne(n, function (n) {
          n.setCookiePath(e);
        });
      },
      setCustomUrl: function (e, n) {
        ne(n, function (n) {
          n.setCustomUrl(e);
        });
      },
      setDocumentTitle: function (e, n) {
        ne(n, function (n) {
          n.setDocumentTitle(e);
        });
      },
      setOptOutCookie: function (e, n) {
        ne(n, function (n) {
          n.setOptOutCookie(e);
        });
      },
      setReferrerUrl: function (e, n) {
        ne(n, function (n) {
          n.setReferrerUrl(e);
        });
      },
      setUserId: function (e, n) {
        ne(n, function (n) {
          n.setUserId(e);
        });
      },
      setUserIdFromCookie: function (e, n) {
        ne(n, function (n) {
          n.setUserIdFromCookie(e);
        });
      },
      setUserIdFromLocation: function (e, n) {
        ne(n, function (n) {
          n.setUserIdFromLocation(e);
        });
      },
      setUserIdFromReferrer: function (e, n) {
        ne(n, function (n) {
          n.setUserIdFromReferrer(e);
        });
      },
      setVisitorCookieTimeout: function (e, n) {
        ne(n, function (n) {
          n.setVisitorCookieTimeout(e);
        });
      },
      trackPageView: function (e, n) {
        ne(n, function (n) {
          n.trackPageView(e);
        });
      },
      trackSelfDescribingEvent: function (e, n) {
        ne(n, function (n) {
          n.core.track(T({ event: e.event }), e.context, e.timestamp);
        });
      },
      trackStructEvent: function (e, n) {
        ne(n, function (n) {
          var o = (n = n.core).track,
            r = e.category,
            i = e.action,
            a = e.label,
            c = e.property,
            s = e.value,
            u = t();
          u.add("e", "se"),
            u.add("se_ca", r),
            u.add("se_ac", i),
            u.add("se_la", a),
            u.add("se_pr", c),
            u.add("se_va", null == s ? void 0 : s.toString()),
            o.call(n, u, e.context, e.timestamp);
        });
      },
      updatePageActivity: function (e) {
        ne(e, function (e) {
          e.updatePageActivity();
        });
      },
      version: "3.22.1",
    }),
    dn = Object.freeze({ __proto__: null, ClientHintsPlugin: se }),
    fn = Object.freeze({ __proto__: null, OptimizelyXPlugin: ue }),
    mn = Object.freeze({ __proto__: null, PerformanceTimingPlugin: le });
  !(function (e) {
    (e.consent = "consent"),
      (e.contract = "contract"),
      (e.legalObligation = "legal_obligation"),
      (e.vitalInterests = "vital_interests"),
      (e.publicTask = "public_task"),
      (e.legitimateInterests = "legitimate_interests");
  })(on || (on = {}));
  var pn,
    vn,
    gn,
    hn = {},
    yn = {},
    wn = Object.freeze({
      __proto__: null,
      ConsentPlugin: de,
      enableGdprContext: function (e, n) {
        void 0 === n && (n = Object.keys(hn));
        var t = e.documentId,
          o = e.documentVersion,
          r = e.documentDescription,
          i = on[e.basisForProcessing];
        i
          ? n.forEach(function (e) {
              hn[e] &&
                (yn[e] = {
                  basisForProcessing: i,
                  documentId: null != t ? t : null,
                  documentVersion: null != o ? o : null,
                  documentDescription: null != r ? r : null,
                });
            })
          : pn.warn(
              "enableGdprContext: basisForProcessing must be one of: consent, contract, legalObligation, vitalInterests, publicTask, legitimateInterests",
            );
      },
      get gdprBasis() {
        return on;
      },
      trackConsentGranted: function (e, n) {
        void 0 === n && (n = Object.keys(hn)),
          te(n, hn, function (n) {
            var t = e.expiry,
              o = {
                schema: "iglu:com.snowplowanalytics.snowplow/consent_document/jsonschema/1-0-0",
                data: C({ id: e.id, version: e.version, name: e.name, description: e.description }),
              };
            (t = T({
              event: {
                schema: "iglu:com.snowplowanalytics.snowplow/consent_granted/jsonschema/1-0-0",
                data: C({ expiry: t }),
              },
            })),
              (o = [o]),
              n.core.track(t, e.context ? e.context.concat(o) : o, e.timestamp);
          });
      },
      trackConsentWithdrawn: function (e, n) {
        void 0 === n && (n = Object.keys(hn)),
          te(n, hn, function (n) {
            var t = e.all,
              o = {
                schema: "iglu:com.snowplowanalytics.snowplow/consent_document/jsonschema/1-0-0",
                data: C({ id: e.id, version: e.version, name: e.name, description: e.description }),
              };
            (t = T({
              event: {
                schema: "iglu:com.snowplowanalytics.snowplow/consent_withdrawn/jsonschema/1-0-0",
                data: C({ all: t }),
              },
            })),
              (o = [o]),
              n.core.track(t, e.context ? e.context.concat(o) : o, e.timestamp);
          });
      },
    }),
    kn = {},
    bn = !1,
    An = Object.freeze({ __proto__: null, GeolocationPlugin: fe, enableGeolocationContext: me }),
    _n = { ua: !0, ga4: !1, ga4MeasurementId: "", cookiePrefix: [] },
    Tn = Object.freeze({ __proto__: null, GaCookiesPlugin: pe }),
    Pn = {},
    Cn = {},
    Sn = Object.freeze({
      __proto__: null,
      LinkClickTrackingPlugin: ve,
      enableLinkClickTracking: function (e, n) {
        void 0 === e && (e = {}),
          void 0 === n && (n = Object.keys(Pn)),
          n.forEach(function (n) {
            Pn[n] &&
              (Pn[n].sharedState.hasLoaded
                ? (ye(e, n), we(n))
                : Pn[n].sharedState.registeredOnLoadHandlers.push(function () {
                    ye(e, n), we(n);
                  }));
          });
      },
      refreshLinkClickTracking: function (e) {
        void 0 === e && (e = Object.keys(Pn)),
          e.forEach(function (e) {
            Pn[e] &&
              (Pn[e].sharedState.hasLoaded
                ? we(e)
                : Pn[e].sharedState.registeredOnLoadHandlers.push(function () {
                    we(e);
                  }));
          });
      },
      trackLinkClick: function (e, n) {
        void 0 === n && (n = Object.keys(Pn)),
          te(n, Pn, function (n) {
            n.core.track(P(e), e.context, e.timestamp);
          });
      },
    });
  !(function (e) {
    (e.CHANGE_FORM = "change_form"), (e.FOCUS_FORM = "focus_form"), (e.SUBMIT_FORM = "submit_form");
  })(gn || (gn = {}));
  var On = [gn.CHANGE_FORM, gn.FOCUS_FORM, gn.SUBMIT_FORM],
    xn = ["textarea", "input", "select"],
    In = function (e) {
      return e;
    },
    En = {},
    jn = Object.freeze({
      __proto__: null,
      FormTrackingPlugin: Te,
      enableFormTracking: function (e, n) {
        void 0 === e && (e = {}),
          void 0 === n && (n = Object.keys(En)),
          n.forEach(function (n) {
            En[n] &&
              (En[n].sharedState.hasLoaded
                ? ke(En[n], e)
                : En[n].sharedState.registeredOnLoadHandlers.push(function () {
                    ke(En[n], e);
                  }));
          });
      },
    }),
    Ln = {},
    Dn = Object.freeze({
      __proto__: null,
      ErrorTrackingPlugin: Pe,
      enableErrorTracking: function (e, n) {
        void 0 === e && (e = {}), void 0 === n && (n = Object.keys(Ln));
        var t = e.filter,
          o = e.contextAdder,
          r = e.context;
        M(
          window,
          "error",
          function (e) {
            if ((t && j(t) && t(e)) || null == t) {
              var i = n,
                a = r || [];
              o && j(o) && (a = a.concat(o(e))),
                Ce(
                  {
                    message: e.message,
                    filename: e.filename,
                    lineno: e.lineno,
                    colno: e.colno,
                    error: e.error,
                    context: a,
                  },
                  i,
                );
            }
          },
          !0,
        );
      },
      trackError: Ce,
    }),
    Nn = { exports: {} };
  !(function (e) {
    var n, t, o, r, i, a;
    (n = {
      "America/Denver": ["America/Mazatlan"],
      "America/Chicago": ["America/Mexico_City"],
      "America/Asuncion": ["America/Campo_Grande", "America/Santiago"],
      "America/Montevideo": ["America/Sao_Paulo", "America/Santiago"],
      "Asia/Beirut":
        "Asia/Amman Asia/Jerusalem Europe/Helsinki Asia/Damascus Africa/Cairo Asia/Gaza Europe/Minsk Africa/Windhoek".split(
          " ",
        ),
      "Pacific/Auckland": ["Pacific/Fiji"],
      "America/Los_Angeles": ["America/Santa_Isabel"],
      "America/New_York": ["America/Havana"],
      "America/Halifax": ["America/Goose_Bay"],
      "America/Godthab": ["America/Miquelon"],
      "Asia/Dubai": ["Asia/Yerevan"],
      "Asia/Jakarta": ["Asia/Krasnoyarsk"],
      "Asia/Shanghai": ["Asia/Irkutsk", "Australia/Perth"],
      "Australia/Sydney": ["Australia/Lord_Howe"],
      "Asia/Tokyo": ["Asia/Yakutsk"],
      "Asia/Dhaka": ["Asia/Omsk"],
      "Asia/Baku": ["Asia/Yerevan"],
      "Australia/Brisbane": ["Asia/Vladivostok"],
      "Pacific/Noumea": ["Asia/Vladivostok"],
      "Pacific/Majuro": ["Asia/Kamchatka", "Pacific/Fiji"],
      "Pacific/Tongatapu": ["Pacific/Apia"],
      "Asia/Baghdad": ["Europe/Minsk", "Europe/Moscow"],
      "Asia/Karachi": ["Asia/Yekaterinburg"],
      "Africa/Johannesburg": ["Asia/Gaza", "Africa/Cairo"],
    }),
      (t = function () {
        for (var e = [], n = 0; 11 >= n; n++)
          for (var t = 1; 28 >= t; t++) {
            var o = -new Date(2014, n, t).getTimezoneOffset();
            (o = null !== o ? o : 0), e ? e && e[e.length - 1] !== o && e.push(o) : e.push();
          }
        return e;
      }),
      (o = function e(n, t, o) {
        void 0 === t && ((t = 864e5), (o = 36e5));
        var r = new Date(n.getTime() - t).getTime();
        n = n.getTime() + t;
        for (var i = new Date(r).getTimezoneOffset(), a = null; r < n - o; ) {
          var c = new Date(r);
          if (c.getTimezoneOffset() !== i) {
            a = c;
            break;
          }
          r += o;
        }
        return 864e5 === t ? e(a, 36e5, 6e4) : 36e5 === t ? e(a, 6e4, 1e3) : a;
      }),
      (r = function (e, n, t, o) {
        if ("N/A" !== t) return t;
        if ("Asia/Beirut" === n) {
          if (
            ("Africa/Cairo" === o.name && 13983768e5 === e[6].s && 14116788e5 === e[6].e) ||
            ("Asia/Jerusalem" === o.name && 13959648e5 === e[6].s && 14118588e5 === e[6].e)
          )
            return 0;
        } else if ("America/Santiago" === n) {
          if (
            ("America/Asuncion" === o.name && 14124816e5 === e[6].s && 1397358e6 === e[6].e) ||
            ("America/Campo_Grande" === o.name && 14136912e5 === e[6].s && 13925196e5 === e[6].e)
          )
            return 0;
        } else if ("America/Montevideo" === n) {
          if ("America/Sao_Paulo" === o.name && 14136876e5 === e[6].s && 1392516e6 === e[6].e) return 0;
        } else if (
          "Pacific/Auckland" === n &&
          "Pacific/Fiji" === o.name &&
          14142456e5 === e[6].s &&
          13961016e5 === e[6].e
        )
          return 0;
        return t;
      }),
      (i = function (e) {
        var t = (function () {
          for (var e = [], n = 0; n < a.olson.dst_rules.years.length; n++) {
            var t = a.olson.dst_rules.years[n],
              r = new Date(t, 0, 1, 0, 0, 1, 0).getTime();
            t = new Date(t, 12, 31, 23, 59, 59).getTime();
            for (var i = new Date(r).getTimezoneOffset(), c = null, s = null; r < t - 864e5; ) {
              var u = new Date(r),
                l = u.getTimezoneOffset();
              l !== i && (l < i && (c = u), l > i && (s = u), (i = l)), (r += 864e5);
            }
            (t = !(!c || !s) && { s: o(c).getTime(), e: o(s).getTime() }), e.push(t);
          }
          return e;
        })();
        return (function (e) {
          for (var n = 0; n < e.length; n++) if (!1 !== e[n]) return !0;
          return !1;
        })(t)
          ? (function (e, t) {
              for (var o = {}, i = a.olson.dst_rules.zones, c = i.length, s = n[t], u = 0; u < c; u++) {
                for (var l = i[u], d = i[u], f = 0, m = 0; m < e.length; m++)
                  if (d.rules[m] && e[m]) {
                    if (!(e[m].s >= d.rules[m].s && e[m].e <= d.rules[m].e)) {
                      f = "N/A";
                      break;
                    }
                    if (
                      ((f = 0), (f += Math.abs(e[m].s - d.rules[m].s)), 864e6 < (f += Math.abs(d.rules[m].e - e[m].e)))
                    ) {
                      f = "N/A";
                      break;
                    }
                  }
                "N/A" !== (d = r(e, t, f, d)) && (o[l.name] = d);
              }
              for (var p in o) if (o.hasOwnProperty(p)) for (e = 0; e < s.length; e++) if (s[e] === p) return p;
              return t;
            })(t, e)
          : e;
      }),
      ((a = {
        determine: function (e) {
          var o = !1,
            r = (function () {
              var e = 0,
                n = t();
              return (
                1 < n.length && (e = n[0] - n[1]),
                3 < n.length ? n[0] + ",1,weird" : 0 > e ? n[0] + ",1" : 0 < e ? n[1] + ",1,s" : n[0] + ",0"
              );
            })();
          return (
            (e || void 0 === e) &&
              (o = (function () {
                var e, n;
                if (
                  Intl &&
                  "undefined" != typeof Intl &&
                  void 0 !== Intl.DateTimeFormat &&
                  void 0 !== (e = Intl.DateTimeFormat()) &&
                  void 0 !== e.resolvedOptions
                )
                  return (n = e.resolvedOptions().timeZone) && (-1 < n.indexOf("/") || "UTC" === n) ? n : void 0;
              })()),
            o || ((o = a.olson.timezones[r]), void 0 !== n[o] && (o = i(o))),
            {
              name: function () {
                return o;
              },
              using_intl: e || void 0 === e,
              needle: r,
              offsets: t(),
            }
          );
        },
      }).olson = a.olson || {}),
      (a.olson.timezones = {
        "-720,0": "Etc/GMT+12",
        "-660,0": "Pacific/Pago_Pago",
        "-660,1,s": "Pacific/Apia",
        "-600,1": "America/Adak",
        "-600,0": "Pacific/Honolulu",
        "-570,0": "Pacific/Marquesas",
        "-540,0": "Pacific/Gambier",
        "-540,1": "America/Anchorage",
        "-480,1": "America/Los_Angeles",
        "-480,0": "Pacific/Pitcairn",
        "-420,0": "America/Phoenix",
        "-420,1": "America/Denver",
        "-360,0": "America/Guatemala",
        "-360,1": "America/Chicago",
        "-360,1,s": "Pacific/Easter",
        "-300,0": "America/Bogota",
        "-300,1": "America/New_York",
        "-270,0": "America/Caracas",
        "-240,1": "America/Halifax",
        "-240,0": "America/Santo_Domingo",
        "-240,1,s": "America/Asuncion",
        "-210,1": "America/St_Johns",
        "-180,1": "America/Godthab",
        "-180,0": "America/Buenos_Aires",
        "-180,1,s": "America/Montevideo",
        "-120,0": "America/Noronha",
        "-120,1": "America/Noronha",
        "-60,1": "Atlantic/Azores",
        "-60,0": "Atlantic/Cape_Verde",
        "0,0": "UTC",
        "0,1": "Europe/London",
        "0,1,weird": "Africa/Casablanca",
        "60,1": "Europe/Berlin",
        "60,0": "Africa/Lagos",
        "60,1,weird": "Africa/Casablanca",
        "120,1": "Asia/Beirut",
        "120,1,weird": "Africa/Cairo",
        "120,0": "Africa/Johannesburg",
        "180,0": "Asia/Baghdad",
        "180,1": "Europe/Moscow",
        "210,1": "Asia/Tehran",
        "240,0": "Asia/Dubai",
        "240,1": "Asia/Baku",
        "270,0": "Asia/Kabul",
        "300,1": "Asia/Yekaterinburg",
        "300,0": "Asia/Karachi",
        "330,0": "Asia/Calcutta",
        "345,0": "Asia/Katmandu",
        "360,0": "Asia/Dhaka",
        "360,1": "Asia/Omsk",
        "390,0": "Asia/Rangoon",
        "420,1": "Asia/Krasnoyarsk",
        "420,0": "Asia/Jakarta",
        "480,0": "Asia/Shanghai",
        "480,1": "Asia/Irkutsk",
        "525,0": "Australia/Eucla",
        "525,1,s": "Australia/Eucla",
        "540,1": "Asia/Yakutsk",
        "540,0": "Asia/Tokyo",
        "570,0": "Australia/Darwin",
        "570,1,s": "Australia/Adelaide",
        "600,0": "Australia/Brisbane",
        "600,1": "Asia/Vladivostok",
        "600,1,s": "Australia/Sydney",
        "630,1,s": "Australia/Lord_Howe",
        "660,1": "Asia/Kamchatka",
        "660,0": "Pacific/Noumea",
        "690,0": "Pacific/Norfolk",
        "720,1,s": "Pacific/Auckland",
        "720,0": "Pacific/Majuro",
        "765,1,s": "Pacific/Chatham",
        "780,0": "Pacific/Tongatapu",
        "780,1,s": "Pacific/Apia",
        "840,0": "Pacific/Kiritimati",
      }),
      (a.olson.dst_rules = {
        years: [2008, 2009, 2010, 2011, 2012, 2013, 2014],
        zones: [
          {
            name: "Africa/Cairo",
            rules: [
              { e: 12199572e5, s: 12090744e5 },
              { e: 1250802e6, s: 1240524e6 },
              { e: 12858804e5, s: 12840696e5 },
              !1,
              !1,
              !1,
              { e: 14116788e5, s: 1406844e6 },
            ],
          },
          {
            name: "America/Asuncion",
            rules: [
              { e: 12050316e5, s: 12243888e5 },
              { e: 12364812e5, s: 12558384e5 },
              { e: 12709548e5, s: 12860784e5 },
              { e: 13024044e5, s: 1317528e6 },
              { e: 1333854e6, s: 13495824e5 },
              { e: 1364094e6, s: 1381032e6 },
              { e: 13955436e5, s: 14124816e5 },
            ],
          },
          {
            name: "America/Campo_Grande",
            rules: [
              { e: 12032172e5, s: 12243888e5 },
              { e: 12346668e5, s: 12558384e5 },
              { e: 12667212e5, s: 1287288e6 },
              { e: 12981708e5, s: 13187376e5 },
              { e: 13302252e5, s: 1350792e6 },
              { e: 136107e7, s: 13822416e5 },
              { e: 13925196e5, s: 14136912e5 },
            ],
          },
          {
            name: "America/Goose_Bay",
            rules: [
              { e: 122559486e4, s: 120503526e4 },
              { e: 125704446e4, s: 123648486e4 },
              { e: 128909886e4, s: 126853926e4 },
              { e: 13205556e5, s: 129998886e4 },
              { e: 13520052e5, s: 13314456e5 },
              { e: 13834548e5, s: 13628952e5 },
              { e: 14149044e5, s: 13943448e5 },
            ],
          },
          {
            name: "America/Havana",
            rules: [
              { e: 12249972e5, s: 12056436e5 },
              { e: 12564468e5, s: 12364884e5 },
              { e: 12885012e5, s: 12685428e5 },
              { e: 13211604e5, s: 13005972e5 },
              { e: 13520052e5, s: 13332564e5 },
              { e: 13834548e5, s: 13628916e5 },
              { e: 14149044e5, s: 13943412e5 },
            ],
          },
          {
            name: "America/Mazatlan",
            rules: [
              { e: 1225008e6, s: 12074724e5 },
              { e: 12564576e5, s: 1238922e6 },
              { e: 1288512e6, s: 12703716e5 },
              { e: 13199616e5, s: 13018212e5 },
              { e: 13514112e5, s: 13332708e5 },
              { e: 13828608e5, s: 13653252e5 },
              { e: 14143104e5, s: 13967748e5 },
            ],
          },
          {
            name: "America/Mexico_City",
            rules: [
              { e: 12250044e5, s: 12074688e5 },
              { e: 1256454e6, s: 12389184e5 },
              { e: 12885084e5, s: 1270368e6 },
              { e: 1319958e6, s: 13018176e5 },
              { e: 13514076e5, s: 13332672e5 },
              { e: 13828572e5, s: 13653216e5 },
              { e: 14143068e5, s: 13967712e5 },
            ],
          },
          {
            name: "America/Miquelon",
            rules: [
              { e: 12255984e5, s: 12050388e5 },
              { e: 1257048e6, s: 12364884e5 },
              { e: 12891024e5, s: 12685428e5 },
              { e: 1320552e6, s: 12999924e5 },
              { e: 13520016e5, s: 1331442e6 },
              { e: 13834512e5, s: 13628916e5 },
              { e: 14149008e5, s: 13943412e5 },
            ],
          },
          {
            name: "America/Santa_Isabel",
            rules: [
              { e: 12250116e5, s: 1207476e6 },
              { e: 12564612e5, s: 12389256e5 },
              { e: 12891204e5, s: 12685608e5 },
              { e: 132057e7, s: 13000104e5 },
              { e: 13520196e5, s: 133146e7 },
              { e: 13834692e5, s: 13629096e5 },
              { e: 14149188e5, s: 13943592e5 },
            ],
          },
          {
            name: "America/Santiago",
            rules: [
              { e: 1206846e6, s: 1223784e6 },
              { e: 1237086e6, s: 12552336e5 },
              { e: 127035e7, s: 12866832e5 },
              { e: 13048236e5, s: 13138992e5 },
              { e: 13356684e5, s: 13465584e5 },
              { e: 1367118e6, s: 13786128e5 },
              { e: 13985676e5, s: 14100624e5 },
            ],
          },
          {
            name: "America/Sao_Paulo",
            rules: [
              { e: 12032136e5, s: 12243852e5 },
              { e: 12346632e5, s: 12558348e5 },
              { e: 12667176e5, s: 12872844e5 },
              { e: 12981672e5, s: 1318734e6 },
              { e: 13302216e5, s: 13507884e5 },
              { e: 13610664e5, s: 1382238e6 },
              { e: 1392516e6, s: 14136876e5 },
            ],
          },
          {
            name: "Asia/Amman",
            rules: [
              { e: 1225404e6, s: 12066552e5 },
              { e: 12568536e5, s: 12381048e5 },
              { e: 12883032e5, s: 12695544e5 },
              { e: 13197528e5, s: 13016088e5 },
              !1,
              !1,
              { e: 14147064e5, s: 13959576e5 },
            ],
          },
          {
            name: "Asia/Damascus",
            rules: [
              { e: 12254868e5, s: 120726e7 },
              { e: 125685e7, s: 12381048e5 },
              { e: 12882996e5, s: 12701592e5 },
              { e: 13197492e5, s: 13016088e5 },
              { e: 13511988e5, s: 13330584e5 },
              { e: 13826484e5, s: 1364508e6 },
              { e: 14147028e5, s: 13959576e5 },
            ],
          },
          { name: "Asia/Dubai", rules: [!1, !1, !1, !1, !1, !1, !1] },
          {
            name: "Asia/Gaza",
            rules: [
              { e: 12199572e5, s: 12066552e5 },
              { e: 12520152e5, s: 12381048e5 },
              { e: 1281474e6, s: 126964086e4 },
              { e: 1312146e6, s: 130160886e4 },
              { e: 13481784e5, s: 13330584e5 },
              { e: 13802292e5, s: 1364508e6 },
              { e: 1414098e6, s: 13959576e5 },
            ],
          },
          {
            name: "Asia/Irkutsk",
            rules: [
              { e: 12249576e5, s: 12068136e5 },
              { e: 12564072e5, s: 12382632e5 },
              { e: 12884616e5, s: 12697128e5 },
              !1,
              !1,
              !1,
              !1,
            ],
          },
          {
            name: "Asia/Jerusalem",
            rules: [
              { e: 12231612e5, s: 12066624e5 },
              { e: 1254006e6, s: 1238112e6 },
              { e: 1284246e6, s: 12695616e5 },
              { e: 131751e7, s: 1301616e6 },
              { e: 13483548e5, s: 13330656e5 },
              { e: 13828284e5, s: 13645152e5 },
              { e: 1414278e6, s: 13959648e5 },
            ],
          },
          {
            name: "Asia/Kamchatka",
            rules: [
              { e: 12249432e5, s: 12067992e5 },
              { e: 12563928e5, s: 12382488e5 },
              { e: 12884508e5, s: 12696984e5 },
              !1,
              !1,
              !1,
              !1,
            ],
          },
          {
            name: "Asia/Krasnoyarsk",
            rules: [
              { e: 12249612e5, s: 12068172e5 },
              { e: 12564108e5, s: 12382668e5 },
              { e: 12884652e5, s: 12697164e5 },
              !1,
              !1,
              !1,
              !1,
            ],
          },
          {
            name: "Asia/Omsk",
            rules: [
              { e: 12249648e5, s: 12068208e5 },
              { e: 12564144e5, s: 12382704e5 },
              { e: 12884688e5, s: 126972e7 },
              !1,
              !1,
              !1,
              !1,
            ],
          },
          {
            name: "Asia/Vladivostok",
            rules: [
              { e: 12249504e5, s: 12068064e5 },
              { e: 12564e8, s: 1238256e6 },
              { e: 12884544e5, s: 12697056e5 },
              !1,
              !1,
              !1,
              !1,
            ],
          },
          {
            name: "Asia/Yakutsk",
            rules: [
              { e: 1224954e6, s: 120681e7 },
              { e: 12564036e5, s: 12382596e5 },
              { e: 1288458e6, s: 12697092e5 },
              !1,
              !1,
              !1,
              !1,
            ],
          },
          {
            name: "Asia/Yekaterinburg",
            rules: [
              { e: 12249684e5, s: 12068244e5 },
              { e: 1256418e6, s: 1238274e6 },
              { e: 12884724e5, s: 12697236e5 },
              !1,
              !1,
              !1,
              !1,
            ],
          },
          {
            name: "Asia/Yerevan",
            rules: [
              { e: 1224972e6, s: 1206828e6 },
              { e: 12564216e5, s: 12382776e5 },
              { e: 1288476e6, s: 12697272e5 },
              { e: 13199256e5, s: 13011768e5 },
              !1,
              !1,
              !1,
            ],
          },
          {
            name: "Australia/Lord_Howe",
            rules: [
              { e: 12074076e5, s: 12231342e5 },
              { e: 12388572e5, s: 12545838e5 },
              { e: 12703068e5, s: 12860334e5 },
              { e: 13017564e5, s: 1317483e6 },
              { e: 1333206e6, s: 13495374e5 },
              { e: 13652604e5, s: 1380987e6 },
              { e: 139671e7, s: 14124366e5 },
            ],
          },
          { name: "Australia/Perth", rules: [{ e: 12068136e5, s: 12249576e5 }, !1, !1, !1, !1, !1, !1] },
          {
            name: "Europe/Helsinki",
            rules: [
              { e: 12249828e5, s: 12068388e5 },
              { e: 12564324e5, s: 12382884e5 },
              { e: 12884868e5, s: 1269738e6 },
              { e: 13199364e5, s: 13011876e5 },
              { e: 1351386e6, s: 13326372e5 },
              { e: 13828356e5, s: 13646916e5 },
              { e: 14142852e5, s: 13961412e5 },
            ],
          },
          {
            name: "Europe/Minsk",
            rules: [
              { e: 12249792e5, s: 12068352e5 },
              { e: 12564288e5, s: 12382848e5 },
              { e: 12884832e5, s: 12697344e5 },
              !1,
              !1,
              !1,
              !1,
            ],
          },
          {
            name: "Europe/Moscow",
            rules: [
              { e: 12249756e5, s: 12068316e5 },
              { e: 12564252e5, s: 12382812e5 },
              { e: 12884796e5, s: 12697308e5 },
              !1,
              !1,
              !1,
              !1,
            ],
          },
          {
            name: "Pacific/Apia",
            rules: [
              !1,
              !1,
              !1,
              { e: 13017528e5, s: 13168728e5 },
              { e: 13332024e5, s: 13489272e5 },
              { e: 13652568e5, s: 13803768e5 },
              { e: 13967064e5, s: 14118264e5 },
            ],
          },
          {
            name: "Pacific/Fiji",
            rules: [
              !1,
              !1,
              { e: 12696984e5, s: 12878424e5 },
              { e: 13271544e5, s: 1319292e6 },
              { e: 1358604e6, s: 13507416e5 },
              { e: 139005e7, s: 1382796e6 },
              { e: 14215032e5, s: 14148504e5 },
            ],
          },
          {
            name: "Europe/London",
            rules: [
              { e: 12249828e5, s: 12068388e5 },
              { e: 12564324e5, s: 12382884e5 },
              { e: 12884868e5, s: 1269738e6 },
              { e: 13199364e5, s: 13011876e5 },
              { e: 1351386e6, s: 13326372e5 },
              { e: 13828356e5, s: 13646916e5 },
              { e: 14142852e5, s: 13961412e5 },
            ],
          },
          {
            name: "Africa/Windhoek",
            rules: [
              { e: 12207492e5, s: 120744e7 },
              { e: 12521988e5, s: 12388896e5 },
              { e: 12836484e5, s: 12703392e5 },
              { e: 1315098e6, s: 13017888e5 },
              { e: 13465476e5, s: 13332384e5 },
              { e: 13779972e5, s: 13652928e5 },
              { e: 14100516e5, s: 13967424e5 },
            ],
          },
        ],
      }),
      (e.exports = a);
  })(Nn);
  var Bn = Object.freeze({ __proto__: null, TimezonePlugin: Se }),
    Mn = {},
    zn = {},
    Un = Object.freeze({
      __proto__: null,
      EcommercePlugin: Oe,
      addItem: function (e, n) {
        void 0 === n && (n = Object.keys(Mn)),
          n.forEach(function (n) {
            zn[n] && zn[n].items.push(e);
          });
      },
      addTrans: function (e, n) {
        void 0 === n && (n = Object.keys(Mn)),
          n.forEach(function (n) {
            zn[n] && (zn[n].transaction = e);
          });
      },
      trackAddToCart: function (e, n) {
        void 0 === n && (n = Object.keys(Mn)),
          te(n, Mn, function (n) {
            var t = (n = n.core).track,
              o = T({
                event: {
                  schema: "iglu:com.snowplowanalytics.snowplow/add_to_cart/jsonschema/1-0-0",
                  data: C({
                    sku: e.sku,
                    quantity: e.quantity,
                    name: e.name,
                    category: e.category,
                    unitPrice: e.unitPrice,
                    currency: e.currency,
                  }),
                },
              });
            t.call(n, o, e.context, e.timestamp);
          });
      },
      trackRemoveFromCart: function (e, n) {
        void 0 === n && (n = Object.keys(Mn)),
          te(n, Mn, function (n) {
            var t = (n = n.core).track,
              o = T({
                event: {
                  schema: "iglu:com.snowplowanalytics.snowplow/remove_from_cart/jsonschema/1-0-0",
                  data: C({
                    sku: e.sku,
                    quantity: e.quantity,
                    name: e.name,
                    category: e.category,
                    unitPrice: e.unitPrice,
                    currency: e.currency,
                  }),
                },
              });
            t.call(n, o, e.context, e.timestamp);
          });
      },
      trackTrans: function (e) {
        void 0 === e && (e = Object.keys(Mn)),
          te(e, Mn, function (e) {
            var n = zn[e.id].transaction;
            if (n) {
              var o = e.core,
                r = o.track,
                i = n.orderId,
                a = n.total,
                c = n.affiliation,
                s = n.tax,
                u = n.shipping,
                l = n.city,
                d = n.state,
                f = n.country,
                m = n.currency,
                p = t();
              p.add("e", "tr"),
                p.add("tr_id", i),
                p.add("tr_af", c),
                p.add("tr_tt", a),
                p.add("tr_tx", s),
                p.add("tr_sh", u),
                p.add("tr_ci", l),
                p.add("tr_st", d),
                p.add("tr_co", f),
                p.add("tr_cu", m),
                r.call(o, p, n.context, n.timestamp);
            }
            for (n = 0; n < zn[e.id].items.length; n++)
              (o = zn[e.id].items[n]),
                (i = (r = e.core).track),
                (a = o.orderId),
                (c = o.sku),
                (s = o.price),
                (u = o.name),
                (l = o.category),
                (d = o.quantity),
                (f = o.currency),
                (m = t()).add("e", "ti"),
                m.add("ti_id", a),
                m.add("ti_sk", c),
                m.add("ti_nm", u),
                m.add("ti_ca", l),
                m.add("ti_pr", s),
                m.add("ti_qu", d),
                m.add("ti_cu", f),
                i.call(r, m, o.context, o.timestamp);
            zn[e.id] = { items: [] };
          });
      },
    }),
    Fn = {},
    Rn = {},
    Vn = Object.freeze({
      __proto__: null,
      EnhancedEcommercePlugin: xe,
      addEnhancedEcommerceActionContext: function (e, n) {
        void 0 === e && (e = {}), void 0 === n && (n = Object.keys(Fn));
        var t = e.id,
          o = e.affiliation,
          r = e.revenue,
          i = e.tax,
          a = e.shipping,
          c = e.coupon,
          s = e.list,
          u = e.step,
          l = e.option,
          d = e.currency;
        n.forEach(function (e) {
          Rn[e] &&
            Rn[e].push({
              schema: "iglu:com.google.analytics.enhanced-ecommerce/actionFieldObject/jsonschema/1-0-0",
              data: {
                id: t,
                affiliation: o,
                revenue: R(r),
                tax: R(i),
                shipping: R(a),
                coupon: c,
                list: s,
                step: F(u),
                option: l,
                currency: d,
              },
            });
        });
      },
      addEnhancedEcommerceImpressionContext: function (e, n) {
        void 0 === e && (e = {}), void 0 === n && (n = Object.keys(Fn));
        var t = e.id,
          o = e.name,
          r = e.list,
          i = e.brand,
          a = e.category,
          c = e.variant,
          s = e.position,
          u = e.price,
          l = e.currency;
        n.forEach(function (e) {
          Rn[e] &&
            Rn[e].push({
              schema: "iglu:com.google.analytics.enhanced-ecommerce/impressionFieldObject/jsonschema/1-0-0",
              data: {
                id: t,
                name: o,
                list: r,
                brand: i,
                category: a,
                variant: c,
                position: F(s),
                price: R(u),
                currency: l,
              },
            });
        });
      },
      addEnhancedEcommerceProductContext: function (e, n) {
        void 0 === e && (e = {}), void 0 === n && (n = Object.keys(Fn));
        var t = e.id,
          o = e.name,
          r = e.list,
          i = e.brand,
          a = e.category,
          c = e.variant,
          s = e.price,
          u = e.quantity,
          l = e.coupon,
          d = e.position,
          f = e.currency;
        n.forEach(function (e) {
          Rn[e] &&
            Rn[e].push({
              schema: "iglu:com.google.analytics.enhanced-ecommerce/productFieldObject/jsonschema/1-0-0",
              data: {
                id: t,
                name: o,
                list: r,
                brand: i,
                category: a,
                variant: c,
                price: R(s),
                quantity: F(u),
                coupon: l,
                position: F(d),
                currency: f,
              },
            });
        });
      },
      addEnhancedEcommercePromoContext: function (e, n) {
        void 0 === e && (e = {}), void 0 === n && (n = Object.keys(Fn));
        var t = e.id,
          o = e.name,
          r = e.creative,
          i = e.position,
          a = e.currency;
        n.forEach(function (e) {
          Rn[e] &&
            Rn[e].push({
              schema: "iglu:com.google.analytics.enhanced-ecommerce/promoFieldObject/jsonschema/1-0-0",
              data: { id: t, name: o, creative: r, position: i, currency: a },
            });
        });
      },
      trackEnhancedEcommerceAction: function (e, n) {
        void 0 === e && (e = {}),
          void 0 === n && (n = Object.keys(Fn)),
          te(n, Fn, function (n) {
            var t = Rn[n.id].concat(e.context || []);
            (Rn[n.id].length = 0),
              n.core.track(
                T({
                  event: {
                    schema: "iglu:com.google.analytics.enhanced-ecommerce/action/jsonschema/1-0-0",
                    data: { action: e.action },
                  },
                }),
                t,
                e.timestamp,
              );
          });
      },
    }),
    Hn = {},
    Gn = Object.freeze({
      __proto__: null,
      AdTrackingPlugin: Ie,
      trackAdClick: function (e, n) {
        void 0 === n && (n = Object.keys(Hn)),
          te(n, Hn, function (n) {
            var t = (n = n.core).track,
              o = {
                schema: "iglu:com.snowplowanalytics.snowplow/ad_click/jsonschema/1-0-0",
                data: C({
                  targetUrl: e.targetUrl,
                  clickId: e.clickId,
                  costModel: e.costModel,
                  cost: e.cost,
                  bannerId: e.bannerId,
                  zoneId: e.zoneId,
                  impressionId: e.impressionId,
                  advertiserId: e.advertiserId,
                  campaignId: e.campaignId,
                }),
              };
            (o = T({ event: o })), t.call(n, o, e.context, e.timestamp);
          });
      },
      trackAdConversion: function (e, n) {
        void 0 === n && (n = Object.keys(Hn)),
          te(n, Hn, function (n) {
            var t = (n = n.core).track,
              o = {
                schema: "iglu:com.snowplowanalytics.snowplow/ad_conversion/jsonschema/1-0-0",
                data: C({
                  conversionId: e.conversionId,
                  costModel: e.costModel,
                  cost: e.cost,
                  category: e.category,
                  action: e.action,
                  property: e.property,
                  initialValue: e.initialValue,
                  advertiserId: e.advertiserId,
                  campaignId: e.campaignId,
                }),
              };
            (o = T({ event: o })), t.call(n, o, e.context, e.timestamp);
          });
      },
      trackAdImpression: function (e, n) {
        void 0 === n && (n = Object.keys(Hn)),
          te(n, Hn, function (n) {
            var t = (n = n.core).track,
              o = {
                schema: "iglu:com.snowplowanalytics.snowplow/ad_impression/jsonschema/1-0-0",
                data: C({
                  impressionId: e.impressionId,
                  costModel: e.costModel,
                  cost: e.cost,
                  targetUrl: e.targetUrl,
                  bannerId: e.bannerId,
                  zoneId: e.zoneId,
                  advertiserId: e.advertiserId,
                  campaignId: e.campaignId,
                }),
              };
            (o = T({ event: o })), t.call(n, o, e.context, e.timestamp);
          });
      },
    }),
    qn = {},
    Jn = Object.freeze({
      __proto__: null,
      SiteTrackingPlugin: Ee,
      trackSiteSearch: function (e, n) {
        void 0 === n && (n = Object.keys(qn)),
          te(n, qn, function (n) {
            var t = (n = n.core).track,
              o = T({
                event: {
                  schema: "iglu:com.snowplowanalytics.snowplow/site_search/jsonschema/1-0-0",
                  data: C({
                    terms: e.terms,
                    filters: e.filters,
                    totalResults: e.totalResults,
                    pageResults: e.pageResults,
                  }),
                },
              });
            t.call(n, o, e.context, e.timestamp);
          });
      },
      trackSocialInteraction: function (e, n) {
        void 0 === n && (n = Object.keys(qn)),
          te(n, qn, function (n) {
            var t = (n = n.core).track,
              o = {
                schema: "iglu:com.snowplowanalytics.snowplow/social_interaction/jsonschema/1-0-0",
                data: C({ action: e.action, network: e.network, target: e.target }),
              };
            (o = T({ event: o })), t.call(n, o, e.context, e.timestamp);
          });
      },
      trackTiming: function (e, n) {
        void 0 === n && (n = Object.keys(qn));
        var t = e.category,
          o = e.variable,
          r = e.timing,
          i = e.label,
          a = e.context,
          c = e.timestamp;
        te(n, qn, function (e) {
          e.core.track(
            T({
              event: {
                schema: "iglu:com.snowplowanalytics.snowplow/timing/jsonschema/1-0-0",
                data: { category: t, variable: o, timing: r, label: i },
              },
            }),
            a,
            c,
          );
        });
      },
    }),
    Yn = window.GlobalSnowplowNamespace.shift(),
    Kn = window[Yn];
  Kn.q = (function (n, t) {
    function o(e) {
      var n = e.split(":");
      return [(e = n[0]), (n = 1 < n.length ? n[1].split(";") : void 0)];
    }
    function r(e, n) {
      if (h[e])
        try {
          h[e].apply(null, n);
        } catch (n) {
          Qe.error(e + " failed", n);
        }
      else Qe.warn(e + " is not an available function");
    }
    function i(e) {
      h = je(je({}, h), e);
    }
    function a(t) {
      if ("string" != typeof t[0] || "string" != typeof t[1] || (void 0 !== t[2] && "object" != typeof t[2]))
        Qe.error("newTracker failed", Error("Invalid parameters"));
      else {
        var o = "".concat(n, "_").concat(t[0]),
          r = t[2],
          a = (function (n) {
            var t,
              o = null !== (t = null == n ? void 0 : n.contexts) && void 0 !== t ? t : {},
              r = o.performanceTiming;
            (n = o.gaCookies),
              (t = o.geolocation),
              o.optimizelyExperiments,
              o.optimizelyStates,
              o.optimizelyVariations,
              o.optimizelyVisitor,
              o.optimizelyAudiences,
              o.optimizelyDimensions,
              o.optimizelySummary;
            var i = o.optimizelyXSummary,
              a = o.clientHints;
            return (
              (o = []),
              r && ((r = e(mn, ["PerformanceTimingPlugin"])), o.push([le(), r])),
              i && ((r = e(fn, ["OptimizelyXPlugin"])), o.push([ue(), r])),
              a && ((r = e(dn, ["ClientHintsPlugin"])), o.push([se("object" == typeof a && a.includeHighEntropy), r])),
              n && ((r = e(Tn, ["GaCookiesPlugin"])), (n = "object" == typeof n ? pe(n) : pe()), o.push([n, r])),
              (r = e(wn, ["ConsentPlugin"])),
              o.push([de(), r]),
              (r = e(An, ["GeolocationPlugin"])),
              o.push([fe(t), r]),
              (r = e(Sn, ["LinkClickTrackingPlugin"])),
              o.push([ve(), r]),
              (r = e(jn, ["FormTrackingPlugin"])),
              o.push([Te(), r]),
              (r = e(Dn, ["ErrorTrackingPlugin"])),
              o.push([Pe(), r]),
              (r = e(Un, ["EcommercePlugin"])),
              o.push([Oe(), r]),
              (r = e(Vn, ["EnhancedEcommercePlugin"])),
              o.push([xe(), r]),
              (r = e(Gn, ["AdTrackingPlugin"])),
              o.push([Ie(), r]),
              (r = e(Jn, ["SiteTrackingPlugin"])),
              o.push([Ee(), r]),
              (r = e(Bn, ["TimezonePlugin"])),
              o.push([Se(), r]),
              o
            );
          })(r);
        (o = oe(
          o,
          t[0],
          "js-".concat(g),
          t[1],
          f,
          je(je({}, r), {
            plugins: a.map(function (e) {
              return e[0];
            }),
          }),
        ))
          ? (m.push(o.id),
            a.forEach(function (e) {
              i(e[1]);
            }))
          : Qe.warn(t[0] + " already exists");
      }
    }
    function c(n, t) {
      function o(e) {
        Object.prototype.hasOwnProperty.call(p, e) &&
          (u.clearTimeout(p[e].timeout),
          delete p[e],
          0 === Object.keys(p).length &&
            v.forEach(function (e) {
              var n = e[1];
              void 0 !== h[e[0]] && h[e[0]].length > n.length && Array.isArray(n[0]) && (n = [{}, n[0]]), r(e[0], n);
            }));
      }
      var a;
      if ("string" == typeof n[0] && d(n[1]) && (void 0 === n[2] || Array.isArray(n[2]))) {
        var c = n[0],
          s = n[1],
          f = n[2];
        (null === (a = n[3]) || void 0 === a || a) &&
          ((a = u.setTimeout(function () {
            o(c);
          }, 5e3)),
          (p[c] = { timeout: a })),
          (a = l.createElement("script")).setAttribute("src", c),
          a.setAttribute("async", "1"),
          M(
            a,
            "error",
            function () {
              o(c), Qe.warn("Failed to load plugin ".concat(s[0], " from ").concat(c));
            },
            !0,
          ),
          M(
            a,
            "load",
            function () {
              var n = s[1],
                r = u[s[0]];
              if (r && "object" == typeof r) {
                var a = r[n];
                (n = e(r, ["symbol" == typeof n ? n : n + ""])),
                  h.addPlugin.apply(null, [{ plugin: a.apply(null, f) }, t]),
                  i(n);
              }
              o(c);
            },
            !0,
          ),
          l.head.appendChild(a);
      } else {
        if ("object" == typeof n[0] && "string" == typeof n[1] && (void 0 === n[2] || Array.isArray(n[2]))) {
          var m = n[0],
            g = n[1];
          if (((a = n[2]), m))
            return (
              (n = m[g]),
              (m = e(m, ["symbol" == typeof g ? g : g + ""])),
              h.addPlugin.apply(null, [{ plugin: n.apply(null, a) }, t]),
              void i(m)
            );
        }
        Qe.warn("Failed to add Plugin: ".concat(n[1]));
      }
    }
    function s() {
      for (var e = [], t = 0; t < arguments.length; t++) e[t] = arguments[t];
      for (t = 0; t < e.length; t += 1) {
        var i = e[t],
          s = Array.prototype.shift.call(i);
        if (j(s))
          try {
            for (var u = {}, l = 0, d = re(m, cn); l < d.length; l++) {
              var f = d[l];
              u[f.id.replace("".concat(n, "_"), "")] = f;
            }
            s.apply(u, i);
          } catch (e) {
            Qe.error("Tracker callback failed", e);
          } finally {
            continue;
          }
        (s = (u = o(s))[0]),
          (u = u[1]),
          "newTracker" === s
            ? a(i)
            : ((u = u
                ? u.map(function (e) {
                    return "".concat(n, "_").concat(e);
                  })
                : m),
              "addPlugin" === s
                ? c(i, u)
                : ((l = void 0),
                  (l = 0 < i.length ? [i[0], u] : void 0 !== h[s] && 2 === h[s].length ? [{}, u] : [u]),
                  0 < Object.keys(p).length ? v.push([s, l]) : r(s, l)));
      }
    }
    for (
      var u = window, l = document, f = ie(), m = [], p = {}, v = [], g = "3.22.1", h = e(ln, ["version"]), y = 0;
      y < t.length;
      y++
    )
      s(t[y]);
    return { push: s };
  })(Yn, Kn.q);
})();
//# sourceMappingURL=sp.js.map
