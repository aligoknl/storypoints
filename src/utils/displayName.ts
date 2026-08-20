export function getDisplayName(name: string): string {
  const map: Record<string, string> = {
    karol: "Karol the Great",
    zouhair: "ZouZou",
    alexander: "Alexander the Man",
  };

  return map[name.trim().toLowerCase()] || name;
}
