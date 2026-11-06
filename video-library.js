"use strict";

(() => {
  const DB_NAME = "mockup-smart-videos";
  const STORE_NAME = "preferences";
  const HANDLE_KEY = "selected-video-folder";
  const allowedExt = /\.(mp4|webm|m4v|mov|ogv|ogg|3gp)$/i;
  const supportedTypes = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/3gpp"]);
  const byId = (id) => document.getElementById(id);
  const el = {
    status: byId("video-status"), choose: byId("choose-video-folder"),
    grant: byId("grant-video-folder"), refresh: byId("refresh-video-list"),
    forget: byId("forget-video-folder"), folderPick: byId("fallback-video-folder"),
    filePick: byId("fallback-video-files"), folderInput: byId("video-folder-input"),
    fileInput: byId("video-file-input"), count: byId("video-count"),
    list: byId("video-file-list"), player: byId("local-video-player"),
    heading: byId("video-player-heading"), placeholder: byId("video-player-placeholder"),
    feedback: byId("video-player-feedback")
  };

  let directory = null;
  let entries = [];
  let activeObjectURL = null;
  let activeIndex = -1;
  let runNumber = 0;
  let fallbackMode = false;
  let databaseSupported = "indexedDB" in window;
  const hasFolderPicker = typeof window.showDirectoryPicker === "function";

  function status(text, type = "") {
    el.status.textContent = text;
    el.status.dataset.kind = type;
  }

  function errorMessage(err) {
    if (err && err.name === "AbortError") return "Auswahl abgebrochen. Der bisherige Ordner bleibt erhalten.";
    if (err && (err.name === "NotAllowedError" || err.name === "SecurityError")) return "Zugriff verweigert. Bitte über die Schaltfläche erneut freigeben oder alternativ Dateien auswählen.";
    if (err && err.name === "NotFoundError") return "Der Ordner oder eine Datei wurde nicht gefunden. Bitte Ordner erneut auswählen.";
    if (err && err.name === "NotReadableError") return "Datei kann nicht gelesen werden. Prüfe den Android-Dateizugriff.";
    return "Der Dateizugriff ist fehlgeschlagen. Bitte erneut versuchen oder die alternative Dateiauswahl nutzen.";
  }

  function db() {
    return new Promise((resolve, reject) => {
      if (!databaseSupported) return reject(new Error("IndexedDB unavailable"));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME))
          request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getSavedHandle() {
    const database = await db();
    try {
      return await new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } finally { database.close(); }
  }

  async function saveHandle(handle) {
    const database = await db();
    try {
      await new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    } finally { database.close(); }
  }

  async function deleteHandle() {
    const database = await db();
    try {
      await new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } finally { database.close(); }
  }

  async function permission(handle, mayAsk = false) {
    if (!handle) return "denied";
    // Some implementations may expose queryPermission but not requestPermission.
    if (typeof handle.queryPermission !== "function") return "prompt";
    let p = await handle.queryPermission({ mode: "read" });
    if (p !== "granted" && mayAsk && typeof handle.requestPermission === "function")
      p = await handle.requestPermission({ mode: "read" });
    return p;
  }

  function updateButtons() {
    el.grant.hidden = !directory || fallbackMode;
    el.grant.disabled = !directory;
    el.refresh.disabled = !directory && !fallbackMode;
    el.forget.disabled = !directory && !fallbackMode;
    el.choose.textContent = directory ? "Ordner wechseln" : "Videoordner auswählen";
  }

  function resetVideo() {
    el.player.pause();
    el.player.removeAttribute("src");
    el.player.load();
    if (activeObjectURL) URL.revokeObjectURL(activeObjectURL);
    activeObjectURL = null;
    activeIndex = -1;
    el.player.hidden = true;
    el.placeholder.hidden = false;
    el.heading.textContent = "Noch kein Video gewählt";
    el.feedback.textContent = "";
  }

  function renderList() {
    el.count.textContent = String(entries.length);
    el.list.replaceChildren();
    if (!entries.length) {
      const li = document.createElement("li");
      li.className = "video-empty";
      li.textContent = "Keine unterstützten Video-Dateien gefunden.";
      el.list.append(li);
      return;
    }
    entries.forEach((entry, index) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "video-list-button" + (index === activeIndex ? " selected" : "");
      btn.setAttribute("aria-label", entry.name + " abspielen");
      btn.setAttribute("aria-current", index === activeIndex ? "true" : "false");
      const symbol = document.createElement("span");
      symbol.className = "video-entry-icon";
      symbol.textContent = "▶";
      symbol.setAttribute("aria-hidden", "true");
      const name = document.createElement("span");
      name.className = "video-entry-name";
      name.textContent = entry.name;
      const chevron = document.createElement("span");
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "›";
      btn.append(symbol, name, chevron);
      btn.addEventListener("click", () => playEntry(index));
      li.append(btn);
      el.list.append(li);
    });
  }

  function videoFile(file) {
    return file && (allowedExt.test(file.name) || supportedTypes.has(file.type));
  }

  async function loadDirectory() {
    const current = ++runNumber;
    resetVideo();
    entries = [];
    renderList();
    if (!directory) return;
    status("Videos werden eingelesen …");
    try {
      if (await permission(directory) !== "granted") {
        status("Der Ordner ist gespeichert, benötigt aber erneut eine Zugriffsfreigabe.", "warning");
        updateButtons();
        return;
      }
      const found = [];
      for await (const [name, handle] of directory.entries()) {
        if (handle.kind === "file" && allowedExt.test(name)) {
          found.push({ name, getFile: () => handle.getFile() });
        }
      }
      if (current !== runNumber) return;
      found.sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
      entries = found;
      renderList();
      status(found.length
        ? found.length + " Videos in «" + directory.name + "» gefunden."
        : "Keine Video-Dateien im gewählten Ordner. Prüfe Dateiformate oder wähle einen anderen Ordner.");
    } catch (err) {
      if (current !== runNumber) return;
      status(errorMessage(err), "error");
    }
  }

  async function chooseFolder() {
    if (!hasFolderPicker) {
      status("Dieser Browser unterstützt keine Ordnerfreigabe. Verwende die alternative Dateiauswahl.", "warning");
      return;
    }
    try {
      // Must be invoked synchronously from the user's click (transient activation).
      const handle = await window.showDirectoryPicker({ mode: "read" });
      const p = await permission(handle);
      directory = handle;
      fallbackMode = false;
      ++runNumber;
      if (databaseSupported) {
        try { await saveHandle(handle); }
        catch {
          status("Ordner gewählt, konnte aber nicht dauerhaft gespeichert werden.", "warning");
        }
      }
      updateButtons();
      if (p === "granted") await loadDirectory();
      else status("Ordner gewählt. Bitte «Zugriff erneut erlauben» antippen.", "warning");
    } catch (err) {
      status(errorMessage(err), "warning");
    }
  }

  async function grantPermission() {
    if (!directory) return;
    try {
      const result = await permission(directory, true);
      if (result === "granted") await loadDirectory();
      else status("Die Berechtigung wurde nicht erteilt. Alternativ Dateien auswählen.", "warning");
    } catch (err) {
      status(errorMessage(err), "error");
    }
  }

  async function refresh() {
    if (directory && !fallbackMode) {
      // Requesting permission must be attached to user gesture, not automatic scans.
      if (await permission(directory) !== "granted") {
        status("Zum Aktualisieren bitte «Zugriff erneut erlauben» antippen.", "warning");
        return;
      }
      await loadDirectory();
    } else if (fallbackMode) {
      status("Dateiauswahl kann nicht automatisch aktualisiert werden. Bitte Dateien oder Ordner erneut auswählen.", "warning");
    }
  }

  async function forget() {
    ++runNumber;
    directory = null;
    fallbackMode = false;
    entries = [];
    resetVideo();
    renderList();
    updateButtons();
    el.fileInput.value = "";
    el.folderInput.value = "";
    try {
      if (databaseSupported) await deleteHandle();
      status("Gespeicherter Ordner wurde vergessen. Wähle einen neuen Ordner.");
    } catch {
      status("Die Ordnerfreigabe wurde für diese Sitzung aufgehoben; gespeicherte Einstellung konnte nicht gelöscht werden.", "warning");
    }
  }

  function applyFallback(fileList) {
    ++runNumber;
    if (!fileList || fileList.length === 0) return;
    const selection = Array.from(fileList).filter(videoFile);
    directory = null;
    fallbackMode = true;
    entries = selection.map((file) => ({
      name: file.webkitRelativePath || file.name,
      getFile: async () => file
    })).sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
    resetVideo();
    renderList();
    updateButtons();
    status(entries.length
      ? entries.length + " Video-Dateien temporär ausgewählt. Nach Neustart gegebenenfalls erneut auswählen."
      : "Keine unterstützten Video-Dateien in der Auswahl gefunden.", entries.length ? "" : "warning");
    // Clear any previously saved handle to avoid unexpectedly restoring another folder.
    if (databaseSupported) deleteHandle().catch(() => {});
  }

  async function playEntry(index) {
    const entry = entries[index];
    if (!entry) return;
    resetVideo();
    activeIndex = index;
    renderList();
    el.heading.textContent = entry.name;
    el.feedback.textContent = "Video wird geladen …";
    try {
      const file = await entry.getFile();
      if (activeIndex !== index) return;
      const url = URL.createObjectURL(file);
      activeObjectURL = url;
      el.player.src = url;
      el.player.hidden = false;
      el.placeholder.hidden = true;
      el.player.load();
      try {
        await el.player.play();
        el.feedback.textContent = "";
      } catch (err) {
        // Browser can require a second play tap or reject an unsupported codec.
        if (err.name === "NotAllowedError") el.feedback.textContent = "Bitte am Videoplayer auf Play tippen.";
        else if (err.name !== "AbortError") el.feedback.textContent = "Automatische Wiedergabe nicht möglich. Bitte Play tippen oder Format prüfen.";
      }
    } catch (err) {
      el.feedback.textContent = errorMessage(err);
    }
  }

  function onVideoViewChange(route) {
    if (route !== "videos") {
      resetVideo();
      renderList();
    } else if (directory && !fallbackMode) {
      // Check only; never request permissions automatically on navigation.
      loadDirectory();
    }
  }

  async function initialise() {
    el.choose.addEventListener("click", chooseFolder);
    el.grant.addEventListener("click", grantPermission);
    el.refresh.addEventListener("click", refresh);
    el.forget.addEventListener("click", forget);
    el.folderPick.addEventListener("click", () => { el.folderInput.value = ""; el.folderInput.click(); });
    el.filePick.addEventListener("click", () => { el.fileInput.value = ""; el.fileInput.click(); });
    el.folderInput.addEventListener("change", (event) => applyFallback(event.target.files));
    el.fileInput.addEventListener("change", (event) => applyFallback(event.target.files));
    el.player.addEventListener("error", () => {
      if (activeObjectURL) el.feedback.textContent = "Dieses Videoformat oder dieser Codec wird vom Browser möglicherweise nicht unterstützt.";
    });
    document.addEventListener("mockup:routechange", (event) => onVideoViewChange(event.detail.route));
    window.addEventListener("pagehide", resetVideo);
    if (!hasFolderPicker) {
      el.choose.disabled = true;
      status("Direkter Ordnerzugriff ist auf diesem Gerät nicht verfügbar. Verwende die alternative Dateiauswahl.", "warning");
      return;
    }
    if (!databaseSupported) {
      status("Ordnerauswahl möglich, aber dieses Gerät kann die Auswahl nicht dauerhaft speichern.", "warning");
      return;
    }
    try {
      directory = await getSavedHandle();
      updateButtons();
      if (!directory) status("Wähle einmal den Ordner Documents/SMART auf deinem Tablet.");
      else if (await permission(directory) === "granted") await loadDirectory();
      else status("Der Ordner «" + directory.name + "» ist gespeichert. Tippe auf «Zugriff erneut erlauben».", "warning");
    } catch {
      directory = null;
      updateButtons();
      status("Gespeicherter Ordner konnte nicht geladen werden. Bitte erneut auswählen.", "warning");
    }
  }
  initialise();
})();
