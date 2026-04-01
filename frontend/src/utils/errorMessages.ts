import { ApiError } from "../api/http";

export function getUserFacingErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.";
    }

    if (error.status === 503) {
      return "Layanan sedang tidak tersedia. Coba lagi dalam beberapa saat.";
    }

    return error.message;
  }

  if (error instanceof TypeError) {
    return "Tidak dapat terhubung ke server. Periksa koneksi atau coba lagi.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
}
