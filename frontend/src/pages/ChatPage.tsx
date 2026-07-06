import { useState } from "react";
import { Users } from "lucide-react";
import { BaseSearchBar } from "../components/BaseSearchBar";
import { useAppState } from "../state";

export function ChatPage() {
  const { groupChats, openGroup } = useAppState();
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [debouncedGroupSearchQuery, setDebouncedGroupSearchQuery] =
    useState("");
  const activeGroupSearchQuery = debouncedGroupSearchQuery.toLowerCase();
  const filteredGroupChats = activeGroupSearchQuery
    ? groupChats.filter((chat) =>
        [
          chat.name,
          chat.lastMessage,
          chat.time,
          `${chat.members} members`,
        ]
          .join(" ")
          .toLowerCase()
          .includes(activeGroupSearchQuery),
      )
    : groupChats;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-foreground">Groups</h1>
      </div>

      <div className="px-4 mb-3">
        <BaseSearchBar
          value={groupSearchQuery}
          onValueChange={setGroupSearchQuery}
          onDebouncedQueryChange={setDebouncedGroupSearchQuery}
          placeholder="Search groups"
          ariaLabel="Search groups"
          iconSize={17}
        />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-minimal px-4">
        {groupChats.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <p className="max-w-[240px] text-sm leading-relaxed text-muted-foreground">
              Join an activity to start a group chat.
            </p>
          </div>
        )}
        {groupChats.length > 0 && filteredGroupChats.length === 0 && (
          <div className="flex h-full items-center justify-center text-center">
            <p className="max-w-[240px] text-sm leading-relaxed text-muted-foreground">
              No groups match your search.
            </p>
          </div>
        )}
        {filteredGroupChats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => openGroup(chat.id)}
            className="w-full flex items-center gap-3 py-3 border-b border-border last:border-0 cursor-pointer text-left active:bg-secondary/40 transition-colors"
            aria-label={`Open ${chat.name}`}
          >
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-secondary">
                <img
                  src={chat.avatar}
                  alt={chat.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-card border border-border flex items-center justify-center">
                <Users size={8} className="text-muted-foreground" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-foreground truncate pr-2">
                  {chat.name}
                </p>
                {chat.time && (
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {chat.time}
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  {chat.members} members
                </span>
                {chat.lastMessage && (
                  <>
                    <span className="text-muted-foreground opacity-40">/</span>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {chat.lastMessage}
                    </p>
                  </>
                )}
              </div>
            </div>
          </button>
        ))}
        <div className="h-4" />
      </div>
    </div>
  );
}
