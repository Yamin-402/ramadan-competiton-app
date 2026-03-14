import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

interface ExportPdfOptions {
  html: string;
  fileName: string;
}

function toSafeFileName(value: string) {
  return String(value || "export")
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80) || "export";
}

export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function exportPdfFromHtml(options: ExportPdfOptions) {
  const html = String(options.html || "").trim();
  if (!html) {
    throw new Error("No export content");
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    const popup = window.open("", "_blank");
    if (!popup) {
      throw new Error("Could not open print window");
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
    return;
  }

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device");
  }

  await Sharing.shareAsync(uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: toSafeFileName(options.fileName),
  });
}
