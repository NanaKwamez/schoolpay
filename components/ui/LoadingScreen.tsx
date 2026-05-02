import { SCHOOL_NAME } from '@/lib/constants'

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-morning-green-600 flex flex-col items-center justify-center gap-4">
      <div className="bg-white rounded-2xl p-6 shadow-xl text-center">
        <div className="text-morning-green-600 font-bold text-2xl mb-1">SchoolPay</div>
        <div className="text-gray-500 text-sm">{SCHOOL_NAME}</div>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="h-2 w-2 bg-white rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  )
}
