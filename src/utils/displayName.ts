export function getDisplayName(name: string): string {
  const map: Record<string, string> = {
    karol: "King Karol 👑",
  };

  return map[name.trim().toLowerCase()] || name;
}