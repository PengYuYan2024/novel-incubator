import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BackupDialog } from "@/components/backup/backup-dialog";
import { validateBackupDocument } from "@/lib/domain/backup";
import type { BackupExportDocument } from "@/lib/domain/types";

const emptyBackup: BackupExportDocument = {
  schemaVersion: 1,
  exportedAt: "2026-09-11T08:00:00.000Z",
  projects: [],
  items: [],
  relations: [],
};
const backupText = JSON.stringify(emptyBackup);

async function downloadText(backup: BackupExportDocument): Promise<string> {
  let downloadedBlob: Blob | undefined;
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: (blob: Blob) => {
      downloadedBlob = blob;
      return "blob:backup-test";
    },
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: () => undefined,
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

  render(
    <BackupDialog
      open
      onOpenChange={vi.fn()}
      exportData={vi.fn(async () => backup)}
    />,
  );
  await userEvent.click(screen.getByRole("button", { name: /JSON/ }));
  await waitFor(() => expect(downloadedBlob).toBeInstanceOf(Blob));
  return downloadedBlob!.text();
}

describe("BackupDialog", () => {
  afterEach(() => {
    Reflect.deleteProperty(URL, "createObjectURL");
    Reflect.deleteProperty(URL, "revokeObjectURL");
    vi.restoreAllMocks();
  });

  it("downloads the exported document as compact JSON", async () => {
    expect(await downloadText(emptyBackup)).toBe(backupText);
  });

  it("keeps a legal near-10 MB export inside the import preflight limit", async () => {
    const body = "界".repeat(145);
    const tags = Array.from({ length: 30 }, (_, index) => `标签-${index}`);
    const nearLimitBackup: BackupExportDocument = {
      schemaVersion: 1,
      exportedAt: "2026-09-11T08:00:00.000Z",
      projects: [{
        id: "project-1",
        title: "边界项目",
        genre: "",
        logline: "",
        description: "",
        status: "warming",
        createdAt: "2026-09-10T08:00:00.000Z",
        updatedAt: "2026-09-11T08:00:00.000Z",
      }],
      items: Array.from({ length: 9_999 }, (_, index) => ({
        id: `item-${index}`,
        projectId: "project-1",
        type: "inspiration",
        subtype: "idea",
        title: "",
        body,
        status: "inbox",
        tags,
        metadata: {},
        createdAt: "2026-09-10T08:00:00.000Z",
        updatedAt: "2026-09-11T08:00:00.000Z",
      })),
      relations: [],
    };

    const text = await downloadText(nearLimitBackup);
    const bytes = new TextEncoder().encode(text).byteLength;
    expect(bytes).toBeGreaterThan(9 * 1024 * 1024);
    expect(bytes).toBeLessThanOrEqual(10 * 1024 * 1024);
    expect(validateBackupDocument(JSON.parse(text), bytes)).toMatchObject({
      success: true,
      counts: { projects: 1, items: 9_999, relations: 0 },
    });
  }, 30_000);

  it("shows preflight counts and confirms before a full restore", async () => {
    const user = userEvent.setup();
    const preflightText = vi.fn(async () => ({ projects: 1, items: 3, relations: 2 }));
    const restoreText = vi.fn(async () => ({ projects: 1, items: 3, relations: 2 }));
    const onRestored = vi.fn();
    render(
      <BackupDialog
        open
        onOpenChange={vi.fn()}
        exportData={vi.fn()}
        preflightText={preflightText}
        restoreText={restoreText}
        onRestored={onRestored}
      />,
    );
    const file = new File([backupText], "backup.json", { type: "application/json" });
    await user.upload(screen.getByLabelText("选择 JSON 备份"), file);
    expect(await screen.findByText("1 个项目、3 条内容、2 条关联")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "恢复全部资料" }));
    expect(restoreText).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "确认完整恢复" }));
    expect(restoreText).toHaveBeenCalledWith(backupText);
    expect(onRestored).toHaveBeenCalledOnce();
  });
});
