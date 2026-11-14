"use client";

import { useAppAccess } from "./AppAccessProvider";
import GuestSearchDialog from "./GuestSearchDialog";
import MemberSearchDialog from "./MemberSearchDialog";

export default function SearchDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAppAccess();
  return user ? <MemberSearchDialog onClose={onClose} /> : <GuestSearchDialog onClose={onClose} />;
}
