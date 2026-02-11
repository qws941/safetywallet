/**
 * Aligo SMS + 알림톡 API Client
 * Documentation: https://smartsms.aligo.in/admin/api/
 *
 * Features:
 * - Unified SMS and KakaoTalk 알림톡 API
 * - Test mode support (testmode: 'Y')
 * - SMS fallback for failed 알림톡
 */

import type { Env } from "../types";
import { log } from "./observability";

/** Aligo API Base URL */
const ALIGO_API_URL = "https://smartsms.aligo.in/api";

/** SMS Result */
export interface AligoSmsResult {
  success: boolean;
  messageId?: string;
  resultCode?: string;
  message?: string;
  error?: string;
}

/** 알림톡 Result */
export interface AligoAlimtalkResult {
  success: boolean;
  mid?: string;
  resultCode?: string;
  message?: string;
  error?: string;
}

/** Smart Notification Result (with method tracking) */
export interface SmartNotificationResult {
  success: boolean;
  method: "alimtalk" | "sms";
  mid?: string;
  messageId?: string;
  resultCode?: string;
  message?: string;
  error?: string;
}

/** Aligo SMS API Request */
interface AligoSmsRequest {
  api_key: string;
  user_id: string;
  sender: string;
  receiver: string;
  msg: string;
  testmode?: "Y" | "N";
  title?: string;
}

/** Aligo SMS API Response */
interface AligoSmsResponse {
  result_code: string;
  message: string;
  msg_id?: string;
}

/** Aligo 알림톡 API Request */
interface AligoAlimtalkRequest {
  api_key: string;
  user_id: string;
  sender: string; // Kakao sender key
  receiver: string;
  msg: string;
  template_code: string;
  fall_back_yn?: "Y" | "N"; // SMS fallback
  testmode?: "Y" | "N";
  button?: string; // JSON string
  emtitle?: string; // Failed 알림톡 title
}

/** Aligo 알림톡 API Response */
interface AligoAlimtalkResponse {
  result_code: string;
  message: string;
  mid?: string;
}

/**
 * Send SMS via Aligo API
 *
 * @param env - Cloudflare Workers environment bindings
 * @param to - Recipient phone number (e.g., "01012345678")
 * @param message - SMS message content (max 2000 chars for LMS)
 * @param title - Optional title for LMS (long message)
 * @returns SMS send result
 *
 * @example
 * ```ts
 * const result = await sendAligoSms(env, "01012345678", "안전보고가 접수되었습니다");
 * if (result.success) {
 *   console.log("SMS sent:", result.messageId);
 * }
 * ```
 */
