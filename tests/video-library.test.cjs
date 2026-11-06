"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");

function fakeElement(id) {
  const listeners = new Map();
  return {
    id, hidden: false, disabled: false, textContent: "", value: "",
    dataset: {}, children: [], className: "", attributes: {},
    addEventListener(name, cb) { listeners.set(name, cb); },
    dispatch(name, arg) { return listeners.get(name)?.(arg); },
    setAttribute(key, value) { this.attributes[key] = value; },
    removeAttribute(key) { delete this.attributes[key]; },
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = [...items]; },
    pause() { this.paused = true; },
    load() { this.loaded = true; },
    play() { this.played = true; return Promise.resolve(); },
    click() { this.clicked = true; }
  };
}

function createHarness({ showDirectoryPicker, indexedDB } = {}) {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, fakeElement(id));
    return elements.get(id);
  };
  const listeners = new Map();
  let nextURL = 0;
  const created = [];
  const revoked = [];
  const sandbox = {
    window: {
      showDirectoryPicker,
      addEventListener(name, cb) { listeners.set("window:" + name, cb); }
    },
    indexedDB,
    document: {
      getElementById: get,
      createElement: fakeElement,
      addEventListener(name, cb) { listeners.set(name, cb); }
    },
    URL: {
      createObjectURL(file) {
        const url = "blob:test-" + ++nextURL;
        created.push({ file, url });
        return url;
      },
      revokeObjectURL(url) { revoked.push(url); }
    },
    console,
    Set,
    Promise,
    Error
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "video-library.js"), "utf8"),
    sandbox,
    { filename: "video-library.js" }
  );
  return { get, listeners, created, revoked, sandbox };
}

function tick() {
  return new Promise((resolve) => setImmediate(resolve));
}

test("fallback file picker filters and sorts local video filenames", async () => {
  const h = createHarness();
  await tick();
  assert.match(h.get("video-status").textContent, /nicht verfügbar/);

  h.get("video-file-input").dispatch("change", {
    target: { files: [
      { name: "Zebra.webm", type: "video/webm" },
      { name: "Text.txt", type: "text/plain" },
      { name: "Alpha.mp4", type: "video/mp4" }
    ] }
  });

  assert.equal(h.get("video-count").textContent, "2");
  const rows = h.get("video-file-list").children;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].children[0].children[1].textContent, "Alpha.mp4");
  assert.equal(rows[1].children[0].children[1].textContent, "Zebra.webm");

  rows[0].children[0].dispatch("click");
  await tick();
  assert.equal(h.created.length, 1);
  assert.equal(h.get("local-video-player").played, true);

  h.listeners.get("mockup:routechange")({ detail: { route: "informationen" } });
  assert.deepEqual(h.revoked, [h.created[0].url]);
  assert.equal(h.get("local-video-player").paused, true);
});

test("choosing a folder shows read-only files and forgets without deleting them", async () => {
  const files = [
    { name: "Clip02.mp4", type: "video/mp4" },
    { name: "Clip01.webm", type: "video/webm" }
  ];
  const handle = {
    name: "SMART",
    kind: "directory",
    async queryPermission() { return "granted"; },
    async *entries() {
      yield ["notes.txt", { kind: "file", name: "notes.txt" }];
      for (const f of files) yield [f.name, { kind: "file", async getFile() { return f; } }];
    }
  };
  const h = createHarness({ showDirectoryPicker: async () => handle });
  await tick();
  await h.get("choose-video-folder").dispatch("click");
  await tick();
  assert.equal(h.get("video-count").textContent, "2");
  assert.match(h.get("video-status").textContent, /2 Videos/);

  await h.get("forget-video-folder").dispatch("click");
  assert.equal(h.get("video-count").textContent, "0");
  assert.equal(files.length, 2);
});

test("unsupported picker provides alternative controls and no server upload", async () => {
  const h = createHarness();
  await tick();
  assert.equal(h.get("choose-video-folder").disabled, true);
  h.get("fallback-video-files").dispatch("click");
  assert.equal(h.get("video-file-input").clicked, true);
});
