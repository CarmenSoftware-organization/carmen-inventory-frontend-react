import {
  LEGAL_ENTITY,
  type LegalDocument,
  type LegalLocale,
} from "./legal-content";

const EFFECTIVE = "2026-08-04";

const en: LegalDocument = {
  eyebrow: "Legal",
  title: "Terms of Service",
  effective: `Effective ${EFFECTIVE}`,
  intro: `These terms govern your use of CARMEN BLUE, the hospitality supply-chain platform operated by ${LEGAL_ENTITY.company}. Your employer — the hotel or hotel group that holds the subscription — decides what you can see and do inside it.`,
  tocLabel: "On this page",
  crossLink: "Read the Privacy Policy",
  sections: [
    {
      id: "acceptance",
      heading: "1. Accepting these terms",
      paragraphs: [
        "By signing in to CARMEN BLUE you accept these terms. If you are using an account created for you by your employer, you accept them on your own behalf and confirm you are authorised to use that account.",
        "If you do not accept these terms, do not sign in. Ask your manager to remove your access instead.",
      ],
    },
    {
      id: "service",
      heading: "2. What the service is",
      paragraphs: [
        "CARMEN BLUE handles the back-of-house supply chain for hotels: purchase requests, purchase orders, goods receipt, store requisitions, stock counts, vendor price lists and the reporting around them.",
        "It is a business tool sold to organisations, not a consumer product. Accounts are issued through a hotel or hotel group, and every record you create belongs to that organisation rather than to you personally.",
      ],
    },
    {
      id: "accounts",
      heading: "3. Your account",
      paragraphs: [
        "An account only becomes usable once an administrator at your organisation assigns it to a property. Until then you can sign in but you will not see any operational data.",
      ],
      bullets: [
        "Keep your password to yourself. Shared credentials make the audit trail meaningless, and every approval recorded under your name is treated as yours.",
        "Use your own account. Do not act inside someone else's session, and do not leave a signed-in session unattended on a shared terminal.",
        "Tell your administrator immediately if you think someone else has used your account.",
        "Your access rights follow your role at the property. They can be changed or withdrawn by your organisation at any time without notice from us.",
      ],
    },
    {
      id: "acceptable-use",
      heading: "4. Acceptable use",
      paragraphs: [
        "Use the platform for your organisation's legitimate operations, and nothing else.",
      ],
      bullets: [
        "Do not try to reach data belonging to a property you have not been assigned to.",
        "Do not probe, scan, or attempt to bypass authentication, rate limits or access controls.",
        "Do not extract data in bulk for use outside your organisation, or resell access.",
        "Do not upload malware, or content you have no right to share.",
        "Do not use the platform in a way that breaks the law or your organisation's own policies.",
      ],
    },
    {
      id: "your-data",
      heading: "5. Who owns the data",
      paragraphs: [
        "Operational records — requisitions, orders, receipts, counts, prices, attachments — belong to the organisation that entered them. We hold and process them on that organisation's behalf, under its instructions.",
        "That also means requests to correct or delete operational records go to your organisation first. We act on its instructions, not on individual requests to change a business record.",
        `How personal data is handled is set out separately in the Privacy Policy, and questions can go to ${LEGAL_ENTITY.privacyEmail}.`,
      ],
    },
    {
      id: "availability",
      heading: "6. Availability and changes",
      paragraphs: [
        "We aim to keep the service running continuously, but we do not promise uninterrupted availability. Maintenance, upgrades, third-party outages and incidents happen.",
        "The platform is developed continuously. Features change, move and are occasionally removed. Where a change materially affects how your organisation works, we give its administrators reasonable notice.",
      ],
    },
    {
      id: "ip",
      heading: "7. Intellectual property",
      paragraphs: [
        `The platform itself — software, interface, design and documentation — remains the property of ${LEGAL_ENTITY.company}. Access does not transfer any ownership in it.`,
        "Do not copy, decompile or reverse-engineer the platform except where that right cannot be excluded by law.",
      ],
    },
    {
      id: "liability",
      heading: "8. Limits of liability",
      paragraphs: [
        "The platform supports your decisions; it does not make them. Stock figures, prices and calculations depend on what has been entered and on the accuracy of connected systems. Check anything that matters before acting on it.",
        "To the extent permitted by law, we are not liable for indirect or consequential loss, lost profit, or loss caused by data that your organisation or its vendors entered incorrectly. Nothing here limits liability that cannot be limited under Thai law.",
      ],
    },
    {
      id: "suspension",
      heading: "9. Suspension and termination",
      paragraphs: [
        "Your organisation can withdraw your access at any time. We can suspend an account that threatens the security or integrity of the platform, or that is being used in breach of these terms.",
        "When a subscription ends, the organisation's data is handled under the terms of its agreement with us, which govern export and deletion timelines.",
      ],
    },
    {
      id: "law",
      heading: "10. Governing law",
      paragraphs: [
        "These terms are governed by the laws of Thailand, and the courts of Thailand have jurisdiction over any dispute arising from them.",
      ],
    },
    {
      id: "changes",
      heading: "11. Changes to these terms",
      paragraphs: [
        "We may update these terms. The effective date at the top of this page always reflects the current version, and material changes are notified to organisation administrators before they take effect. Continuing to use the platform after that date means you accept the updated terms.",
      ],
    },
    {
      id: "contact",
      heading: "12. Contact",
      paragraphs: [
        `Questions about these terms: ${LEGAL_ENTITY.supportEmail}. Questions about personal data: ${LEGAL_ENTITY.privacyEmail}. For anything about your own access rights, your organisation's administrator is the faster route.`,
      ],
    },
  ],
};

