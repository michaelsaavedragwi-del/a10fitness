import { auth } from "@/auth";
import { SidebarNav } from "./SidebarNav";
import { SignOutButton } from "./SignOutButton";

export async function Sidebar() {
  const session = await auth();
  if (!session?.user) return null;
  const isOwner = session.user.role === "owner";

  return (
    <div className="sidebar no-print">
      <span className="sidebar-brand">Velocity Lab</span>
      <SidebarNav isOwner={isOwner} />
      <div className="sidebar-user">
        <span>
          {session.user.name} · {session.user.role}
        </span>
        <SignOutButton />
      </div>
    </div>
  );
}
