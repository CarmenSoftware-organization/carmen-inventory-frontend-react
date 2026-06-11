import { useNavigation } from "react-router";

/** แถบ loading บนสุดระหว่างเปลี่ยนหน้า — แทน nextjs-toploader */
export function TopLoader() {
  const navigation = useNavigation();
  const active = navigation.state !== "idle";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-[3px]"
    >
      <div
        className="h-full bg-primary transition-[width,opacity] ease-out"
        style={{
          width: active ? "80%" : "100%",
          opacity: active ? 1 : 0,
          transitionDuration: active ? "8s" : "300ms",
        }}
      />
    </div>
  );
}
