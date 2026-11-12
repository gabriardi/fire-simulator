// Export and import: every plan in one file, the backup and the way to another device.
import { t } from "../i18n.js";
import { fromNewer, normalize } from "../plan.js";
import * as store from "../store.js";
import { el } from "./dom.js";
import { toast } from "./messages.js";
import { addPlan, edits, renderPlanBar, switchTo, uniqueName } from "./plans.js";
import { NEWER } from "./share.js";
import { exported, plans, setExported, state } from "./state.js";

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = el("a", { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function exportPlans() {
  const f = store.exportFile(plans);
  download(f.name, f.text);
  setExported(Date.now());
  store.saveExported(exported);
  renderPlanBar();
  const n = plans.length;
  toast(edits().length ? t("files.exported.unsaved", { n }) : t("files.exported", { n }));
}
export async function importPlans(file) {
  let items;
  try {
    items = store.readFile(await file.text());
  } catch (err) {
    toast(err.message, { error: true });
    return;
  }
  if (items.some((x) => fromNewer(x.plan))) {
    toast(NEWER.file, { error: true });
    return;
  }
  const added = items.map((x) =>
    addPlan(
      uniqueName(str(x.name) || t("files.untitled")),
      normalize(x.plan, { currency: state.currency }),
    ),
  );
  switchTo(added[0].id);
  toast(t("files.imported", { n: added.length }));
}
const str = (v) => (typeof v === "string" ? v.trim().slice(0, 50) : "");