const th: LegalDocument = {
  eyebrow: "ข้อกำหนด",
  title: "ข้อตกลงการใช้บริการ",
  effective: `มีผลตั้งแต่ ${EFFECTIVE}`,
  intro: `ข้อตกลงนี้ใช้กับการใช้งาน CARMEN BLUE ระบบจัดการซัพพลายเชนสำหรับโรงแรม ให้บริการโดย ${LEGAL_ENTITY.company} โดยโรงแรมหรือกลุ่มโรงแรมที่เป็นผู้ซื้อบริการ เป็นผู้กำหนดว่าคุณเห็นอะไรและทำอะไรได้บ้างในระบบ`,
  tocLabel: "หัวข้อในหน้านี้",
  crossLink: "อ่านนโยบายความเป็นส่วนตัว",
  sections: [
    {
      id: "acceptance",
      heading: "1. การยอมรับข้อตกลง",
      paragraphs: [
        "การเข้าสู่ระบบ CARMEN BLUE ถือว่าคุณยอมรับข้อตกลงนี้ หากใช้บัญชีที่ที่ทำงานสร้างให้ ถือว่าคุณยอมรับในนามตัวเองและยืนยันว่าได้รับอนุญาตให้ใช้บัญชีนั้นจริง",
        "ถ้าไม่ยอมรับข้อตกลงนี้ กรุณาอย่าเข้าสู่ระบบ และแจ้งหัวหน้างานให้ยกเลิกสิทธิ์ของคุณแทน",
      ],
    },
    {
      id: "service",
      heading: "2. บริการนี้คืออะไร",
      paragraphs: [
        "CARMEN BLUE ดูแลงานหลังบ้านของโรงแรม ตั้งแต่ใบขอซื้อ ใบสั่งซื้อ การรับสินค้า ใบเบิกของ การนับสต็อก ราคาจากผู้ขาย ไปจนถึงรายงานที่เกี่ยวข้อง",
        "เป็นเครื่องมือสำหรับองค์กร ไม่ใช่บริการสำหรับผู้บริโภคทั่วไป บัญชีทุกบัญชีออกผ่านโรงแรมหรือกลุ่มโรงแรม และข้อมูลทุกรายการที่คุณสร้างเป็นขององค์กรนั้น ไม่ใช่ของคุณเป็นการส่วนตัว",
      ],
    },
    {
      id: "accounts",
      heading: "3. บัญชีของคุณ",
      paragraphs: [
        "บัญชีจะใช้งานได้จริงก็ต่อเมื่อผู้ดูแลระบบขององค์กรเพิ่มคุณเข้าโรงแรมแล้ว ก่อนหน้านั้นคุณเข้าสู่ระบบได้แต่จะยังไม่เห็นข้อมูลการดำเนินงานใดๆ",
      ],
      bullets: [
        "อย่าบอกรหัสผ่านให้ใคร การใช้รหัสร่วมกันทำให้ประวัติการแก้ไขไม่มีความหมาย และทุกการอนุมัติที่บันทึกในชื่อคุณถือว่าเป็นของคุณ",
        "ใช้บัญชีของตัวเอง อย่าทำงานบนหน้าจอที่คนอื่นล็อกอินค้างไว้ และอย่าปล่อยเครื่องที่ล็อกอินอยู่ทิ้งไว้ในพื้นที่ส่วนกลาง",
        "ถ้าสงสัยว่ามีคนอื่นเข้าใช้บัญชีคุณ แจ้งผู้ดูแลระบบทันที",
        "สิทธิ์การเข้าถึงเป็นไปตามตำแหน่งงานของคุณที่โรงแรมนั้น องค์กรของคุณเปลี่ยนหรือยกเลิกได้ตลอดเวลาโดยเราไม่ต้องแจ้งล่วงหน้า",
      ],
    },
    {
      id: "acceptable-use",
      heading: "4. การใช้งานที่ยอมรับได้",
      paragraphs: [
        "ใช้ระบบเพื่องานขององค์กรคุณตามปกติเท่านั้น",
      ],
      bullets: [
        "อย่าพยายามเข้าถึงข้อมูลของโรงแรมที่คุณไม่ได้รับสิทธิ์",
        "อย่าทดสอบเจาะระบบ สแกน หรือหาทางข้ามการยืนยันตัวตน ข้อจำกัดจำนวนคำขอ หรือการควบคุมสิทธิ์",
        "อย่าดึงข้อมูลจำนวนมากออกไปใช้นอกองค์กร และอย่าขายต่อสิทธิ์การเข้าใช้",
        "อย่าอัปโหลดมัลแวร์ หรือไฟล์ที่คุณไม่มีสิทธิ์เผยแพร่",
        "อย่าใช้ระบบในทางที่ผิดกฎหมายหรือผิดระเบียบขององค์กรคุณเอง",
      ],
    },
    {
      id: "your-data",
      heading: "5. ข้อมูลเป็นของใคร",
      paragraphs: [
        "ข้อมูลการดำเนินงาน ทั้งใบเบิก ใบสั่งซื้อ การรับของ การนับสต็อก ราคา และไฟล์แนบ เป็นขององค์กรที่บันทึกข้อมูลนั้น เราเก็บและประมวลผลแทนองค์กรตามคำสั่งขององค์กรเท่านั้น",
        "แปลว่าคำขอแก้ไขหรือลบข้อมูลการดำเนินงานต้องผ่านองค์กรของคุณก่อน เราทำตามคำสั่งขององค์กร ไม่ได้รับคำขอแก้เอกสารทางธุรกิจจากบุคคลโดยตรง",
        `ส่วนข้อมูลส่วนบุคคลดูรายละเอียดในนโยบายความเป็นส่วนตัว หรือสอบถามได้ที่ ${LEGAL_ENTITY.privacyEmail}`,
      ],
    },
    {
      id: "availability",
      heading: "6. ความพร้อมใช้งานและการเปลี่ยนแปลง",
      paragraphs: [
        "เราตั้งใจให้ระบบใช้งานได้ต่อเนื่อง แต่ไม่รับประกันว่าจะไม่มีการหยุดชะงัก ทั้งการปิดปรับปรุง การอัปเกรด ปัญหาของผู้ให้บริการภายนอก และเหตุขัดข้องต่างๆ เกิดขึ้นได้",
        "ระบบมีการพัฒนาต่อเนื่อง ฟีเจอร์เปลี่ยน ย้ายที่ และบางครั้งถูกยกเลิก หากการเปลี่ยนแปลงกระทบวิธีทำงานขององค์กรอย่างมีนัยสำคัญ เราจะแจ้งผู้ดูแลระบบล่วงหน้าตามสมควร",
      ],
    },
    {
      id: "ip",
      heading: "7. ทรัพย์สินทางปัญญา",
      paragraphs: [
        `ตัวระบบ ทั้งซอฟต์แวร์ หน้าจอ งานออกแบบ และคู่มือ ยังเป็นทรัพย์สินของ ${LEGAL_ENTITY.company} การได้สิทธิ์เข้าใช้ไม่ได้ทำให้ความเป็นเจ้าของโอนไปด้วย`,
        "ห้ามคัดลอก ถอดรหัส หรือทำวิศวกรรมย้อนกลับ เว้นแต่เป็นสิทธิ์ที่กฎหมายกำหนดให้ยกเว้นไม่ได้",
      ],
    },
    {
      id: "liability",
      heading: "8. ข้อจำกัดความรับผิด",
      paragraphs: [
        "ระบบช่วยประกอบการตัดสินใจ แต่ไม่ได้ตัดสินใจแทนคุณ ตัวเลขสต็อก ราคา และผลคำนวณ ขึ้นอยู่กับข้อมูลที่มีคนบันทึกเข้ามาและความถูกต้องของระบบที่เชื่อมต่ออยู่ เรื่องที่มีผลจริงจังควรตรวจสอบก่อนใช้ทุกครั้ง",
        "เท่าที่กฎหมายอนุญาต เราไม่รับผิดต่อความเสียหายทางอ้อมหรือสืบเนื่อง กำไรที่สูญเสีย หรือความเสียหายที่เกิดจากข้อมูลที่องค์กรของคุณหรือผู้ขายบันทึกผิด ทั้งนี้ไม่มีข้อความใดในเอกสารนี้จำกัดความรับผิดที่กฎหมายไทยกำหนดว่าจำกัดไม่ได้",
      ],
    },
    {
      id: "suspension",
      heading: "9. การระงับและยกเลิกบัญชี",
      paragraphs: [
        "องค์กรของคุณยกเลิกสิทธิ์ของคุณได้ทุกเมื่อ ส่วนเราระงับบัญชีได้หากบัญชีนั้นเป็นภัยต่อความปลอดภัยหรือความถูกต้องของระบบ หรือถูกใช้ผิดข้อตกลงนี้",
        "เมื่อสัญญาใช้บริการสิ้นสุด ข้อมูลขององค์กรจะจัดการตามสัญญาที่องค์กรทำไว้กับเรา ซึ่งกำหนดกรอบเวลาการส่งออกและการลบข้อมูลไว้แล้ว",
      ],
    },
    {
      id: "law",
      heading: "10. กฎหมายที่ใช้บังคับ",
      paragraphs: [
        "ข้อตกลงนี้อยู่ภายใต้กฎหมายไทย และให้ศาลไทยมีเขตอำนาจพิจารณาข้อพิพาทที่เกิดจากข้อตกลงนี้",
      ],
    },
    {
      id: "changes",
      heading: "11. การแก้ไขข้อตกลง",
      paragraphs: [
        "เราแก้ไขข้อตกลงนี้ได้ วันที่มีผลด้านบนของหน้าคือฉบับปัจจุบันเสมอ และหากมีการเปลี่ยนแปลงสาระสำคัญ เราจะแจ้งผู้ดูแลระบบขององค์กรก่อนมีผล การใช้งานต่อหลังวันที่ดังกล่าวถือว่าคุณยอมรับฉบับที่แก้ไขแล้ว",
      ],
    },
    {
      id: "contact",
      heading: "12. ติดต่อเรา",
      paragraphs: [
        `เรื่องข้อตกลงการใช้บริการ: ${LEGAL_ENTITY.supportEmail} เรื่องข้อมูลส่วนบุคคล: ${LEGAL_ENTITY.privacyEmail} ส่วนเรื่องสิทธิ์การเข้าใช้ของคุณเอง ถามผู้ดูแลระบบขององค์กรจะเร็วกว่า`,
      ],
    },
  ],
};

export const TERMS_DOCUMENT: Record<LegalLocale, LegalDocument> = { en, th };
