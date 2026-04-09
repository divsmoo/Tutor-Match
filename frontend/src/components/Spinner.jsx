export default function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5'
  return (
    <div className={`${s} animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600`} />
  )
}
