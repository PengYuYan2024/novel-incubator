"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export type CloseGuard = { dirty: boolean; saving: boolean; flush: () => boolean; discard: () => boolean };
const Context = createContext<{ register: (guard: CloseGuard | null) => void; close: () => void } | null>(null);
export const useDraftDialog = () => useContext(Context);

export function DraftDialog({ open, onOpenChange, children }: { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode }) {
  const guard = useRef<CloseGuard | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const register = useCallback((value: CloseGuard | null) => { guard.current = value; }, []);
  function close() {
    if (guard.current?.saving) return;
    if (guard.current?.dirty) { setError(""); setConfirm(true); }
    else onOpenChange(false);
  }
  function finish(discard: boolean) {
    const ok = discard ? guard.current?.discard() : guard.current?.flush();
    if (ok === false) { setError("无法处理本地草稿，请继续编辑并复制或下载内容后再关闭。"); return; }
    setConfirm(false);
    onOpenChange(false);
  }
  return <Context.Provider value={{ register, close }}>
    <Dialog open={open} onOpenChange={value => value ? onOpenChange(true) : close()}>{children}</Dialog>
    <AlertDialog open={confirm} onOpenChange={setConfirm}>
      <AlertDialogContent className="bg-[#fffdf8]">
        <AlertDialogHeader><AlertDialogTitle>还有未正式保存的修改</AlertDialogTitle><AlertDialogDescription>保留草稿只暂存在当前浏览器，不会修改云端资料。</AlertDialogDescription></AlertDialogHeader>
        {error && <p role="alert">{error}</p>}
        <AlertDialogFooter className="flex-wrap">
          <Button type="button" variant="outline" onClick={() => setConfirm(false)}>继续编辑</Button>
          <Button type="button" variant="outline" onClick={() => finish(true)}>丢弃修改</Button>
          <Button type="button" onClick={() => finish(false)}>保留草稿并关闭</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </Context.Provider>;
}
