export function getDisplayName(name: string): string {
  const map: Record<string, string> = {
    karol: "King Karol 👑",
    anastasiya: "NXtasiya",
  };

  return map[name.trim().toLowerCase()] || name;
}