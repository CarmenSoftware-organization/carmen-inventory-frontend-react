import { z } from "zod";
import type { TranslationFn } from "@/lib/i18n-schema";
import {
  WORKFLOW_TYPE,
  type Recipients,
  type RecipientNotification,
  type Stage,
  type Workflow,
} from "@/types/workflows";

/** ค่าเริ่มต้นของ recipient notification (object shape ใหม่ — แทน boolean เดิม) */
export function emptyRecipientNotification(
  isActive = false,
): RecipientNotification {
  return {
    is_active: isActive,
    is_notification: isActive,
    notification_channel: {
      app: { is_active: isActive, notification_template_id: "" },
      email: { is_active: false, notification_template_id: "" },
    },
  };
}

/** สร้าง recipients ทั้ง 3 (requestor/current_approve/next_step) จาก flag is_active */
export function makeRecipients(
  requestor: boolean,
  currentApprove: boolean,
  nextStep: boolean,
): Recipients {
  return {
    requestor: emptyRecipientNotification(requestor),
    current_approve: emptyRecipientNotification(currentApprove),
    next_step: emptyRecipientNotification(nextStep),
  };
}

export function createWorkflowFormSchema(tv: TranslationFn, tf: TranslationFn) {
  return z.object({
    name: z
      .string()
      .min(1, tv("required", { field: tf("workflowName") }))
      .max(100),
    workflow_type: z
      .string()
      .min(1, tv("required", { field: tf("workflowType") })),
    is_active: z.boolean(),
    description: z.string().optional(),
  });
}

export const createWorkflowSchema = z.object({
  name: z.string().min(1, "Workflow name is required").max(100),
  workflow_type: z.string().min(1, "Workflow type is required"),
  is_active: z.boolean(),
  description: z.string().optional(),
});

export type WorkflowFormValues = z.infer<typeof createWorkflowSchema>;

export const EMPTY_FORM: WorkflowFormValues = {
  name: "",
  workflow_type: WORKFLOW_TYPE.PR,
  is_active: true,
  description: "",
};

const channelConfigSchema = z.object({
  is_active: z.boolean(),
  notification_template_id: z.string(),
});

// row เก่าเก็บ recipient เป็น boolean ล้วน — ยอมรับแล้วแปลงเป็น object shape ใหม่
// ไม่งั้น safeParse ตกทั้ง data แล้ว stages หายทั้งชุด (ดู `getWorkflowFormDefaults`)
const recipientNotificationSchema = z.union([
  z.boolean().transform((isActive) => emptyRecipientNotification(isActive)),
  z.object({
    is_active: z.boolean(),
    is_notification: z.boolean(),
    notification_channel: z.object({
      app: channelConfigSchema,
      email: channelConfigSchema,
    }),
  }),
]);

const recipientsSchema = z.object({
  requestor: recipientNotificationSchema,
  current_approve: recipientNotificationSchema,
  next_step: recipientNotificationSchema,
});

const actionSchema = z.object({
  is_active: z.boolean(),
  recipients: recipientsSchema,
});

export const wfFormSchema = z.object({
  id: z.uuid().optional(),
  doc_version: z.number().optional(),
  name: z.string().min(1).max(100),
  workflow_type: z.string(),
  is_active: z.boolean(),
  data: z.object({
    document_reference_pattern: z.string(),
    stages: z.array(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        sla: z.string(),
        sla_unit: z.string(),
        role: z.string().optional(),
        creator_access: z.string().optional(),
        available_actions: z.object({
          submit: actionSchema,
          approve: actionSchema,
          reject: actionSchema,
          sendback: actionSchema,
        }),
        hide_fields: z.object({
          price_per_unit: z.boolean(),
          total_price: z.boolean(),
        }),
        is_show_signature: z.boolean().optional(),
        assigned_users: z
          .array(
            z.object({
              user_id: z.string(),
              firstname: z.string(),
              middlename: z.string(),
              lastname: z.string(),
              email: z.string(),
              department: z
                .object({
                  id: z.string().optional(),
                  name: z.string().optional(),
                })
                .optional(),
              initials: z.string().optional(),
            }),
          )
          .optional(),
        is_hod: z.boolean().optional(),
        sla_warning_notification: z
          .object({
            recipients: z.object({
              requestor: z.boolean().default(false),
              current_approve: z.boolean().default(false),
            }),
            template: z.string().optional(),
          })
          .optional(),
      }),
    ),
    routing_rules: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        trigger_stage: z.string(),
        condition: z.object({
          field: z.string(),
          operator: z.enum(["eq", "lt", "gt", "lte", "gte", "between"]),
          value: z.array(z.string()),
          min_value: z.string().optional(),
          max_value: z.string().optional(),
        }),
        action: z.object({
          type: z.enum(["SKIP_STAGE", "NEXT_STAGE"]),
          parameters: z.object({ target_stage: z.string() }),
        }),
      }),
    ),
    notifications: z.array(z.object({})),
    notification_templates: z.array(z.object({})),
    // payload จริงส่งแค่ id (ดู toWorkflowPayload) — ตอนอ่านจึงต้องรับทั้ง
    // string id (รูปแบบใหม่) และ object เต็มที่ workflow เก่า snapshot ไว้
    // แล้ว normalize เป็น { id, ... } ให้ฟอร์มใช้ shape เดียว
    products: z.array(
      z
        .union([
          z.string(),
          z.object({
            id: z.string(),
            code: z.string().optional(),
            name: z.string().optional(),
            local_name: z.string().optional(),
            description: z.nullable(z.string()).optional(),
            product_status_type: z.string().optional(),
            inventory_unit: z
              .object({ id: z.string(), name: z.string() })
              .optional(),
            isAssigned: z.boolean().optional(),
            product_item_group: z
              .object({
                id: z.string(),
                name: z.string(),
              })
              .optional(),
            product_sub_category: z
              .object({
                id: z.string(),
                name: z.string(),
              })
              .optional(),
            product_category: z
              .object({
                id: z.string(),
                name: z.string(),
              })
              .optional(),
          }),
        ])
        .transform((p) => (typeof p === "string" ? { id: p } : p)),
    ),
  }),
  description: z.string().optional(),
});

