import {
  LEGAL_ENTITY,
  type LegalDocument,
  type LegalLocale,
} from "./legal-content";

const EFFECTIVE = "2026-08-04";

/**
 * หมวด "ที่เก็บข้อมูลในเบราว์เซอร์" กับ "ข้อมูลการใช้งาน" เขียนตามพฤติกรรมจริง
 * ของโค้ด ไม่ใช่ข้อความสำเร็จรูป — refresh token อยู่ localStorage
 * (lib/auth/refresh-token-storage.ts), access token อยู่ในหน่วยความจำเท่านั้น
 * (lib/auth/token-store.ts), ภาษา/ขนาดตัวอักษร/ธีมอยู่ localStorage และ
 * analytics session id อยู่ sessionStorage (lib/analytics.ts ซึ่งเก็บเฉพาะ
 * identity ของ element ห้ามเก็บค่าจาก input) ถ้าโค้ดพวกนี้เปลี่ยน เอกสารนี้
 * ต้องเปลี่ยนตาม ไม่งั้นนโยบายจะโกหก
 */

const en: LegalDocument = {
  eyebrow: "Legal",
  title: "Privacy Policy",
  effective: `Effective ${EFFECTIVE}`,
  intro: `This policy explains what CARMEN BLUE does with personal data, written to Thailand's PDPA and the GDPR. It covers the platform operated by ${LEGAL_ENTITY.company} and the accounts issued through the hotels that subscribe to it.`,
  tocLabel: "On this page",
  crossLink: "Read the Terms of Service",
  sections: [
    {
      id: "roles",
      heading: "1. Two different roles",
      paragraphs: [
        "We are the data controller for your account itself — the identity you sign in with, and the security and billing records around it.",
        "For everything your hotel puts into the platform — orders, requisitions, receipts, the audit trail of who changed what — your employer is the controller and we are its processor. We act on its documented instructions. Requests about that data start with your organisation's administrator.",
      ],
    },
    {
      id: "collected",
      heading: "2. What we collect",
      bullets: [
        "Account details: name, username, email address, phone number if you provide it, profile photo and signature image if you upload them, and the properties and role assigned to you.",
        "Authentication data: password hashes held by our identity provider (we never see or store your password in readable form), session and refresh tokens, and sign-in events.",
        "Activity records: the audit trail of business actions — who created, edited, approved or rejected a document, and when. This is a core function of an ERP, not an optional extra.",
        "Product usage: page views and clicks on interface elements, recorded to see which parts of the platform are actually used. We record the identity of the element and the page path only — never what you type into a field.",
        "Technical data: IP address, browser and device type, timestamps and error diagnostics from requests to our servers.",
        "Operational data you enter as part of your job, which may incidentally name people — a vendor contact, a requester, an approver.",
      ],
    },
    {
      id: "why",
      heading: "3. Why we use it, and on what basis",
      bullets: [
        "To provide the service and keep your session working — necessary to perform the contract with your organisation.",
        "To maintain a trustworthy audit trail — a legal obligation for accounting records and a legitimate interest in accountability. You cannot opt out of the audit trail while using the platform.",
        "To keep the platform secure: detecting abuse, rate-limiting, investigating incidents — legitimate interest.",
        "To improve the product from aggregate usage patterns — legitimate interest, and never by reading the contents of your records.",
        "To support you when you or your organisation asks for help.",
        "We do not sell personal data, and we do not use it for advertising or automated decisions that produce legal effects.",
      ],
    },
    {
      id: "browser",
      heading: "4. What is stored in your browser",
      paragraphs: [
        "The platform is a static application that talks to our API directly. It uses browser storage rather than tracking cookies, and there are no third-party advertising or analytics scripts in it.",
      ],
      bullets: [
        "Your refresh token, in localStorage, so a reload does not sign you out. Signing out removes it and revokes it on the server.",
        "Your access token is held in memory only and is never written to disk.",
        "Preferences: interface language, text size and light/dark theme, in localStorage.",
        "A per-tab analytics session id, in sessionStorage, which disappears when you close the tab.",
      ],
    },
    {
      id: "sharing",
      heading: "5. Who else sees it",
      bullets: [
        "Your organisation: administrators and colleagues at your property see your name and your actions in the platform, because that is how approvals and accountability work.",
        "Infrastructure providers: cloud hosting, storage and email delivery, under contracts that limit them to processing on our instructions.",
        "Authorities: when we are legally required to disclose, and only to the extent required.",
        "In a merger or acquisition, data may transfer to the successor, which remains bound by this policy until it is replaced by an equivalent one.",
      ],
    },
    {
      id: "retention",
      heading: "6. How long we keep it",
      bullets: [
        "Account data: for as long as your account exists, then deleted or anonymised once your organisation's subscription obligations allow.",
        "Audit and business records: for the retention period in your organisation's agreement and in the accounting law that applies to it — typically several years, and not something we shorten on individual request.",
        "Technical logs: a rolling short window, kept for diagnostics and security.",
        "Product usage records: kept in aggregate; identifiers are dropped once they are no longer needed to distinguish sessions.",
      ],
    },
    {
      id: "rights",
      heading: "7. Your rights",
      paragraphs: [
        "Under the PDPA and the GDPR you can ask to access your personal data, correct it, delete it, restrict or object to processing, receive it in a portable form, or withdraw consent where processing relies on consent.",
        "Some of this is immediate: name, phone, photo and signature are editable in your profile. Requests that touch the audit trail usually cannot be granted, because removing who approved what would defeat the record's purpose — we will explain the basis if we decline.",
        `Send requests to ${LEGAL_ENTITY.privacyEmail}. If the data belongs to your employer's records, we will route the request to them. You also have the right to complain to your data protection authority — in Thailand, the PDPC.`,
      ],
    },
    {
      id: "security",
      heading: "8. How we protect it",
      bullets: [
        "Encryption in transit, and encryption at rest for stored credentials and secrets.",
        "Access to production data is restricted to staff who need it, and that access is logged.",
        "Passwords are handled by a dedicated identity provider; the application never stores them.",
        "Rate limiting and session revocation on sign-out.",
        "No system is perfectly secure. If a breach affects your personal data, we notify the affected organisations and the regulator as the law requires.",
      ],
    },
    {
      id: "transfers",
      heading: "9. International transfers",
      paragraphs: [
        "Data may be processed outside Thailand by our infrastructure providers. Where that happens we rely on the safeguards the PDPA and the GDPR require, such as standard contractual clauses and equivalent-protection assessments.",
      ],
    },
    {
      id: "children",
      heading: "10. Children",
      paragraphs: [
        "CARMEN BLUE is a workplace tool. It is not directed at children, and we do not knowingly create accounts for anyone under the minimum working age in their country.",
      ],
    },
    {
      id: "changes",
      heading: "11. Changes to this policy",
      paragraphs: [
        "We may update this policy. The effective date at the top always reflects the current version, and we notify organisation administrators of material changes before they take effect.",
      ],
    },
    {
      id: "contact",
      heading: "12. Contact",
      paragraphs: [
        `Privacy questions and data subject requests: ${LEGAL_ENTITY.privacyEmail}. General support: ${LEGAL_ENTITY.supportEmail}.`,
      ],
    },
  ],
};

