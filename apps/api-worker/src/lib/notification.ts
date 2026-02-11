import type { Env } from "../types";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { users, pushSubscriptions } from "../db/schema";
import { encryptPayload, generateVapidHeaders } from "./web-push";
import { sendAligoSms } from "./aligo";

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface PushResult {
  success: boolean;
  error?: string;
}

/**
 * Send SMS via Aligo
 * This replaces the old Solapi implementation
 */
export async function sendSMS(
  env: Env,
  to: string,
  message: string,
): Promise<SMSResult> {
  const result = await sendAligoSms(env, to, message);
  return {
    success: result.success,
    messageId: result.messageId,
    error: result.error,
  };
}

export async function sendPushNotification(
  env: Env,
  subscription: PushSubscription,
  payload: { title: string; body: string; data?: Record<string, string> },
): Promise<PushResult> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys not configured");
    return { success: false, error: "VAPID_NOT_CONFIGURED" };
  }

  try {
    const payloadJson = JSON.stringify(payload);

    // Encrypt payload using RFC 8291
    const encrypted = await encryptPayload(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      payloadJson,
    );

    // Build aes128gcm content-encoding body (RFC 8188)
    const recordSize = new Uint8Array(4);
    new DataView(recordSize.buffer).setUint32(0, 4096, false);

    const body = new Uint8Array(
      16 + 4 + 1 + encrypted.localPublicKey.length + encrypted.body.length,
    );
    let offset = 0;
    body.set(encrypted.salt, offset);
    offset += 16;
    body.set(recordSize, offset);
    offset += 4;
    body[offset] = encrypted.localPublicKey.length;
    offset += 1;
    body.set(encrypted.localPublicKey, offset);
    offset += encrypted.localPublicKey.length;
    body.set(encrypted.body, offset);

    // Generate VAPID authorization headers (RFC 8292)
    const vapidHeaders = await generateVapidHeaders(
      env.VAPID_PUBLIC_KEY,
      env.VAPID_PRIVATE_KEY,
      subscription.endpoint,
    );

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "Content-Length": String(body.length),
        TTL: "86400",
        Authorization: vapidHeaders.authorization,
        "Crypto-Key": vapidHeaders["Crypto-Key"],
      },
      body: body,
    });

    if (response.status === 201 || response.status === 200) {
      return { success: true };
    }

    if (response.status === 410 || response.status === 404) {
      return { success: false, error: "SUBSCRIPTION_EXPIRED" };
    }

    const errorText = await response.text();
    console.error(`Push failed (${response.status}):`, errorText);
    return { success: false, error: `PUSH_ERROR: ${response.status}` };
  } catch (err) {
    console.error("Push notification error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "UNKNOWN_ERROR",
    };
  }
}

export type NotificationType =
  | "POST_APPROVED"
  | "POST_REJECTED"
  | "POST_NEED_INFO"
  | "POINTS_AWARDED"
  | "DISPUTE_RESOLVED"
  | "ANNOUNCEMENT"
  | "ACTION_ASSIGNED"
  | "ACTION_STATUS_CHANGED";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export function buildNotificationMessage(
  type: NotificationType,
  params: Record<string, string | number>,
): NotificationPayload {
  switch (type) {
    case "POST_APPROVED":
      return {
        type,
        title: "게시물 승인됨",
        body: `작성하신 안전 제보가 승인되었습니다. ${params.points || 0}포인트가 적립되었습니다.`,
        data: { postId: String(params.postId || "") },
      };

    case "POST_REJECTED":
      return {
        type,
        title: "게시물 반려됨",
        body: `작성하신 안전 제보가 반려되었습니다. 사유: ${params.reason || "미기재"}`,
        data: { postId: String(params.postId || "") },
      };

    case "POINTS_AWARDED":
      return {
        type,
        title: "포인트 지급",
        body: `${params.points || 0}포인트가 지급되었습니다. 사유: ${params.reason || "관리자 지급"}`,
      };

    case "DISPUTE_RESOLVED":
      return {
        type,
        title: "이의신청 처리완료",
        body: `등록하신 이의신청이 처리되었습니다.`,
        data: { disputeId: String(params.disputeId || "") },
      };

    case "ANNOUNCEMENT":
      return {
        type: "ANNOUNCEMENT",
        title: String(params.title || "공지사항"),
        body: String(params.body || ""),
      };

    case "POST_NEED_INFO":
      return {
        type,
        title: "추가 정보 요청",
        body: `작성하신 안전 제보에 추가 정보가 필요합니다. 확인해 주세요.`,
        data: { postId: String(params.postId || "") },
      };

    case "ACTION_ASSIGNED":
      return {
        type,
        title: "시정조치 배정",
        body: `새로운 시정조치가 배정되었습니다: ${params.title || ""}`,
        data: { actionId: String(params.actionId || "") },
      };

    case "ACTION_STATUS_CHANGED":
      return {
        type,
        title: "시정조치 상태 변경",
        body: `시정조치 상태가 ${params.status || ""}(으)로 변경되었습니다.`,
        data: { actionId: String(params.actionId || "") },
      };

    default:
      return {
        type: "ANNOUNCEMENT",
        title: "알림",
        body: String(params.message || ""),
      };
  }
}

/** Fire-and-forget notification helper for business events */
export async function notifyUser(
  db: DrizzleD1Database,
  env: Env,
  userId: string,
  type: NotificationType,
  params: Record<string, string> = {},
): Promise<void> {
  try {
    const { title, body } = buildNotificationMessage(type, params);
    const payload = JSON.stringify({ title, body, type, ...params });

    const subs = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId))
      .all();

    let pushSent = false;
    for (const sub of subs) {
      const result = await sendPushNotification(
        env,
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        { title, body, data: params },
      );
      if (result.success) pushSent = true;
    }

    if (!pushSent) {
      const user = await db
        .select({ phone: users.phone })
        .from(users)
        .where(eq(users.id, userId))
        .get();
      if (user?.phone) {
        await sendSMS(env, user.phone, `[SafetyWallet] ${title}: ${body}`);
      }
    }
  } catch {
    // Notification failures should never block business logic
  }
}
