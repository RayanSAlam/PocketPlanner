import { describe, it, expect } from "vitest";
import { toCsv, detectColumnMapping, parseCsvImport, parseCsvHeader } from "@/lib/budgeting/csv";

describe("toCsv", () => {
  it("produces a header row plus one row per line", () => {
    const csv = toCsv([
      { category: "Housing", group: "Needs", budgeted: 1450, rollover: false },
      { category: "Food & Dining", group: "Needs", budgeted: 600, rollover: true },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Category,Group,Budgeted,Rollover");
    expect(lines[1]).toBe("Housing,Needs,1450.00,no");
    expect(lines[2]).toBe("Food & Dining,Needs,600.00,yes");
  });

  it("quotes fields containing commas", () => {
    const csv = toCsv([{ category: "Gifts, misc", group: "Wants", budgeted: 50, rollover: false }]);
    expect(csv).toContain('"Gifts, misc"');
  });
});

describe("detectColumnMapping", () => {
  it("matches this app's own export headers", () => {
    const mapping = detectColumnMapping(["Category", "Group", "Budgeted", "Rollover"]);
    expect(mapping).toEqual({ category: 0, group: 1, budgeted: 2, rollover: 3 });
  });

  it("matches common alternate header names case-insensitively", () => {
    const mapping = detectColumnMapping(["name", "SECTION", "amount"]);
    expect(mapping.category).toBe(0);
    expect(mapping.group).toBe(1);
    expect(mapping.budgeted).toBe(2);
  });

  it("leaves unmatched columns out of the mapping", () => {
    const mapping = detectColumnMapping(["Category", "Budgeted"]);
    expect(mapping.group).toBeUndefined();
    expect(mapping.rollover).toBeUndefined();
  });
});

describe("parseCsvImport", () => {
  it("parses a well-formed CSV using a detected mapping", () => {
    const csv = "Category,Group,Budgeted,Rollover\nHousing,Needs,1450.00,no\nFood,Needs,600.00,yes";
    const mapping = detectColumnMapping(parseCsvHeader(csv));
    const result = parseCsvImport(csv, mapping);
    expect(result.errors).toHaveLength(0);
    expect(result.rows).toEqual([
      { category: "Housing", group: "Needs", budgeted: 1450, rollover: false },
      { category: "Food", group: "Needs", budgeted: 600, rollover: true },
    ]);
  });

  it("handles quoted fields with embedded commas", () => {
    const csv = 'Category,Group,Budgeted\n"Gifts, misc",Wants,50.00';
    const mapping = detectColumnMapping(parseCsvHeader(csv));
    const result = parseCsvImport(csv, mapping);
    expect(result.rows[0].category).toBe("Gifts, misc");
  });

  it("defaults group to Needs and rollover to false when those columns are absent", () => {
    const csv = "Category,Budgeted\nHousing,1450.00";
    const mapping = detectColumnMapping(parseCsvHeader(csv));
    const result = parseCsvImport(csv, mapping);
    expect(result.rows[0].group).toBe("Needs");
    expect(result.rows[0].rollover).toBe(false);
  });

  it("strips $ and commas from amounts", () => {
    const csv = 'Category,Budgeted\nHousing,"$1,450.00"';
    const mapping = detectColumnMapping(parseCsvHeader(csv));
    const result = parseCsvImport(csv, mapping);
    expect(result.rows[0].budgeted).toBe(1450);
  });

  it("skips rows with an invalid amount and reports an error", () => {
    const csv = "Category,Budgeted\nHousing,not-a-number\nFood,600";
    const mapping = detectColumnMapping(parseCsvHeader(csv));
    const result = parseCsvImport(csv, mapping);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].category).toBe("Food");
    expect(result.errors.some((e) => e.includes("not-a-number"))).toBe(true);
  });

  it("skips rows with a missing category", () => {
    const csv = "Category,Budgeted\n,600";
    const mapping = detectColumnMapping(parseCsvHeader(csv));
    const result = parseCsvImport(csv, mapping);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]).toContain("missing category");
  });

  it("reports an error and returns no rows when category/budgeted columns can't be found", () => {
    const csv = "Foo,Bar\nx,y";
    const mapping = detectColumnMapping(parseCsvHeader(csv));
    const result = parseCsvImport(csv, mapping);
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]).toContain("Category and a Budgeted column");
  });

  it("recognizes rollover as 'true' or '1' as well as 'yes'", () => {
    const csv = "Category,Budgeted,Rollover\nHousing,100,true\nFood,50,1\nGas,25,no";
    const mapping = detectColumnMapping(parseCsvHeader(csv));
    const result = parseCsvImport(csv, mapping);
    expect(result.rows.map((r) => r.rollover)).toEqual([true, true, false]);
  });
});
