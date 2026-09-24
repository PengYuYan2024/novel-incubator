"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { DRAFT_PREFIX, readDrafts, removeDraft, sameShape, type StoredDraft } from "./draft-store";
import { useDraftDialog } from "@/components/drafts/draft-dialog";

// Conservative live-form marker: a crashed page may leave this marker behind.
// Such sources stay exportable and are only removed by explicit user cleanup.
const ownerKey = (key: string) => `novel-incubator:draft-owner:${key}`;

export function useLocalDraft<T extends object>({ scope, value, restore, baseUpdatedAt, saving }: {
  scope: string; value: T; restore: (value: T) => void; baseUpdatedAt?: string; saving: boolean;
}) {
  const [initial] = useState(() => JSON.stringify(value));
  const [baseline, setBaseline] = useState(initial);
  const [version, setVersion] = useState(baseUpdatedAt);
  const [recovered, setRecovered] = useState(false);
  const originalVersion = useRef(baseUpdatedAt);
  const key = useRef("");
  const adopted = useRef<StoredDraft | null>(null);
  const latest = useRef({ value, dirty: false });
  const [entries, setEntries] = useState<StoredDraft[]>([]);
  const [error, setError] = useState("");
  const [savedJson, setSavedJson] = useState("");
  const [revision, setRevision] = useState(0);
  const dialog = useDraftDialog();
  const serialized = JSON.stringify(value);
  const dirty = serialized !== baseline;
  useEffect(() => { latest.current = { value, dirty }; });

  const refresh = useCallback(() => {
    try {
      const all = readDrafts(localStorage, scope);
      if (key.current && !all.some(entry => entry.key === key.current)) setSavedJson("");
      setEntries(all.filter(entry => entry.key !== key.current && entry.key !== adopted.current?.key));
    }
    catch { setError("浏览器不允许访问本地草稿。请正式保存，或复制、下载内容。"); }
  }, [scope]);
  const flush = useCallback(() => {
    try {
      if (!latest.current.dirty) {
        if (key.current) { localStorage.removeItem(key.current); localStorage.removeItem(ownerKey(key.current)); }
        key.current = "";
        setSavedJson("");
        return true;
      }
      if (!key.current) key.current = `${DRAFT_PREFIX}${encodeURIComponent(scope)}:${crypto.randomUUID()}`;
      const data = latest.current.value;
      localStorage.setItem(ownerKey(key.current), "active");
      localStorage.setItem(key.current, JSON.stringify({ version: 1, scope, savedAt: new Date().toISOString(), baseUpdatedAt: originalVersion.current, data }));
      setSavedJson(JSON.stringify(data));
      setError("");
      return true;
    } catch { setError("草稿暂存失败，可能是空间不足或存储被禁用。请正式保存，或复制、下载内容。"); return false; }
  }, [scope]);
  function clearStored() {
    try {
      if (key.current) { localStorage.removeItem(key.current); localStorage.removeItem(ownerKey(key.current)); }
      // Only consume unchanged source drafts whose original form released ownership.
      if (adopted.current && !localStorage.getItem(ownerKey(adopted.current.key))) removeDraft(localStorage, adopted.current);
      adopted.current = null;
      key.current = "";
      setSavedJson("");
      refresh();
      return true;
    } catch { setError("无法清除本地草稿。正式保存的资料不受影响，可稍后在本地草稿中清理。"); return false; }
  }
  function saved() {
    setBaseline(JSON.stringify(latest.current.value));
    latest.current.dirty = false;
    clearStored();
    setRevision(v => v + 1);
  }
  function discard() {
    if (!clearStored()) return false;
    const data = JSON.parse(initial) as T;
    setBaseline(initial);
    latest.current = { value: data, dirty: false };
    originalVersion.current = baseUpdatedAt;
    setVersion(baseUpdatedAt);
    setRecovered(false);
    restore(data);
    setRevision(v => v + 1);
    return true;
  }
  function recover(entry: StoredDraft) {
    if (dirty || saving) return;
    if (!entry.record || !sameShape(entry.record.data, value)) { setError("草稿格式损坏或不兼容，请下载原文后手动恢复。"); return; }
    adopted.current = entry;
    originalVersion.current = entry.record.baseUpdatedAt;
    setVersion(entry.record.baseUpdatedAt);
    setRecovered(true);
    const data = entry.record.data as T;
    latest.current = { value: data, dirty: true };
    restore(data);
    setRevision(v => v + 1);
    refresh();
  }
  useEffect(() => { const timer = setTimeout(refresh, 0); window.addEventListener("storage", refresh); return () => { clearTimeout(timer); window.removeEventListener("storage", refresh); }; }, [refresh]);
  useEffect(() => {
    if (saving) return;
    const timer = setTimeout(flush, 500);
    return () => clearTimeout(timer);
  }, [serialized, dirty, saving, flush, revision]);
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (!latest.current.dirty) return;
      flush(); event.preventDefault(); event.returnValue = "";
    };
    const hide = () => { if (document.visibilityState === "hidden") flush(); };
    const release = () => { try { if (key.current) localStorage.removeItem(ownerKey(key.current)); } catch { /* Keep the conservative marker if storage is denied. */ } };
    const pageHide = (event: PageTransitionEvent) => { flush(); if (!event.persisted) release(); };
    window.addEventListener("beforeunload", leave);
    window.addEventListener("pagehide", pageHide);
    document.addEventListener("visibilitychange", hide);
    return () => {
      flush();
      release();
      window.removeEventListener("beforeunload", leave);
      window.removeEventListener("pagehide", pageHide);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [flush]);
  const register = dialog?.register;
  useEffect(() => { register?.({ dirty, saving, flush, discard }); });
  useEffect(() => () => register?.(null), [register]);
  return { entries, error, dirty, saving, recover, discard, saved, flush, refresh,
    baseUpdatedAt: version,
    conflict: recovered && version !== baseUpdatedAt,
    persisted: dirty && savedJson === serialized && !error,
    close: dialog?.close,
    remove(entry: StoredDraft) {
      try { removeDraft(localStorage, entry); refresh(); } catch { setError("无法清除草稿，请检查浏览器存储设置。"); }
    },
  };
}
