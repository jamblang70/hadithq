import { describe, it, expect } from "vitest";
import { ApiError } from "../api/http";
import { getUserFacingErrorMessage } from "./errorMessages";

describe("getUserFacingErrorMessage", () => {
  it("maps rate limit errors to a friendly message", () => {
    expect(getUserFacingErrorMessage(new ApiError(429, "Too many requests"))).toBe(
      "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi."
    );
  });

  it("maps service unavailable errors to a friendly message", () => {
    expect(getUserFacingErrorMessage(new ApiError(503, "backend down"))).toBe(
      "Layanan sedang tidak tersedia. Coba lagi dalam beberapa saat."
    );
  });

  it("maps network failures to a connectivity message", () => {
    expect(getUserFacingErrorMessage(new TypeError("Failed to fetch"))).toBe(
      "Tidak dapat terhubung ke server. Periksa koneksi atau coba lagi."
    );
  });
});
