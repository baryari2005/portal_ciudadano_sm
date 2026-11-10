import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";

// Controlled UI scheduling only; real HTTP/PostgreSQL checks are kept in
// qa-four-corrections.mjs and in the browser evidence.
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function harness(file, exportName, args, clients = {}) {
  let cursor = 0, writes = 0;
  const slots = [], effects = [], cleanups = [], timers = [], events = new EventTarget();
  const requests = [];
  const request = () => { const d = deferred(); requests.push(d); return d.promise; };
  const react = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; writes++; }]; },
    useRef(initial) { const i = cursor++; if (!(i in slots)) slots[i] = { current: initial }; return slots[i]; },
    useCallback: work => work,
    useMemo: work => work(),
    useEffect: work => effects.push(work),
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, {
    exports,
    require(name) {
      if (name === "react") return react;
      if (name.includes("stores/auth")) return { useAuth: selector => selector({ token: "QA_ONLY", user: { id: "QA_TEST" }, hasHydrated: true }) };
      if (name.includes("notifications.service")) return { NOTIFICATIONS_CHANGED_EVENT: "notifications:changed", listCitizenNotificationsClient: request, ...clients };
      throw Error("Unexpected dependency: " + name);
    },
    window: { addEventListener: (...a) => events.addEventListener(...a), removeEventListener: (...a) => events.removeEventListener(...a), setInterval: fn => { timers.push(fn); return timers.length; }, clearInterval() {} },
    fetch: request,
  });
  return {
    render() { cursor = 0; return exports[exportName](...args); },
    mount() { for (const effect of effects.splice(0)) cleanups.push(effect()); },
    unmount() { for (const cleanup of cleanups) cleanup?.(); },
    changed() { events.dispatchEvent(new Event("notifications:changed")); },
    poll() { timers[0](); },
    requests, writes: () => writes,
  };
}
const hookFile = "src/features/notifications/hooks/useNotifications.ts";
const result = unread => ({ items: [], meta: { total: unread, unreadCount: unread } });

test("a late pre-read GET cannot restore unread items after the read-change event", async () => {
  const h = harness(hookFile, "useCitizenNotifications", [{ pageSize: 1 }]);
  h.render(); h.mount(); h.changed();
  assert.equal(h.requests.length, 2);
  h.requests[1].resolve(result(0)); await tick();
  h.requests[0].resolve(result(7)); await tick();
  assert.equal(h.render().meta.unreadCount, 0);
  assert.equal(h.render().loading, false);
  h.unmount();
});

test("polling detects a new notification, while unmount prevents obsolete state updates", async () => {
  const h = harness(hookFile, "useCitizenNotifications", [{}]);
  h.render(); h.mount(); h.requests[0].resolve(result(0)); await tick();
  h.poll(); h.requests[1].resolve(result(1)); await tick();
  assert.equal(h.render().meta.unreadCount, 1);
  h.changed(); h.unmount(); const before = h.writes();
  h.requests[2].reject(Error("QA_TEST late response")); await tick();
  assert.equal(h.writes(), before);
});

test("the bell ignores an outdated poll after a newer notification-read refresh", async () => {
  const h = harness("src/components/layout/dashboard-topbar/usePendingUsersAlert.ts", "usePendingUsersAlert", [false]);
  h.render(); h.mount(); h.changed();
  const response = unread => ({ ok: true, json: async () => ({ data: { meta: { unreadCount: unread } } }) });
  h.requests[1].resolve(response(0)); await tick();
  h.requests[0].resolve(response(9)); await tick();
  assert.equal(h.render().unreadNotificationCount, 0);
  assert.equal(h.render().totalActions, 0);
  h.unmount();
});