const th: LegalDocument = {
  eyebrow: "ข้อกำหนด",
  title: "นโยบายความเป็นส่วนตัว",
  effective: `มีผลตั้งแต่ ${EFFECTIVE}`,
  intro: `นโยบายนี้อธิบายว่า CARMEN BLUE ทำอะไรกับข้อมูลส่วนบุคคลบ้าง เขียนตาม พ.ร.บ.คุ้มครองข้อมูลส่วนบุคคล (PDPA) และ GDPR ครอบคลุมระบบที่ให้บริการโดย ${LEGAL_ENTITY.company} และบัญชีที่ออกผ่านโรงแรมที่ใช้บริการ`,
  tocLabel: "หัวข้อในหน้านี้",
  crossLink: "อ่านข้อตกลงการใช้บริการ",
  sections: [
    {
      id: "roles",
      heading: "1. สองบทบาทที่ต่างกัน",
      paragraphs: [
        "สำหรับตัวบัญชีของคุณ ทั้งข้อมูลที่ใช้ยืนยันตัวตน ข้อมูลความปลอดภัย และข้อมูลการเรียกเก็บเงินรอบๆ บัญชี เราเป็นผู้ควบคุมข้อมูลส่วนบุคคล",
        "ส่วนข้อมูลที่โรงแรมบันทึกเข้าระบบ ทั้งใบสั่งซื้อ ใบเบิก การรับของ และประวัติว่าใครแก้อะไร ที่ทำงานของคุณเป็นผู้ควบคุมข้อมูล เราเป็นผู้ประมวลผลตามคำสั่งขององค์กรเท่านั้น คำขอเกี่ยวกับข้อมูลกลุ่มนี้ให้เริ่มที่ผู้ดูแลระบบขององค์กรคุณ",
      ],
    },
    {
      id: "collected",
      heading: "2. เราเก็บข้อมูลอะไรบ้าง",
      bullets: [
        "ข้อมูลบัญชี: ชื่อ ชื่อผู้ใช้ อีเมล เบอร์โทร (ถ้าให้ไว้) รูปโปรไฟล์และลายเซ็น (ถ้าอัปโหลด) รวมถึงโรงแรมและตำแหน่งที่ได้รับมอบหมาย",
        "ข้อมูลการยืนยันตัวตน: ค่าแฮชของรหัสผ่านที่เก็บโดยระบบ identity provider (เราไม่เห็นและไม่เก็บรหัสผ่านในรูปแบบที่อ่านได้) โทเคนของเซสชัน และประวัติการเข้าสู่ระบบ",
        "ประวัติการทำงาน: บันทึกว่าใครสร้าง แก้ไข อนุมัติ หรือปฏิเสธเอกสารใด เมื่อไหร่ นี่คือหน้าที่หลักของระบบ ERP ไม่ใช่ของแถมที่เลือกปิดได้",
        "ข้อมูลการใช้งาน: การเปิดหน้าและการคลิกองค์ประกอบบนหน้าจอ เพื่อดูว่าส่วนไหนของระบบถูกใช้จริง เราเก็บแค่ตัวระบุขององค์ประกอบและ path ของหน้า ไม่เก็บสิ่งที่คุณพิมพ์ลงในช่องกรอกข้อมูล",
        "ข้อมูลทางเทคนิค: หมายเลข IP ชนิดของเบราว์เซอร์และอุปกรณ์ เวลา และข้อมูลวินิจฉัยข้อผิดพลาดของคำขอที่เข้ามาที่เซิร์ฟเวอร์",
        "ข้อมูลการดำเนินงานที่คุณบันทึกตามหน้าที่ ซึ่งอาจมีชื่อบุคคลติดมาด้วย เช่น ผู้ติดต่อของผู้ขาย ผู้ขอซื้อ หรือผู้อนุมัติ",
      ],
    },
    {
      id: "why",
      heading: "3. ใช้ทำอะไร และอาศัยฐานอะไร",
      bullets: [
        "ให้บริการและรักษาเซสชันให้ใช้งานต่อเนื่อง — จำเป็นเพื่อปฏิบัติตามสัญญากับองค์กรของคุณ",
        "รักษาประวัติการทำงานให้เชื่อถือได้ — เป็นหน้าที่ตามกฎหมายเรื่องเอกสารทางบัญชี และเป็นประโยชน์โดยชอบด้วยกฎหมายในการตรวจสอบย้อนหลัง ตราบที่ยังใช้ระบบอยู่จะเลือกไม่บันทึกประวัติไม่ได้",
        "ดูแลความปลอดภัย ทั้งการตรวจจับการใช้งานผิดปกติ การจำกัดจำนวนคำขอ และการสอบสวนเหตุขัดข้อง — ประโยชน์โดยชอบด้วยกฎหมาย",
        "ปรับปรุงระบบจากภาพรวมการใช้งาน — ประโยชน์โดยชอบด้วยกฎหมาย และไม่มีการอ่านเนื้อหาในเอกสารของคุณ",
        "ให้ความช่วยเหลือเมื่อคุณหรือองค์กรของคุณติดต่อเข้ามา",
        "เราไม่ขายข้อมูลส่วนบุคคล ไม่ใช้เพื่อโฆษณา และไม่ใช้ตัดสินใจอัตโนมัติที่มีผลทางกฎหมายกับคุณ",
      ],
    },
    {
      id: "browser",
      heading: "4. เก็บอะไรไว้ในเบราว์เซอร์บ้าง",
      paragraphs: [
        "ระบบเป็นแอปพลิเคชันแบบ static ที่คุยกับ API ของเราโดยตรง ใช้ที่เก็บข้อมูลของเบราว์เซอร์แทนคุกกี้ติดตาม และไม่มีสคริปต์โฆษณาหรือ analytics ของบุคคลที่สามอยู่ในระบบ",
      ],
      bullets: [
        "refresh token เก็บใน localStorage เพื่อให้รีเฟรชหน้าแล้วไม่หลุดออกจากระบบ เมื่อกดออกจากระบบจะถูกลบและถูกเพิกถอนที่เซิร์ฟเวอร์ด้วย",
        "access token เก็บในหน่วยความจำเท่านั้น ไม่เคยถูกเขียนลงดิสก์",
        "ค่าที่ตั้งไว้: ภาษา ขนาดตัวอักษร และธีมสว่าง/มืด เก็บใน localStorage",
        "รหัสเซสชันสำหรับสถิติการใช้งาน แยกตามแท็บ เก็บใน sessionStorage และหายไปเมื่อปิดแท็บ",
      ],
    },
    {
      id: "sharing",
      heading: "5. ใครเห็นข้อมูลบ้าง",
      bullets: [
        "องค์กรของคุณ: ผู้ดูแลระบบและเพื่อนร่วมงานที่โรงแรมเดียวกันเห็นชื่อคุณและสิ่งที่คุณทำในระบบ เพราะการอนุมัติและการตรวจสอบย้อนหลังต้องอาศัยข้อมูลนี้",
        "ผู้ให้บริการโครงสร้างพื้นฐาน: คลาวด์ พื้นที่จัดเก็บไฟล์ และบริการส่งอีเมล ภายใต้สัญญาที่จำกัดให้ประมวลผลตามคำสั่งของเราเท่านั้น",
        "หน่วยงานรัฐ: เมื่อมีหน้าที่ต้องเปิดเผยตามกฎหมาย และเปิดเผยเท่าที่กฎหมายกำหนด",
        "กรณีควบรวมหรือซื้อกิจการ ข้อมูลอาจโอนไปยังผู้รับโอน ซึ่งยังคงผูกพันตามนโยบายนี้จนกว่าจะมีนโยบายที่คุ้มครองเทียบเท่ามาแทน",
      ],
    },
    {
      id: "retention",
      heading: "6. เก็บไว้นานแค่ไหน",
      bullets: [
        "ข้อมูลบัญชี: ตราบที่บัญชียังอยู่ จากนั้นลบหรือทำให้ไม่ระบุตัวตนเมื่อภาระผูกพันตามสัญญาขององค์กรเปิดให้ทำได้",
        "ประวัติการทำงานและเอกสารทางธุรกิจ: ตามระยะเวลาในสัญญาขององค์กรและกฎหมายบัญชีที่ใช้บังคับ โดยทั่วไปหลายปี และไม่ใช่สิ่งที่เราย่นให้ตามคำขอรายบุคคล",
        "ล็อกทางเทคนิค: เก็บระยะสั้นแบบหมุนเวียน เพื่อวินิจฉัยปัญหาและดูแลความปลอดภัย",
        "สถิติการใช้งาน: เก็บในรูปภาพรวม และตัดตัวระบุออกเมื่อไม่จำเป็นต้องแยกเซสชันแล้ว",
      ],
    },
    {
      id: "rights",
      heading: "7. สิทธิของคุณ",
      paragraphs: [
        "ตาม PDPA และ GDPR คุณขอเข้าถึง ขอแก้ไข ขอลบ ขอให้ระงับหรือคัดค้านการประมวลผล ขอรับข้อมูลในรูปแบบที่โอนย้ายได้ หรือถอนความยินยอมในกรณีที่การประมวลผลอาศัยความยินยอม ได้",
        "บางเรื่องทำได้ทันที ชื่อ เบอร์โทร รูป และลายเซ็น แก้ได้เองในหน้าโปรไฟล์ ส่วนคำขอที่กระทบประวัติการทำงานมักทำให้ไม่ได้ เพราะการลบว่าใครอนุมัติอะไรจะทำให้บันทึกนั้นหมดความหมาย หากปฏิเสธเราจะชี้แจงเหตุผลให้",
        `ส่งคำขอมาที่ ${LEGAL_ENTITY.privacyEmail} หากข้อมูลนั้นเป็นเอกสารของที่ทำงานคุณ เราจะส่งคำขอต่อให้องค์กร และคุณมีสิทธิ์ร้องเรียนต่อหน่วยงานคุ้มครองข้อมูล ซึ่งในไทยคือสำนักงาน คณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (สคส.)`,
      ],
    },
    {
      id: "security",
      heading: "8. เราดูแลความปลอดภัยอย่างไร",
      bullets: [
        "เข้ารหัสระหว่างรับส่งข้อมูล และเข้ารหัสข้อมูลลับกับข้อมูลยืนยันตัวตนที่จัดเก็บไว้",
        "จำกัดสิทธิ์เข้าถึงข้อมูลบน production เฉพาะผู้ที่จำเป็น และบันทึกการเข้าถึงไว้",
        "รหัสผ่านจัดการโดย identity provider โดยเฉพาะ ตัวแอปไม่เก็บรหัสผ่านเลย",
        "จำกัดจำนวนคำขอ และเพิกถอนเซสชันเมื่อออกจากระบบ",
        "ไม่มีระบบใดปลอดภัยสมบูรณ์ หากเกิดเหตุละเมิดที่กระทบข้อมูลส่วนบุคคลของคุณ เราจะแจ้งองค์กรที่ได้รับผลกระทบและหน่วยงานกำกับตามที่กฎหมายกำหนด",
      ],
    },
    {
      id: "transfers",
      heading: "9. การโอนข้อมูลไปต่างประเทศ",
      paragraphs: [
        "ข้อมูลอาจถูกประมวลผลนอกประเทศไทยโดยผู้ให้บริการโครงสร้างพื้นฐานของเรา กรณีเช่นนั้นเราอาศัยมาตรการคุ้มครองตามที่ PDPA และ GDPR กำหนด เช่น ข้อสัญญามาตรฐาน และการประเมินว่าปลายทางคุ้มครองเทียบเท่า",
      ],
    },
    {
      id: "children",
      heading: "10. เด็กและเยาวชน",
      paragraphs: [
        "CARMEN BLUE เป็นเครื่องมือสำหรับการทำงาน ไม่ได้มุ่งให้เด็กใช้ และเราไม่สร้างบัญชีให้ผู้ที่อายุต่ำกว่าเกณฑ์การจ้างงานขั้นต่ำของประเทศนั้นโดยรู้เห็น",
      ],
    },
    {
      id: "changes",
      heading: "11. การแก้ไขนโยบาย",
      paragraphs: [
        "เราแก้ไขนโยบายนี้ได้ วันที่มีผลด้านบนคือฉบับปัจจุบันเสมอ และหากมีการเปลี่ยนแปลงสาระสำคัญ เราจะแจ้งผู้ดูแลระบบขององค์กรก่อนมีผล",
      ],
    },
    {
      id: "contact",
      heading: "12. ติดต่อเรา",
      paragraphs: [
        `เรื่องความเป็นส่วนตัวและการใช้สิทธิของเจ้าของข้อมูล: ${LEGAL_ENTITY.privacyEmail} เรื่องการใช้งานทั่วไป: ${LEGAL_ENTITY.supportEmail}`,
      ],
    },
  ],
};

export const PRIVACY_DOCUMENT: Record<LegalLocale, LegalDocument> = { en, th };