export type WorkflowCreateModel = z.infer<typeof wfFormSchema>;

/**
 * payload ที่ส่งขึ้น API — products หั่นเหลือ id ล้วน (ตรง contract ฝั่ง backend
 * ที่ประกาศ `products: string[]`) ไม่ snapshot ชื่อ/หน่วย/category ของสินค้าลง
 * JSON ของ workflow ให้ค้างเป็นค่าเก่า
 */
export type WorkflowPayload = Omit<WorkflowCreateModel, "data"> & {
  data: Omit<WorkflowCreateModel["data"], "products"> & { products: string[] };
};

/** แปลงค่าฟอร์มเป็น payload ก่อนส่ง (POST/PUT) — ทุกจุดที่ยิง API ต้องผ่านตัวนี้ */
export function toWorkflowPayload(model: WorkflowCreateModel): WorkflowPayload {
  return {
    ...model,
    data: { ...model.data, products: model.data.products.map((p) => p.id) },
  };
}

export const DEFAULT_WORKFLOW_DATA: WorkflowCreateModel["data"] = {
  document_reference_pattern: "PR-{YYYY}-{MM}-{####}",
  stages: [],
  routing_rules: [],
  notifications: [],
  notification_templates: [],
  products: [],
};

/** `data` ของ workflow อ่านด้วย schema ปัจจุบันไม่ได้ — คนละรูปแบบกันคนละรุ่น */
export class WorkflowDataParseError extends Error {
  constructor() {
    super("Workflow data does not match the current schema");
    this.name = "WorkflowDataParseError";
  }
}

export function parseWorkflowData(data: unknown) {
  return wfFormSchema.shape.data.safeParse(data);
}

/**
 * แปลง workflow จาก API เป็นค่าตั้งต้นของฟอร์ม
 *
 * parse ไม่ผ่านให้ throw ห้าม fallback เป็นค่าว่าง — ค่าที่ได้ตัวนี้ถูกส่งกลับไป
 * PUT ทั้งก้อน (ทั้งหน้า detail และปุ่ม toggle/duplicate ในหน้า list) ถ้าเงียบไว้
 * stages จริงในฐานข้อมูลจะโดนเขียนทับด้วยของว่างโดยไม่มีใครรู้
 *
 * @throws {WorkflowDataParseError} เมื่อ `workflow.data` ไม่ตรง schema ปัจจุบัน
 */
export function getWorkflowFormDefaults(
  workflow: Workflow,
): WorkflowCreateModel {
  const parsedData = parseWorkflowData(workflow.data);
  if (!parsedData.success) throw new WorkflowDataParseError();

  return {
    id: workflow.id,
    name: workflow.name,
    workflow_type: workflow.workflow_type,
    is_active: workflow.is_active,
    description: workflow.description ?? "",
    data: parsedData.data,
  };
}

export function buildDefaultStages(): Stage[] {
  return [
    {
      name: "Create Request",
      description: "",
      sla: "24",
      sla_unit: "hours",
      role: "create",
      creator_access: "only_creator",
      available_actions: {
        submit: {
          is_active: true,
          recipients: makeRecipients(true, false, true),
        },
        approve: {
          is_active: false,
          recipients: makeRecipients(false, false, false),
        },
        reject: {
          is_active: false,
          recipients: makeRecipients(false, false, false),
        },
        sendback: {
          is_active: false,
          recipients: makeRecipients(false, false, false),
        },
      },
      hide_fields: { price_per_unit: false, total_price: false },
      is_show_signature: false,
      assigned_users: [],
    },
    {
      name: "Completed",
      description: "",
      sla: "0",
      sla_unit: "hours",
      role: "approve",
      available_actions: {
        submit: {
          is_active: false,
          recipients: makeRecipients(false, false, false),
        },
        approve: {
          is_active: false,
          recipients: makeRecipients(false, false, false),
        },
        reject: {
          is_active: false,
          recipients: makeRecipients(false, false, false),
        },
        sendback: {
          is_active: false,
          recipients: makeRecipients(false, false, false),
        },
      },
      hide_fields: { price_per_unit: false, total_price: false },
      is_show_signature: false,
      assigned_users: [],
    },
  ];
}

export function mapToPayload(values: WorkflowFormValues): WorkflowPayload {
  return {
    id: crypto.randomUUID(),
    name: values.name,
    workflow_type: values.workflow_type,
    is_active: values.is_active,
    description: values.description ?? "",
    data: {
      document_reference_pattern: "PR-{YYYY}-{MM}-{####}",
      stages: buildDefaultStages(),
      routing_rules: [],
      notifications: [],
      notification_templates: [],
      products: [],
    },
  };
}
