import { notFound } from "next/navigation";
import { findDiscussionGroup, discussionGroups } from "@/lib/hoidap";
import Discussion from "../Discussion";

export function generateStaticParams() {
  return discussionGroups.map(group => ({ group: group.slug }));
}

export default function GroupDiscussionPage({ params }: { params: { group: string } }) {
  const group = findDiscussionGroup(params.group);
  if (!group) notFound();
  return <Discussion group={group} />;
}