export async function sendAligoSms(
  env: Env,
  to: string,
  message: string,
  title?: string,
): Promise<AligoSmsResult> {
  if (!env.ALIGO_API_KEY || !env.ALIGO_USER_ID || !env.ALIGO_SENDER) {
    log.warn("Aligo SMS credentials not configured");
    return { success: false, error: "SMS_NOT_CONFIGURED" };
  }

  const cleanPhone = to.replace(/[^0-9]/g, "");
  if (cleanPhone.length < 10) {
    return { success: false, error: "INVALID_PHONE" };
  }

  try {
    const requestBody: AligoSmsRequest = {
      api_key: env.ALIGO_API_KEY,
      user_id: env.ALIGO_USER_ID,
      sender: env.ALIGO_SENDER,
      receiver: cleanPhone,
      msg: message,
      testmode: env.ENVIRONMENT === "development" ? "Y" : "N",
    };

    if (title) {
      requestBody.title = title;
    }

    const response = await fetch(`${ALIGO_API_URL}/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("Aligo SMS API error", new Error(errorText), {
        action: "aligo_sms_send",
        metadata: { status: response.status },
      });
      return { success: false, error: `API_ERROR: ${response.status}` };
    }

    const result = (await response.json()) as AligoSmsResponse;

    // Aligo returns result_code
    // -1 = success, other codes = error
    if (result.result_code === "-1") {
      return {
        success: true,
        messageId: result.msg_id,
        resultCode: result.result_code,
        message: result.message,
      };
    }

    return {
      success: false,
      resultCode: result.result_code,
      message: result.message,
      error: `ALIGO_ERROR: ${result.message}`,
    };
  } catch (error) {
    log.error("Aligo SMS send failed", error instanceof Error ? error : new Error(String(error)), {
      action: "aligo_sms_send",
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    };
  }
}

/**
 * Send KakaoTalk 알림톡 via Aligo API
 *
 * IMPORTANT: Template must be pre-approved by Kakao before use.
 *
 * @param env - Cloudflare Workers environment bindings
 * @param to - Recipient phone number (e.g., "01012345678")
 * @param templateCode - Kakao-approved template code
 * @param message - Message content (must match template format)
 * @param options - Additional options
 * @returns 알림톡 send result
 *
 * @example
 * ```ts
 * const result = await sendAligoAlimtalk(
 *   env,
 *   "01012345678",
 *   "TMPL_001",
 *   "안전보고가 접수되었습니다. 검토 후 승인됩니다.",
 *   { fallbackSms: true }
 * );
 * ```
 */
export async function sendAligoAlimtalk(
  env: Env,
  to: string,
  templateCode: string,
  message: string,
  options?: {
    fallbackSms?: boolean;
    button?: { name: string; linkType: string; linkTypeName: string }[];
    emTitle?: string;
  },
): Promise<AligoAlimtalkResult> {
  if (
    !env.ALIGO_API_KEY ||
    !env.ALIGO_USER_ID ||
    !env.KAKAO_SENDER_KEY
  ) {
    log.warn("Aligo 알림톡 credentials not configured");
    return { success: false, error: "ALIMTALK_NOT_CONFIGURED" };
  }

  const cleanPhone = to.replace(/[^0-9]/g, "");
  if (cleanPhone.length < 10) {
    return { success: false, error: "INVALID_PHONE" };
  }

  try {
    const requestBody: AligoAlimtalkRequest = {
      api_key: env.ALIGO_API_KEY,
      user_id: env.ALIGO_USER_ID,
      sender: env.KAKAO_SENDER_KEY,
      receiver: cleanPhone,
      msg: message,
      template_code: templateCode,
      fall_back_yn: options?.fallbackSms ? "Y" : "N",
      testmode: env.ENVIRONMENT === "development" ? "Y" : "N",
    };

    if (options?.button) {
      requestBody.button = JSON.stringify(options.button);
    }

    if (options?.emTitle) {
      requestBody.emtitle = options.emTitle;
    }

    const response = await fetch(`${ALIGO_API_URL}/alimtalk/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log.error("Aligo 알림톡 API error", new Error(errorText), {
        action: "aligo_alimtalk_send",
        metadata: { status: response.status },
      });
      return { success: false, error: `API_ERROR: ${response.status}` };
    }

    const result = (await response.json()) as AligoAlimtalkResponse;

    // Aligo returns result_code
    // -1 = success, other codes = error
    if (result.result_code === "-1") {
      return {
        success: true,
        mid: result.mid,
        resultCode: result.result_code,
        message: result.message,
      };
    }

    return {
      success: false,
      resultCode: result.result_code,
      message: result.message,
      error: `ALIGO_ERROR: ${result.message}`,
    };
  } catch (error) {
    log.error("Aligo 알림톡 send failed", error instanceof Error ? error : new Error(String(error)), {
      action: "aligo_alimtalk_send",
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "UNKNOWN_ERROR",
    };
  }
}

/**
 * Smart notification: Try 알림톡 first, fallback to SMS if needed
 *
 * @param env - Cloudflare Workers environment bindings
 * @param to - Recipient phone number
 * @param templateCode - Kakao-approved template code
 * @param message - Message content
 * @param smsTitle - Optional SMS title (for fallback LMS)
 * @param options - Additional options (button support)
 * @returns Notification send result with method tracking
 *
 * @example
 * ```ts
 * const result = await sendSmartNotification(
 *   env,
 *   "01012345678",
 *   "TMPL_SAFETY_REPORT",
 *   "안전보고가 접수되었습니다.",
 *   "[SafeWork] 안전보고",
 *   { button: [{ name: "확인", linkType: "WL", linkTypeName: "https://..." }] }
 * );
 * console.log(`Sent via ${result.method}`); // "alimtalk" or "sms"
 * ```
 */
export async function sendSmartNotification(
  env: Env,
  to: string,
  templateCode: string,
  message: string,
  smsTitle?: string,
  options?: { button?: { name: string; linkType: string; linkTypeName: string }[] },
): Promise<SmartNotificationResult> {
  // Try 알림톡 first
  const alimtalkResult = await sendAligoAlimtalk(env, to, templateCode, message, {
    fallbackSms: false, // We handle fallback manually
    button: options?.button,
  });

  if (alimtalkResult.success) {
    return {
      success: true,
      method: "alimtalk",
      mid: alimtalkResult.mid,
      resultCode: alimtalkResult.resultCode,
      message: alimtalkResult.message,
    };
  }

  // Fallback to SMS
  log.warn("알림톡 failed, falling back to SMS", {
    action: "smart_notification_fallback",
    metadata: { phone: to, error: alimtalkResult.error },
  });

  const smsResult = await sendAligoSms(env, to, message, smsTitle);

  return {
    success: smsResult.success,
    method: "sms",
    messageId: smsResult.messageId,
    resultCode: smsResult.resultCode,
    message: smsResult.message,
    error: smsResult.error,
  };
}
