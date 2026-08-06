import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EyeBrow } from "@/components/ui/eye-brow";
import { ApiError, ERROR_CODES } from "@/lib/api-error";
import { reportApiError } from "@/lib/api-error-handler";

/**
 * หน้าไล่ดู toast ทุกแบบในที่เดียว — เครื่องมือของคนทำระบบ ไม่ได้อยู่ในเมนู
 *
 * มีไว้เพราะ toast โผล่แค่ตอนบันทึกสำเร็จ/พลาด กว่าจะเห็นครบทุกแบบต้องไปนั่ง
 * กดจริงทีละโมดูล พอจะปรับหน้าตาทีก็เทียบไม่ได้ว่าอันไหนเปลี่ยนไปยังไง
 *
 * ข้อความในหน้านี้ตั้งใจไม่แปล — คนอ่านคือคนทำระบบ ไม่ใช่พนักงานโรงแรม
 */

/** ปุ่มหนึ่งตัว = toast หนึ่งแบบ */
function Shot({
  label,
  onClick,
}: {
  readonly label: string;
  readonly onClick: () => void;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      {label}
    </Button>
  );
}

function Section({
  title,
  note,
  children,
}: {
  readonly title: string;
  readonly note?: string;
  readonly children: React.ReactNode;
}) {
  // ไม่ใช้ Card/CardHeader เพราะ variant `[.border-b]:pb-6` ของ shadcn ทำให้หัว
  // การ์ดสูงกว่าตัวเนื้อหาเสียอีก ทั้งที่หน้านี้อยากเห็นปุ่มเยอะ ๆ ในจอเดียว
  return (
    <section className="bg-card rounded-xl border p-4">
      <h2 className="text-sm font-semibold">{title}</h2>
      {note && <p className="text-muted-foreground mt-0.5 text-xs">{note}</p>}
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

const LONG_EN =
  "Purchase order PO26080012 for King Power Beverage Co., Ltd. was submitted for approval and is now waiting on the cost controller.";
const LONG_TH =
  "บันทึกใบสั่งซื้อ PO26080012 ของ บจก. คิงเพาเวอร์ เบฟเวอเรจ เรียบร้อยแล้ว ส่งต่อให้ผู้ควบคุมต้นทุนตรวจสอบ";

export default function ToastPlayground() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-10">
      <div>
        <EyeBrow>Internal tool</EyeBrow>
        <h1 className="text-lg font-semibold">Toast playground</h1>
        <p className="text-muted-foreground text-xs">
          Every toast shape in one place. Flip the theme in the navbar to check
          both. Not linked from the menu — reachable at{" "}
          <code className="text-foreground">/dev/toast</code>.
        </p>
      </div>

      <Section
        title="Types"
        note="Neutral surface; the hue appears once, on the icon (docs/DESIGN.md — avoid neon)."
      >
        <Shot label="success" onClick={() => toast.success("Unit saved")} />
        <Shot
          label="error"
          onClick={() => toast.error("Could not save the unit")}
        />
        <Shot
          label="warning"
          onClick={() => toast.warning("Pick both locations first")}
        />
        <Shot
          label="info"
          onClick={() => toast.info("Exchange rates refreshed 5 minutes ago")}
        />
        <Shot
          label="loading"
          onClick={() => toast.loading("Generating report…")}
        />
        <Shot label="plain" onClick={() => toast("Draft saved")} />
      </Section>

      <Section
        title="With description"
        note="Title 12px, description 11px muted — the second line must not compete."
      >
        <Shot
          label="success + desc"
          onClick={() =>
            toast.success("Credit note submitted", {
              description: "CN26080001 · waiting on the cost controller",
            })
          }
        />
        <Shot
          label="error + desc"
          onClick={() =>
            toast.error("Could not submit", {
              description: "Quantity on line 2 is more than what was received.",
            })
          }
        />
      </Section>

      <Section
        title="With buttons"
        note="Action uses the one accent colour; cancel stays neutral."
      >
        <Shot
          label="action"
          onClick={() =>
            toast.success("Item removed", {
              action: { label: "Undo", onClick: () => toast("Restored") },
            })
          }
        />
        <Shot
          label="action + cancel"
          onClick={() =>
            toast.warning("Leaving with unsaved changes", {
              action: { label: "Save", onClick: () => toast.success("Saved") },
              cancel: { label: "Discard", onClick: () => undefined },
            })
          }
        />
      </Section>

      <Section
        title="Text stress"
        note="Long copy wraps; Thai sets the line-height floor."
      >
        <Shot label="long EN" onClick={() => toast.success(LONG_EN)} />
        <Shot label="long TH" onClick={() => toast.success(LONG_TH)} />
        <Shot
          label="long + desc"
          onClick={() =>
            toast.error(LONG_TH, {
              description: LONG_EN,
            })
          }
        />
      </Section>

      <Section
        title="Timing and stacking"
        note="Five at once shows how the stack collapses; hover to expand."
      >
        <Shot
          label="stack ×5"
          onClick={() =>
            ["one", "two", "three", "four", "five"].forEach((n, i) =>
              toast.success(`Saved item ${n}`, { id: `stack-${i}` }),
            )
          }
        />
        <Shot
          label="promise"
          onClick={() =>
            toast.promise(new Promise((res) => setTimeout(res, 2000)), {
              loading: "Uploading images…",
              success: "3 images uploaded",
              error: "Upload failed",
            })
          }
        />
        <Shot
          label="promise (reject)"
          onClick={() =>
            toast.promise(new Promise((_, rej) => setTimeout(rej, 2000)), {
              loading: "Committing adjustment…",
              success: "Committed",
              error: "The period is already closed",
            })
          }
        />
        <Shot
          label="sticky"
          onClick={() =>
            toast.warning("Backend unreachable — working offline", {
              duration: Infinity,
            })
          }
        />
        <Shot label="dismiss all" onClick={() => toast.dismiss()} />
      </Section>

      <Section
        title="The real pipeline"
        note="Goes through reportApiError → ApiErrorToaster → useErrorToast, the same path every failed mutation takes."
      >
        <Shot
          label="404"
          onClick={() =>
            reportApiError(
              new ApiError(ERROR_CODES.NOT_FOUND, "Not found", 404),
            )
          }
        />
        <Shot
          label="500"
          onClick={() =>
            reportApiError(
              new ApiError(ERROR_CODES.INTERNAL_ERROR, "Boom", 500),
            )
          }
        />
        <Shot
          label="network"
          onClick={() =>
            reportApiError(
              new ApiError(ERROR_CODES.NETWORK_ERROR, "Offline", 0),
            )
          }
        />
      </Section>
    </div>
  );
}
