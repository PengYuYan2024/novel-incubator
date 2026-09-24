"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { downloadDraft, readDrafts, removeDraft, type StoredDraft } from "@/lib/client/draft-store";

type Controller = { entries: StoredDraft[]; error: string; dirty: boolean; saving: boolean; persisted: boolean; conflict: boolean; recover: (entry: StoredDraft) => void; remove: (entry: StoredDraft) => void; discard: () => boolean };

function DraftExport({ text }: { text: string }) {
  const [message, setMessage] = useState("");
  return <><Button type="button" variant="outline" onClick={async () => {
    try { await navigator.clipboard.writeText(text); setMessage("已复制草稿"); }
    catch { setMessage("无法复制，请下载草稿"); }
  }}>复制草稿</Button><Button type="button" variant="outline" onClick={() => {
    try { downloadDraft(text); } catch { setMessage("下载失败，请选择并复制下方原文"); }
  }}>下载草稿</Button>{message && <span role="status">{message}</span>}</>;
}

export function DraftPanel({ draft, value }: { draft: Controller; value: object }) {
  const [confirm, setConfirm] = useState<string | null>(null);
  return <section aria-label="本地草稿" className="space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3 text-sm">
    <p>草稿仅存当前浏览器，不跨设备同步；清理浏览器数据会删除草稿，不包含在“导出全部资料”中。</p>
    {draft.entries.length > 0 && <p>恢复会建立独立副本；仍被其他页面使用的来源草稿会保留，确认不再需要后可手动清除。</p>}
    <p role="status">{draft.persisted ? "草稿已暂存于当前浏览器" : draft.dirty ? "有未正式保存的修改" : "正式保存后，资料才会跨设备保存"}</p>
    {draft.error && <p role="alert" className="text-red-800">{draft.error}</p>}
    {draft.conflict && <p role="alert" className="text-amber-900">云端资料已更新，不能用旧草稿覆盖。请先复制或下载草稿，重新打开最新资料后手动合并。</p>}
    {draft.dirty && <div className="flex flex-wrap gap-2"><DraftExport text={JSON.stringify(value, null, 2)} /><Button type="button" disabled={draft.saving} variant="outline" onClick={() => setConfirm("current")}>丢弃当前修改</Button></div>}
    {draft.entries.map(entry => <div key={entry.key} className="space-y-2 border-t pt-2">
      <p>{entry.record ? `未提交草稿 · ${new Date(entry.record.savedAt).toLocaleString("zh-CN")}` : "草稿损坏或版本不兼容，仍可下载原文"}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={draft.dirty || draft.saving || !entry.record} onClick={() => draft.recover(entry)}>恢复草稿</Button>
        <Button type="button" variant="outline" disabled={draft.saving} onClick={() => setConfirm(entry.key)}>丢弃草稿</Button>
        <DraftExport text={entry.raw} />
      </div>
    </div>)}
    {draft.dirty && draft.entries.length > 0 && <p>恢复另一份草稿前，请先保存或丢弃当前修改。</p>}
    {confirm && <div role="alert" className="space-y-2"><p>确定丢弃这份未提交修改？此操作不能撤销。</p><Button type="button" variant="outline" onClick={() => setConfirm(null)}>保留</Button> <Button type="button" disabled={draft.saving} onClick={() => {
      if (confirm === "current") draft.discard();
      else { const entry = draft.entries.find(e => e.key === confirm); if (entry) draft.remove(entry); }
      setConfirm(null);
    }}>确认丢弃</Button></div>}
  </section>;
}

// All drafts remain exportable even when the original record/project is gone.
export function DraftShelf() {
  const [entries, setEntries] = useState<StoredDraft[]>([]);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  function refresh() { try { setEntries(readDrafts(localStorage)); } catch { setError("无法读取本地草稿，请检查浏览器存储权限。"); } }
  useEffect(() => { const timer = setTimeout(refresh, 0); window.addEventListener("storage", refresh); return () => { clearTimeout(timer); window.removeEventListener("storage", refresh); }; }, []);
  return <section aria-label="全部本地草稿" className="space-y-3 border-t pt-4">
    <h3 className="font-medium">本地未提交草稿</h3><p className="text-sm">仅存当前浏览器，不包含在全部资料备份中。即使原项目或记录已删除，也可在这里复制、下载草稿。</p>
    <Button type="button" variant="outline" onClick={refresh}>刷新草稿列表</Button>
    {error && <p role="alert">{error}</p>}
    {!entries.length && <p className="text-sm">没有本地草稿</p>}
    {entries.map(entry => <div key={entry.key} className="space-y-2 rounded border p-3 text-sm">
      <p>{entry.record ? `${entry.record.scope} · ${new Date(entry.record.savedAt).toLocaleString("zh-CN")}` : "损坏或不兼容的草稿"}</p>
      <div className="flex flex-wrap gap-2"><DraftExport text={entry.raw} /><Button type="button" variant="outline" onClick={() => setConfirm(entry.key)}>清除这份草稿</Button></div>
      <details><summary>查看原文</summary><pre className="max-h-48 overflow-auto whitespace-pre-wrap break-all">{entry.raw}</pre></details>
      {confirm === entry.key && <div><p>清除后不能撤销，请先下载需要保留的内容。</p><Button type="button" variant="outline" onClick={() => setConfirm(null)}>取消清除</Button> <Button type="button" onClick={() => { try { removeDraft(localStorage, entry); refresh(); setConfirm(null); } catch { setError("清除失败，草稿仍保留。"); } }}>确认清除</Button></div>}
    </div>)}
  </section>;
}
