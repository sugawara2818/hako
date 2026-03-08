export const PRESET_GRADIENTS: Record<string, string> = {
  purple: 'from-purple-500 to-pink-500',
  blue: 'from-blue-500 to-cyan-500',
  emerald: 'from-emerald-500 to-teal-500',
  orange: 'from-orange-500 to-yellow-500',
  red: 'from-red-600 to-orange-500',
  indigo: 'from-indigo-500 to-purple-500',
  black: 'from-gray-700 to-gray-900',
}

export function getHakoGradient(colorId: string | null) {
  return PRESET_GRADIENTS[colorId || 'purple'] || PRESET_GRADIENTS.purple
}
