import type { ReactNode } from "react";

export function ResourceViewerShell({
  courseNav,
  footerAction,
  children,
}: {
  courseNav?: ReactNode;
  footerAction?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="sticky top-16 z-20 flex items-center justify-end gap-2 border-b bg-background/95 py-3 backdrop-blur">
        {courseNav}
      </div>
      <div className="mt-6">{children}</div>
      {footerAction && (
        <div className="mt-8 flex justify-end border-t pt-6">{footerAction}</div>
      )}
    </div>
  );
}
