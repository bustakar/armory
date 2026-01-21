import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTimeRemaining(endTime: number): string {
  const now = Date.now();
  const diff = endTime - now;

  if (diff <= 0) return "Complete!";

  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));

  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  return `${hours}h`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getHpColor(hp: number, maxHp: number): string {
  const percentage = (hp / maxHp) * 100;
  if (percentage > 60) return "bg-green-500";
  if (percentage > 30) return "bg-yellow-500";
  return "bg-red-500";
}

export function getHpTextColor(hp: number, maxHp: number): string {
  const percentage = (hp / maxHp) * 100;
  if (percentage > 60) return "text-green-400";
  if (percentage > 30) return "text-yellow-400";
  return "text-red-400";
}
