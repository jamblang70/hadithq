import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import SearchForm from "./SearchForm";

afterEach(() => {
  cleanup();
});

describe("SearchForm", () => {
  it("submits a trimmed query with selected filters", () => {
    const onSearch = vi.fn();

    render(<SearchForm onSearch={onSearch} loading={false} />);

    fireEvent.change(screen.getByLabelText("Search query"), {
      target: { value: "  sabar  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "▼ Tampilkan Filter" }));
    fireEvent.click(screen.getByRole("button", { name: /Sahih al-Bukhari/i }));
    fireEvent.click(screen.getByText("Sahih").closest("button")!);
    fireEvent.click(screen.getByRole("button", { name: /Indonesia/i }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(screen.getByLabelText("Search query").closest("form")!);

    expect(onSearch).toHaveBeenCalledWith(
      "sabar",
      {
        collections: ["bukhari"],
        language: "id",
        grades: ["sahih"],
      },
      true
    );
  });

  it("keeps submit disabled for an empty query", () => {
    render(<SearchForm onSearch={vi.fn()} loading={false} />);

    expect(screen.getByRole("button", { name: "Cari" }).hasAttribute("disabled")).toBe(true);
  });
});
