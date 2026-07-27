interface NameWithSubtextProps {
  primary: string;
  secondary?: string;
}

export function NameWithSubtext({ primary, secondary }: NameWithSubtextProps) {
  return (
    <div className="group w-full text-left">
      {/* title = ข้อความเต็ม — บรรทัดนี้ truncate ได้ที่ font scale ใหญ่ๆ และไม่มี
          ทางอื่นให้ผู้ใช้อ่านค่าที่ถูกตัดทิ้ง */}
      <p className="truncate font-semibold" title={primary}>
        {primary}
      </p>
      {secondary && (
        <p
          className="text-muted-foreground truncate text-micro-legal"
          title={secondary}
        >
          {secondary}
        </p>
      )}
    </div>
  );
}
