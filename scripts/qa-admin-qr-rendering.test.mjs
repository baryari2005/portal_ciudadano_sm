import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";
import QRCode from "qrcode";

// Isolated component fault/lifecycle tests, complementary to the real browser
// and PostgreSQL QA. No database, network, or authentication replacement here.
const paletteFile = "src/features/general-settings/constants/experience-palettes.ts";
function compile(file, requireModule) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, require: requireModule }, { filename: file });
  return exports;
}
const palette = compile(paletteFile, () => { throw Error("Unexpected palette dependency"); });
const citizen = id => ({ id, userId: `QA_TEST_${id}`, dni: "80000001", fullName: "QA_TEST Ciudadano", initials: "QA" });
const payload = user => JSON.stringify({ type: "MASM_ACCESS_CARD", userId: user.id, username: user.userId, dni: user.dni });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));

function harness(toDataURL) {
  let cursor = 0, writes = 0;
  const states = [], effects = [], scheduled = [];
  const react = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value; writes++; }]; },
    useMemo(work) { return work(); },
    useEffect(work, deps) { const i = cursor++; const old = effects[i]; if (!old || deps.some((v, n) => v !== old.deps[n])) scheduled.push(() => { old?.cleanup?.(); effects[i] = { deps, cleanup: work() }; }); },
  };
  const jsx = (type, props) => ({ type, props });
  const exports = compile("src/features/users/components/management/UserAccessCardDialog.tsx", name => {
    if (name === "react") return react;
    if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
    if (name === "qrcode") return { default: { toDataURL } };
    if (name.includes("experience-palettes")) return palette;
    if (name === "./UserAccessQrCard") return { buildAccessQrPayload: payload };
    return new Proxy({}, { get: (_, key) => String(key) });
  });
  return {
    render(user, open = true) { cursor = 0; return exports.UserAccessCardDialog({ user, open, onOpenChange() {} }); },
    flush() { while (scheduled.length) scheduled.shift()(); },
    writes: () => writes,
  };
}
function nodes(tree) { if (!tree || typeof tree !== "object") return []; return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)]; }
const images = tree => nodes(tree).filter(n => n.type === "img" && n.props.alt === "QR de ingreso");
const actions = tree => nodes(tree).filter(n => n.type === "Button");

test("the installed renderer produces a PNG from the physical payload with the existing brand palette", async () => {
  const user = citizen("one"); let received;
  const h = harness(async (value, options) => { received = { value, options }; return QRCode.toDataURL(value, options); });
  h.render(user); h.flush();
  // PNG encoding completes asynchronously in qrcode's Node renderer.
  for (let i = 0; i < 100 && !images(h.render(user)).length; i++) await new Promise(r => setTimeout(r, 10));
  const tree = h.render(user);
  assert.equal(received.value, payload(user));
  assert.equal(received.options.color.dark, "#003A22");
  assert.equal(received.options.color.light, "#FFFFFF");
  assert.match(images(tree)[0]?.props.src ?? "", /^data:image\/png;base64,/);
  assert.ok(actions(tree).every(n => !n.props.disabled));
});

test("a rejected renderer ends loading with an alert and keeps print/copy disabled", async () => {
  const h = harness(() => Promise.reject(Error("QA_TEST renderer failure")));
  const user = citizen("failure"); h.render(user); h.flush(); await tick();
  const tree = h.render(user);
  assert.equal(images(tree).length, 0);
  assert.ok(nodes(tree).some(n => n.props?.role === "alert"));
  assert.ok(!JSON.stringify(tree).includes("Generando QR..."));
  assert.ok(actions(tree).every(n => n.props.disabled));
});

test("changing citizens hides the previous image immediately and ignores obsolete generation", async () => {
  const first = deferred(), second = deferred(); let calls = 0;
  const h = harness(() => ++calls === 1 ? first.promise : second.promise);
  const a = citizen("a"), b = citizen("b");
  h.render(a); h.flush(); h.render(b); h.flush();
  first.resolve("data:image/png;base64,obsolete"); await tick();
  assert.equal(images(h.render(b)).length, 0);
  second.resolve("data:image/png;base64,current"); await tick();
  assert.equal(images(h.render(b))[0].props.src, "data:image/png;base64,current");
  assert.equal(images(h.render(a)).length, 0);
  assert.ok(actions(h.render(a)).every(n => n.props.disabled));
});

test("closing the dialog cancels both successful and rejected pending generations", async () => {
  for (const failure of [false, true]) {
    const request = deferred(), h = harness(() => request.promise), user = citizen("closing");
    h.render(user); h.flush(); h.render(user, false); h.flush(); const before = h.writes();
    if (failure) request.reject(Error("QA_TEST late failure")); else request.resolve("late");
    await tick();
    assert.equal(h.writes(), before);
    assert.equal(images(h.render(user, false)).length, 0);
  }
});
