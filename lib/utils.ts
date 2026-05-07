/**
 * Utility function for className composition
 * Commonly used with Tailwind CSS and class-variance-authority
 */

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes
    .filter((cls): cls is string => Boolean(cls))
    .join(' ')
}
