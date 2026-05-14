/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    // Force these classes to always be generated
    'bg-slate-50', 'text-slate-900', 'bg-white', 'rounded-lg',
    'shadow-sm', 'border', 'border-slate-200', 'p-6', 'p-4', 'p-5',
    'text-sm', 'text-xs', 'text-lg', 'text-xl', 'text-2xl', 'font-bold',
    'font-semibold', 'font-medium', 'text-blue-600', 'text-blue-700',
    'bg-blue-50', 'bg-blue-100', 'bg-blue-500', 'bg-violet-500',
    'bg-emerald-50', 'bg-amber-50', 'text-emerald-700', 'text-amber-700',
    'text-slate-500', 'text-slate-600', 'text-slate-700', 'text-slate-900',
    'grid', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'gap-4', 'gap-6',
    'flex', 'items-center', 'justify-between', 'space-y-6', 'space-y-4',
    'max-w-7xl', 'mx-auto', 'px-4', 'py-6', 'py-8', 'sticky', 'top-0', 'z-10',
    'hover:shadow-md', 'transition-shadow', 'transition-colors',
    'line-clamp-2', 'truncate', 'overflow-x-auto',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}