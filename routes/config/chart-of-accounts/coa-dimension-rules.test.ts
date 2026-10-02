import { beforeEach, expect, it, vi } from "vitest";
import { httpClient } from "@/lib/http-client";
import { readCoaRules, saveCoaRules } from "./coa-dimension-rules";
vi.mock("@/lib/http-client", () => ({ httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
const rule = (id: string, dimension: string, requirement = "optional", account = "account") => ({ id, chart_of_accounts_id: account, gl_dimension_id: dimension, requirement, doc_version: 2 });
const response = (data: unknown) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
beforeEach(() => vi.resetAllMocks());
it("accepts the live API empty response without pagination", async () => {
 vi.mocked(httpClient.get).mockResolvedValue(response({ data: [], success: true }));
 expect(await readCoaRules("BU", "account")).toEqual([]);
});
it("loads all pages and excludes another account even if the server ignores its filter", async () => {
 vi.mocked(httpClient.get).mockResolvedValueOnce(response({ data: [rule("a", "d1")], paginate: { pages: 2 } }))
 .mockResolvedValueOnce(response({ data: [rule("b", "d2"), rule("other", "d3", "optional", "other")], paginate: { pages: 2 } }));
 expect((await readCoaRules("BU", "account")).map(r => r.id)).toEqual(["a", "b"]);
 expect(vi.mocked(httpClient.get).mock.calls[0][0]).toContain("chart_of_accounts_id%7Cstring%3Aaccount");
});
it("updates changed rules with version, deletes cleared rules, adds new rules and preserves unchanged ones", async () => {
 vi.mocked(httpClient.get).mockResolvedValue(response({ data: [rule("a", "change"), rule("b", "clear"), rule("c", "keep", "prohibited")], paginate: { pages: 1 } }));
 vi.mocked(httpClient.put).mockResolvedValue(response({})); vi.mocked(httpClient.delete).mockResolvedValue(response({})); vi.mocked(httpClient.post).mockResolvedValue(response({}));
 await saveCoaRules("BU", "account", { change: "mandatory", keep: "prohibited", add: "optional" });
 expect(httpClient.put).toHaveBeenCalledWith(expect.stringContaining("/a"), { requirement: "mandatory", doc_version: 2 });
 expect(httpClient.delete).toHaveBeenCalledWith(expect.stringContaining("/b"));
 expect(httpClient.post).toHaveBeenCalledWith(expect.any(String), { chart_of_accounts_id: "account", gl_dimension_id: "add", requirement: "optional" });
 expect(httpClient.put).toHaveBeenCalledTimes(1);
});
it("rejects a failed rule save rather than reporting success", async () => {
 vi.mocked(httpClient.get).mockResolvedValue(response({ data: [], paginate: { pages: 1 } }));
 vi.mocked(httpClient.post).mockResolvedValue(new Response("{}", { status: 500 }));
 await expect(saveCoaRules("BU", "account", { add: "mandatory" })).rejects.toThrow();
});

it("rejects an API failure envelope even when HTTP status is 200", async () => {
 vi.mocked(httpClient.get).mockResolvedValue(response({ data: [], paginate: { pages: 1 } }));
 vi.mocked(httpClient.post).mockResolvedValue(response({ success: false, message: "Rule rejected" }));
 await expect(saveCoaRules("BU", "account", { add: "mandatory" })).rejects.toThrow("Rule rejected");
});

it("does not treat a missing list payload as an empty set of rules", async () => {
 vi.mocked(httpClient.get).mockResolvedValue(response({ success: false }));
 await expect(saveCoaRules("BU", "account", { add: "mandatory" })).rejects.toThrow("Invalid account dimension rules response");
 expect(httpClient.post).not.toHaveBeenCalled();
});
